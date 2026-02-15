import type { CompanyData } from '../data/types.js';

/**
 * Comparable Company Analysis (Comps)
 * 可比公司分析
 */

export interface PeerCompany {
  symbol: string;
  name: string;
  marketCap: number;
  enterpriseValue: number;
  revenue: number;
  ebitda: number;
  netIncome: number;
}

export interface CompsResult {
  target: {
    symbol: string;
    revenue: number;
    ebitda: number;
    netIncome: number;
    marketCap: number;
    enterpriseValue: number;
  };
  peers: PeerCompany[];
  multiples: {
    evRevenue: { low: number; median: number; high: number; mean: number };
    evEbitda: { low: number; median: number; high: number; mean: number };
    pe: { low: number; median: number; high: number; mean: number };
  };
  valuation: {
    evRevenue: { low: number; base: number; high: number };
    evEbitda: { low: number; base: number; high: number };
    pe: { low: number; base: number; high: number };
  };
  impliedSharePrice: {
    evRevenue: { low: number; base: number; high: number };
    evEbitda: { low: number; base: number; high: number };
    pe: { low: number; base: number; high: number };
  };
}

export class CompsModel {
  private data: CompanyData;
  private peers: PeerCompany[];

  constructor(data: CompanyData) {
    this.data = data;
    this.peers = this.generatePeers();
  }

  analyze(): CompsResult {
    const target = this.getTargetMetrics();
    const multiples = this.calculateMultiples();
    const valuation = this.calculateValuation(multiples);
    const impliedSharePrice = this.calculateImpliedSharePrice(valuation);

    return {
      target,
      peers: this.peers,
      multiples,
      valuation,
      impliedSharePrice,
    };
  }

  private generatePeers(): PeerCompany[] {
    // 模拟生成同行业可比公司数据
    const baseRevenue = this.data.incomeStatements[this.data.incomeStatements.length - 1].revenue;
    const baseEBITDA = baseRevenue * 0.25;
    const peerNames = ['Peer A', 'Peer B', 'Peer C', 'Peer D', 'Peer E', 'Peer F', 'Peer G', 'Peer H'];

    return peerNames.map((name, i) => {
      const variance = 0.5 + Math.random(); // 0.5x to 1.5x variance
      const revenue = baseRevenue * variance * (0.3 + Math.random() * 1.5);
      const ebitda = revenue * (0.15 + Math.random() * 0.2);
      const netIncome = ebitda * (0.5 + Math.random() * 0.3);
      const ev = ebitda * (8 + Math.random() * 8);
      const marketCap = ev * (0.8 + Math.random() * 0.3);

      return {
        symbol: `PEER${i + 1}`,
        name,
        marketCap,
        enterpriseValue: ev,
        revenue,
        ebitda,
        netIncome,
      };
    });
  }

  private getTargetMetrics() {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];

    return {
      symbol: this.data.profile.symbol,
      revenue: lastIncome.revenue,
      ebitda: lastIncome.ebitda,
      netIncome: lastIncome.netIncome,
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
    const allCompanies = [...this.peers, {
      symbol: this.data.profile.symbol,
      name: this.data.profile.name,
      marketCap: this.getTargetMetrics().marketCap,
      enterpriseValue: this.getTargetMetrics().enterpriseValue,
      revenue: this.getTargetMetrics().revenue,
      ebitda: this.getTargetMetrics().ebitda,
      netIncome: this.getTargetMetrics().netIncome,
    }];

    const evRevenueMultiples = allCompanies.map(c => c.enterpriseValue / c.revenue).filter(m => m > 0 && m < 50);
    const evEbitdaMultiples = allCompanies.map(c => c.enterpriseValue / c.ebitda).filter(m => m > 0 && m < 50);
    const peMultiples = allCompanies.map(c => c.marketCap / c.netIncome).filter(m => m > 0 && m < 100);

    const stats = (values: number[]) => ({
      low: this.calculatePercentile(values, 25),
      median: this.calculatePercentile(values, 50),
      high: this.calculatePercentile(values, 75),
      mean: values.reduce((a, b) => a + b, 0) / values.length,
    });

    return {
      evRevenue: stats(evRevenueMultiples),
      evEbitda: stats(evEbitdaMultiples),
      pe: stats(peMultiples),
    };
  }

  private calculateValuation(multiples: CompsResult['multiples']) {
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
      pe: {
        low: target.netIncome * multiples.pe.low,
        base: target.netIncome * multiples.pe.median,
        high: target.netIncome * multiples.pe.high,
      },
    };
  }

  private calculateImpliedSharePrice(valuation: CompsResult['valuation']): CompsResult['impliedSharePrice'] {
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
      pe: {
        low: valuation.pe.low / sharesOutstanding,
        base: valuation.pe.base / sharesOutstanding,
        high: valuation.pe.high / sharesOutstanding,
      },
    };
  }
}
