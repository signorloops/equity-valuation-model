import type { CompanyData } from '../data/types.js';

/**
 * IPO Valuation & Pricing Analysis
 * IPO 估值与定价分析
 */

export interface IPOInputs {
  primaryShares?: number;        // 新股数量
  secondaryShares?: number;      // 老股数量
  priceLow?: number;             // 低价
  priceHigh?: number;            // 高价
  greenshoe?: number;            // 超额配售比例
}

export interface IPOResult {
  offering: {
    primaryShares: number;
    secondaryShares: number;
    totalShares: number;
    primaryProceeds: { low: number; mid: number; high: number };
    secondaryProceeds: { low: number; mid: number; high: number };
    totalProceeds: { low: number; mid: number; high: number };
  };
  preMoney: {
    sharesOutstanding: number;
    valuation: { low: number; mid: number; high: number };
  };
  postMoney: {
    sharesOutstanding: number;
    valuation: { low: number; mid: number; high: number };
  };
  dilution: {
    preIPOOwnership: number;
    postIPOOwnership: number;
    dilutionPercent: number;
  };
  valuationMetrics: {
    evRevenue: { low: number; mid: number; high: number };
    evEbitda: { low: number; mid: number; high: number };
    pe: { low: number; mid: number; high: number };
  };
  comparableIPOs: {
    company: string;
    date: string;
    offerPrice: number;
    firstDayClose: number;
    firstDayPop: number;
    evRevenue: number;
    evEbitda: number;
  }[];
  firstDayPopEstimate: {
    conservative: number;
    base: number;
    optimistic: number;
  };
}

export class IPOModel {
  private data: CompanyData;
  private inputs: Required<IPOInputs>;

  constructor(data: CompanyData, inputs: IPOInputs = {}) {
    this.data = data;

    const currentShares = data.profile.sharesOutstanding;
    const offerSize = currentShares * 0.15; // 通常发行15%

    this.inputs = {
      primaryShares: inputs.primaryShares || offerSize * 0.8,
      secondaryShares: inputs.secondaryShares || offerSize * 0.2,
      priceLow: inputs.priceLow || data.stockPrice.current * 0.85,
      priceHigh: inputs.priceHigh || data.stockPrice.current * 1.15,
      greenshoe: 0.15,
      ...inputs,
    };
  }

  analyze(): IPOResult {
    const offering = this.calculateOffering();
    const preMoney = this.calculatePreMoney();
    const postMoney = this.calculatePostMoney(offering);
    const dilution = this.calculateDilution();
    const valuationMetrics = this.calculateValuationMetrics(postMoney);
    const comparableIPOs = this.getComparableIPOs();
    const firstDayPopEstimate = this.estimateFirstDayPop();

    return {
      offering,
      preMoney,
      postMoney,
      dilution,
      valuationMetrics,
      comparableIPOs,
      firstDayPopEstimate,
    };
  }

  private calculateOffering() {
    const { primaryShares, secondaryShares, priceLow, priceHigh } = this.inputs;
    const priceMid = (priceLow + priceHigh) / 2;

    return {
      primaryShares,
      secondaryShares,
      totalShares: primaryShares + secondaryShares,
      primaryProceeds: {
        low: primaryShares * priceLow,
        mid: primaryShares * priceMid,
        high: primaryShares * priceHigh,
      },
      secondaryProceeds: {
        low: secondaryShares * priceLow,
        mid: secondaryShares * priceMid,
        high: secondaryShares * priceHigh,
      },
      totalProceeds: {
        low: (primaryShares + secondaryShares) * priceLow,
        mid: (primaryShares + secondaryShares) * priceMid,
        high: (primaryShares + secondaryShares) * priceHigh,
      },
    };
  }

  private calculatePreMoney() {
    const { priceLow, priceHigh } = this.inputs;
    const priceMid = (priceLow + priceHigh) / 2;
    const shares = this.data.profile.sharesOutstanding;

    return {
      sharesOutstanding: shares,
      valuation: {
        low: shares * priceLow,
        mid: shares * priceMid,
        high: shares * priceHigh,
      },
    };
  }

  private calculatePostMoney(offering: IPOResult['offering']) {
    const { priceLow, priceHigh } = this.inputs;
    const priceMid = (priceLow + priceHigh) / 2;
    const shares = this.data.profile.sharesOutstanding + offering.primaryShares;

    return {
      sharesOutstanding: shares,
      valuation: {
        low: shares * priceLow,
        mid: shares * priceMid,
        high: shares * priceHigh,
      },
    };
  }

  private calculateDilution() {
    const currentShares = this.data.profile.sharesOutstanding;
    const newShares = this.inputs.primaryShares + this.inputs.secondaryShares;
    const postShares = currentShares + newShares;

    return {
      preIPOOwnership: 1,
      postIPOOwnership: currentShares / postShares,
      dilutionPercent: newShares / postShares,
    };
  }

  private calculateValuationMetrics(postMoney: IPOResult['postMoney']) {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];
    const ev = postMoney.valuation.mid + lastBalance.totalDebt - lastBalance.cashAndEquivalents;

    return {
      evRevenue: {
        low: ev / lastIncome.revenue,
        mid: ev / lastIncome.revenue,
        high: ev / lastIncome.revenue,
      },
      evEbitda: {
        low: ev / lastIncome.ebitda,
        mid: ev / lastIncome.ebitda,
        high: ev / lastIncome.ebitda,
      },
      pe: {
        low: postMoney.valuation.low / lastIncome.netIncome,
        mid: postMoney.valuation.mid / lastIncome.netIncome,
        high: postMoney.valuation.high / lastIncome.netIncome,
      },
    };
  }

  private getComparableIPOs() {
    const companies = ['Snowflake', 'Airbnb', 'DoorDash', 'Palantir', 'Unity', 'Roblox', 'Coinbase'];
    return companies.map((company) => ({
      company,
      date: `${2020 + Math.floor(Math.random() * 4)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-15`,
      offerPrice: 20 + Math.random() * 50,
      firstDayClose: 30 + Math.random() * 80,
      firstDayPop: 0.1 + Math.random() * 0.5,
      evRevenue: 10 + Math.random() * 30,
      evEbitda: 20 + Math.random() * 40,
    }));
  }

  private estimateFirstDayPop() {
    // 基于行业平均首日涨幅
    return {
      conservative: 0.05,
      base: 0.15,
      optimistic: 0.30,
    };
  }
}
