import type { CompanyData } from '../data/types.js';

/**
 * LBO (Leveraged Buyout) 模型
 * 杠杆收购模型
 */

export interface LBOInputs {
  purchasePrice?: number;        // 收购价格（每股）
  premium?: number;              // 收购溢价 %
  debtRatio?: number;            // 债务比例
  equityRatio?: number;          // 股权比例
  interestRate?: number;         // 债务利率
  exitMultiple?: number;         // 退出EV/EBITDA倍数
  holdingPeriod?: number;        // 持有年限
  revenueGrowth?: number;        // 收入增长率
  ebitdaMargin?: number;         // EBITDA利润率
}

export interface LBOResult {
  // 交易结构
  entry: {
    purchasePrice: number;
    premium: number;
    enterpriseValue: number;
    equityValue: number;
    debtFinancing: number;
    equityContribution: number;
  };
  // 债务结构
  debt: {
    seniorDebt: number;
    mezzanineDebt: number;
    totalDebt: number;
    interestRate: number;
    annualInterest: number;
  };
  // 财务预测
  projections: {
    year: number;
    revenue: number;
    ebitda: number;
    ebit: number;
    interest: number;
    netIncome: number;
    freeCashFlow: number;
    debtRepayment: number;
    endingDebt: number;
  }[];
  // 退出分析
  exit: {
    exitYear: number;
    exitEBITDA: number;
    exitMultiple: number;
    exitEV: number;
    netDebt: number;
    equityValue: number;
  };
  // 回报指标
  returns: {
    irr: number;
    moic: number;  // Multiple on Invested Capital
    grossProfit: number;
  };
}

export class LBOModel {
  private data: CompanyData;
  private inputs: Required<LBOInputs>;

  constructor(data: CompanyData, inputs: LBOInputs = {}) {
    this.data = data;

    const currentPrice = data.stockPrice.current;
    const marketCap = data.profile.marketCap;
    const enterpriseValue = marketCap + this.getNetDebt();

    this.inputs = {
      purchasePrice: inputs.purchasePrice ?? currentPrice * 1.3,
      premium: inputs.premium ?? 0.30,
      debtRatio: inputs.debtRatio ?? 0.60,
      equityRatio: inputs.equityRatio ?? 0.40,
      interestRate: inputs.interestRate ?? 0.08,
      exitMultiple: inputs.exitMultiple ?? 10,
      holdingPeriod: inputs.holdingPeriod ?? 5,
      revenueGrowth: inputs.revenueGrowth ?? 0.08,
      ebitdaMargin: inputs.ebitdaMargin ?? 0.25,
    };
  }

  calculate(): LBOResult {
    const entry = this.calculateEntry();
    const debt = this.calculateDebtStructure(entry);
    const projections = this.calculateProjections(entry, debt);
    const exit = this.calculateExit(projections[projections.length - 1]);
    const returns = this.calculateReturns(entry, exit);

    return {
      entry,
      debt,
      projections,
      exit,
      returns,
    };
  }

  private getNetDebt(): number {
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];
    return lastBalance.totalDebt - lastBalance.cashAndEquivalents;
  }

  private calculateEntry() {
    const { purchasePrice, premium } = this.inputs;
    const sharesOutstanding = this.data.profile.sharesOutstanding;
    const equityValue = purchasePrice * sharesOutstanding;
    const enterpriseValue = equityValue + this.getNetDebt();

    return {
      purchasePrice,
      premium,
      enterpriseValue,
      equityValue,
      debtFinancing: enterpriseValue * this.inputs.debtRatio,
      equityContribution: enterpriseValue * this.inputs.equityRatio,
    };
  }

  private calculateDebtStructure(entry: LBOResult['entry']): LBOResult['debt'] {
    const seniorDebt = entry.debtFinancing * 0.7;
    const mezzanineDebt = entry.debtFinancing * 0.3;
    const totalDebt = seniorDebt + mezzanineDebt;
    const { interestRate } = this.inputs;

    return {
      seniorDebt,
      mezzanineDebt,
      totalDebt,
      interestRate,
      annualInterest: totalDebt * interestRate,
    };
  }

  private calculateProjections(
    entry: LBOResult['entry'],
    debt: LBOResult['debt']
  ): LBOResult['projections'] {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    let revenue = lastIncome.revenue;
    let endingDebt = debt.totalDebt;
    const projections = [];

    for (let year = 1; year <= this.inputs.holdingPeriod; year++) {
      revenue *= (1 + this.inputs.revenueGrowth);
      const ebitda = revenue * this.inputs.ebitdaMargin;
      const dAndA = revenue * 0.05;
      const ebit = ebitda - dAndA;
      const interest = endingDebt * this.inputs.interestRate;
      const netIncome = (ebit - interest) * (1 - 0.21);
      const capex = revenue * 0.05;
      const nwcChange = revenue * 0.02;
      const freeCashFlow = netIncome + dAndA - capex - nwcChange;

      // 债务偿还（现金清扫）
      const debtRepayment = Math.min(freeCashFlow, endingDebt);
      endingDebt -= debtRepayment;

      projections.push({
        year,
        revenue,
        ebitda,
        ebit,
        interest,
        netIncome,
        freeCashFlow,
        debtRepayment,
        endingDebt,
      });
    }

    return projections;
  }

  private calculateExit(finalProjection: LBOResult['projections'][0]): LBOResult['exit'] {
    const { exitMultiple, holdingPeriod } = this.inputs;
    const exitEBITDA = finalProjection.ebitda;
    const exitEV = exitEBITDA * exitMultiple;
    const netDebt = finalProjection.endingDebt;

    return {
      exitYear: holdingPeriod,
      exitEBITDA,
      exitMultiple,
      exitEV,
      netDebt,
      equityValue: exitEV - netDebt,
    };
  }

  private calculateReturns(
    entry: LBOResult['entry'],
    exit: LBOResult['exit']
  ): LBOResult['returns'] {
    const equityInvested = entry.equityContribution;
    const equityReturned = exit.equityValue;
    const moic = equityReturned / equityInvested;

    // 简化 IRR 计算（假设线性回报）
    const years = this.inputs.holdingPeriod;
    const irr = Math.pow(moic, 1 / years) - 1;

    return {
      irr,
      moic,
      grossProfit: equityReturned - equityInvested,
    };
  }
}
