import type { CompanyData } from '../data/types.js';

/**
 * M&A Accretion/Dilution Analysis
 * 并购增益/稀释分析
 */

export interface MAInputs {
  targetSymbol?: string;
  targetPrice?: number;
  premium?: number;
  cashPercent?: number;
  stockPercent?: number;
  debtPercent?: number;
  interestRate?: number;
  synergies?: {
    cost: number;
    revenue: number;
  };
}

export interface MAResult {
  deal: {
    targetPrice: number;
    premium: number;
    offerPrice: number;
    totalConsideration: number;
    cashComponent: number;
    stockComponent: number;
    debtComponent: number;
    sharesIssued: number;
  };
  proForma: {
    revenue: number;
    ebitda: number;
    ebit: number;
    interestExpense: number;
    netIncome: number;
    sharesOutstanding: number;
    eps: number;
  };
  acquirerStandalone: {
    netIncome: number;
    sharesOutstanding: number;
    eps: number;
  };
  accretionDilution: {
    epsImpact: number;
    percentChange: number;
    isAccretive: boolean;
  };
  synergies: {
    costSynergies: number;
    revenueSynergies: number;
    totalPretax: number;
    afterTax: number;
    epsAccretion: number;
  };
  creditMetrics: {
    preDebtEbitda: number;
    postDebtEbitda: number;
    leveragePre: number;
    leveragePost: number;
  };
  breakEven: {
    requiredSynergies: number;
    requiredPremium: number;
  };
}

export class MAModel {
  private acquirer: CompanyData;
  private target: CompanyData;
  private inputs: Required<MAInputs>;

  constructor(acquirer: CompanyData, target: CompanyData, inputs: MAInputs = {}) {
    this.acquirer = acquirer;
    this.target = target;

    const targetPrice = inputs.targetPrice || target.stockPrice.current;
    const totalConsideration = targetPrice * (1 + (inputs.premium || 0.30)) * target.profile.sharesOutstanding;

    this.inputs = {
      targetSymbol: target.profile.symbol,
      targetPrice,
      premium: inputs.premium || 0.30,
      cashPercent: inputs.cashPercent || 0.40,
      stockPercent: inputs.stockPercent || 0.40,
      debtPercent: inputs.debtPercent || 0.20,
      interestRate: inputs.interestRate || 0.06,
      synergies: {
        cost: inputs.synergies?.cost || totalConsideration * 0.02,
        revenue: inputs.synergies?.revenue || 0,
      },
    };
  }

  analyze(): MAResult {
    const deal = this.calculateDeal();
    const acquirerStandalone = this.getAcquirerStandalone();
    const proForma = this.calculateProForma(deal);
    const accretionDilution = this.calculateAccretionDilution(acquirerStandalone, proForma);
    const synergies = this.calculateSynergies(deal, acquirerStandalone);
    const creditMetrics = this.calculateCreditMetrics(deal);
    const breakEven = this.calculateBreakEven(deal, acquirerStandalone);

    return {
      deal,
      proForma,
      acquirerStandalone,
      accretionDilution,
      synergies,
      creditMetrics,
      breakEven,
    };
  }

  private calculateDeal(): MAResult['deal'] {
    const { targetPrice, premium } = this.inputs;
    const offerPrice = targetPrice * (1 + premium);
    const totalConsideration = offerPrice * this.target.profile.sharesOutstanding;

    const cashComponent = totalConsideration * this.inputs.cashPercent;
    const stockComponent = totalConsideration * this.inputs.stockPercent;
    const debtComponent = totalConsideration * this.inputs.debtPercent;

    // 计算需要发行的股票数量
    const acquirerPrice = this.acquirer.stockPrice.current;
    const sharesIssued = stockComponent / acquirerPrice;

    return {
      targetPrice,
      premium,
      offerPrice,
      totalConsideration,
      cashComponent,
      stockComponent,
      debtComponent,
      sharesIssued,
    };
  }

  private getAcquirerStandalone(): MAResult['acquirerStandalone'] {
    const lastIncome = this.acquirer.incomeStatements[this.acquirer.incomeStatements.length - 1];

    return {
      netIncome: lastIncome.netIncome,
      sharesOutstanding: this.acquirer.profile.sharesOutstanding,
      eps: lastIncome.netIncome / this.acquirer.profile.sharesOutstanding,
    };
  }

  private calculateProForma(deal: MAResult['deal']): MAResult['proForma'] {
    const acquirerIncome = this.acquirer.incomeStatements[this.acquirer.incomeStatements.length - 1];
    const targetIncome = this.target.incomeStatements[this.target.incomeStatements.length - 1];

    const revenue = acquirerIncome.revenue + targetIncome.revenue;
    const ebitda = acquirerIncome.ebitda + targetIncome.ebitda;
    const ebit = acquirerIncome.operatingIncome + targetIncome.operatingIncome;

    const additionalInterest = deal.debtComponent * this.inputs.interestRate;
    const interestExpense = (acquirerIncome.ebitda - acquirerIncome.operatingIncome) + additionalInterest;

    const preTaxIncome = ebit - interestExpense;
    const tax = preTaxIncome * 0.21;
    const netIncome = preTaxIncome - tax;

    const sharesOutstanding = this.acquirer.profile.sharesOutstanding + deal.sharesIssued;

    return {
      revenue,
      ebitda,
      ebit,
      interestExpense,
      netIncome,
      sharesOutstanding,
      eps: netIncome / sharesOutstanding,
    };
  }

  private calculateAccretionDilution(
    standalone: MAResult['acquirerStandalone'],
    proForma: MAResult['proForma']
  ): MAResult['accretionDilution'] {
    const epsImpact = proForma.eps - standalone.eps;
    const percentChange = epsImpact / standalone.eps;

    return {
      epsImpact,
      percentChange,
      isAccretive: epsImpact > 0,
    };
  }

  private calculateSynergies(
    deal: MAResult['deal'],
    standalone: MAResult['acquirerStandalone']
  ): MAResult['synergies'] {
    const { cost: costSynergies, revenue: revenueSynergies } = this.inputs.synergies;
    const totalPretax = costSynergies + revenueSynergies;
    const afterTax = totalPretax * (1 - 0.21);

    const proFormaShares = this.acquirer.profile.sharesOutstanding + deal.sharesIssued;
    const epsAccretion = afterTax / proFormaShares;

    return {
      costSynergies,
      revenueSynergies,
      totalPretax,
      afterTax,
      epsAccretion,
    };
  }

  private calculateCreditMetrics(deal: MAResult['deal']): MAResult['creditMetrics'] {
    const acquirerIncome = this.acquirer.incomeStatements[this.acquirer.incomeStatements.length - 1];
    const targetIncome = this.target.incomeStatements[this.target.incomeStatements.length - 1];

    const preDebtEbitda = acquirerIncome.ebitda;
    const postDebtEbitda = acquirerIncome.ebitda + targetIncome.ebitda;

    const acquirerDebt = this.acquirer.balanceSheets[this.acquirer.balanceSheets.length - 1].totalDebt;
    const leveragePre = acquirerDebt / preDebtEbitda;
    const leveragePost = (acquirerDebt + deal.debtComponent) / postDebtEbitda;

    return {
      preDebtEbitda,
      postDebtEbitda,
      leveragePre,
      leveragePost,
    };
  }

  private calculateBreakEven(
    deal: MAResult['deal'],
    standalone: MAResult['acquirerStandalone']
  ): MAResult['breakEven'] {
    const proFormaShares = this.acquirer.profile.sharesOutstanding + deal.sharesIssued;

    // 计算需要的协同效应使EPS不稀释
    const epsGap = standalone.eps - (this.calculateProForma(deal).eps);
    const requiredSynergies = epsGap > 0 ? epsGap * proFormaShares / (1 - 0.21) : 0;

    // 计算不稀释的最大溢价
    const targetIncome = this.target.incomeStatements[this.target.incomeStatements.length - 1].netIncome;
    const maxPremium = (standalone.eps * proFormaShares - (this.acquirer.incomeStatements[0].netIncome + targetIncome)) / targetIncome;

    return {
      requiredSynergies,
      requiredPremium: Math.max(0, maxPremium),
    };
  }
}
