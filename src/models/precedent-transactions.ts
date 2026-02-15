import type { CompanyData } from '../data/types.js';

/**
 * Precedent Transaction Analysis
 * 先例交易分析
 */

export interface Transaction {
  date: string;
  target: string;
  acquirer: string;
  targetIndustry: string;
  dealValue: number;
  targetRevenue: number;
  targetEBITDA: number;
  premium: number;
  strategic: boolean;
}

export interface PrecedentTransactionResult {
  transactions: Transaction[];
  target: {
    revenue: number;
    ebitda: number;
    marketCap: number;
    enterpriseValue: number;
  };
  multiples: {
    evRevenue: { low: number; median: number; high: number; mean: number };
    evEbitda: { low: number; median: number; high: number; mean: number };
  };
  premiums: {
    low: number;
    median: number;
    high: number;
    mean: number;
  };
  valuation: {
    evRevenue: { low: number; base: number; high: number };
    evEbitda: { low: number; base: number; high: number };
  };
  impliedSharePrice: {
    evRevenue: { low: number; base: number; high: number };
    evEbitda: { low: number; base: number; high: number };
  };
}

export class PrecedentTransactionModel {
  private data: CompanyData;
  private transactions: Transaction[];

  constructor(data: CompanyData) {
    this.data = data;
    this.transactions = this.generateTransactions();
  }

  analyze(): PrecedentTransactionResult {
    const target = this.getTargetMetrics();
    const multiples = this.calculateMultiples();
    const premiums = this.calculatePremiums();
    const valuation = this.calculateValuation(multiples);
    const impliedSharePrice = this.calculateImpliedSharePrice(valuation);

    return {
      transactions: this.transactions,
      target,
      multiples,
      premiums,
      valuation,
      impliedSharePrice,
    };
  }

  private generateTransactions(): Transaction[] {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const baseRevenue = lastIncome.revenue;
    const baseEBITDA = lastIncome.ebitda;

    const acquirers = ['Blackstone', 'KKR', 'Carlyle', 'Bain Capital', 'Warburg Pincus',
                       'Thoma Bravo', 'Vista Equity', 'Advent International', 'EQT', 'Silver Lake'];

    const targets = ['TechTarget', 'SoftwareCo', 'CloudSys', 'DataAnalytics', 'CyberSecurity',
                     'AITools', 'Fintech', 'HealthTech', 'EdTech', 'Ecommerce', 'SaaSPlatform',
                     'MobileApp', 'Gaming', 'SocialMedia', 'Marketplace'];

    return Array.from({ length: 15 }, (_, i) => {
      const isStrategic = Math.random() > 0.5;
      const variance = 0.5 + Math.random() * 1.5;
      const revenue = baseRevenue * variance * (0.2 + Math.random());
      const ebitda = revenue * (0.15 + Math.random() * 0.15);
      const multiple = isStrategic ? (10 + Math.random() * 8) : (8 + Math.random() * 6);
      const dealValue = ebitda * multiple;
      const premium = 0.15 + Math.random() * 0.35;

      return {
        date: `${2020 + Math.floor(Math.random() * 5)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
        target: targets[i],
        acquirer: acquirers[i % acquirers.length],
        targetIndustry: this.data.profile.industry,
        dealValue,
        targetRevenue: revenue,
        targetEBITDA: ebitda,
        premium,
        strategic: isStrategic,
      };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  private getTargetMetrics() {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];

    return {
      revenue: lastIncome.revenue,
      ebitda: lastIncome.ebitda,
      marketCap: this.data.profile.marketCap,
      enterpriseValue: this.data.profile.marketCap + lastBalance.totalDebt - lastBalance.cashAndEquivalents,
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / 100) * (sorted.length - 1));
    return sorted[index];
  }

  private calculateMultiples() {
    const evRevenue = this.transactions.map(t => t.dealValue / t.targetRevenue).filter(m => m > 0 && m < 30);
    const evEbitda = this.transactions.map(t => t.dealValue / t.targetEBITDA).filter(m => m > 0 && m < 50);

    const stats = (values: number[]) => ({
      low: this.calculatePercentile(values, 25),
      median: this.calculatePercentile(values, 50),
      high: this.calculatePercentile(values, 75),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
    });

    return {
      evRevenue: stats(evRevenue),
      evEbitda: stats(evEbitda),
    };
  }

  private calculatePremiums() {
    const premiums = this.transactions.map(t => t.premium);

    return {
      low: this.calculatePercentile(premiums, 25),
      median: this.calculatePercentile(premiums, 50),
      high: this.calculatePercentile(premiums, 75),
      mean: premiums.reduce((a, b) => a + b, 0) / premiums.length,
    };
  }

  private calculateValuation(multiples: PrecedentTransactionResult['multiples']) {
    const target = this.getTargetMetrics();

    return {
      evRevenue: {
        low: target.revenue * multiples.evRevenue.low,
        base: target.revenue * multiples.evRevenue.median,
        high: target.revenue * multiples.evRevenue.high,
      },
      evEbitda: {
        low: target.ebitda * multiples.evEbitda.low,
        base: target.ebitda * multiples.evEbitda.median,
        high: target.ebitda * multiples.evEbitda.high,
      },
    };
  }

  private calculateImpliedSharePrice(valuation: PrecedentTransactionResult['valuation']): PrecedentTransactionResult['impliedSharePrice'] {
    const sharesOutstanding = this.data.profile.sharesOutstanding;
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];
    const netDebt = lastBalance.totalDebt - lastBalance.cashAndEquivalents;

    const evToEquity = (ev: number) => (ev - netDebt) / sharesOutstanding;

    return {
      evRevenue: {
        low: evToEquity(valuation.evRevenue.low),
        base: evToEquity(valuation.evRevenue.base),
        high: evToEquity(valuation.evRevenue.high),
      },
      evEbitda: {
        low: evToEquity(valuation.evEbitda.low),
        base: evToEquity(valuation.evEbitda.base),
        high: evToEquity(valuation.evEbitda.high),
      },
    };
  }
}
