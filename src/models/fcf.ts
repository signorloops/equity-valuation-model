import type { CompanyData, FCFAnalysis } from '../data/types.js';

/**
 * 自由现金流（FCF）分析模型
 * Free Cash Flow Analysis
 */

export interface FCFModelInputs {
  projectionYears?: number;
  revenueGrowthRate?: number;
  targetFCFMargin?: number;
}

export class FCFModel {
  private data: CompanyData;
  private inputs: FCFModelInputs;

  constructor(data: CompanyData, inputs: FCFModelInputs = {}) {
    this.data = data;
    this.inputs = {
      projectionYears: 5,
      revenueGrowthRate: 0.08,
      targetFCFMargin: 0.20,
      ...inputs,
    };
  }

  analyze(): FCFAnalysis {
    const historical = this.calculateHistoricalFCF();
    const metrics = this.calculateMetrics(historical);
    const projections = this.projectFCF(historical, metrics);

    return {
      historical,
      metrics,
      projections,
    };
  }

  private calculateHistoricalFCF() {
    const { incomeStatements, cashFlowStatements } = this.data;
    const years = Math.min(incomeStatements.length, cashFlowStatements.length);

    return Array.from({ length: years }, (_, i) => {
      const income = incomeStatements[i];
      const cashflow = cashFlowStatements[i];
      const year = new Date(cashflow.date).getFullYear();

      const revenue = income.revenue;
      const netIncome = income.netIncome;
      const ocf = cashflow.operatingCashFlow;
      const capex = Math.abs(cashflow.capitalExpenditure);
      const fcf = ocf - capex;

      return {
        year: year.toString(),
        revenue,
        netIncome,
        operatingCashFlow: ocf,
        capex,
        fcf,
        fcfMargin: fcf / revenue,
        fcfConversion: fcf / netIncome,
      };
    }).reverse();
  }

  private calculateMetrics(historical: FCFAnalysis['historical']) {
    const fcfMargins = historical.map(h => h.fcfMargin);
    const conversions = historical.map(h => h.fcfConversion);
    const fcfs = historical.map(h => h.fcf);

    const avgFCFMargin = fcfMargins.reduce((a, b) => a + b, 0) / fcfMargins.length;
    const avgFCFConversion = conversions.reduce((a, b) => a + b, 0) / conversions.length;

    // 计算 FCF 增长率
    const firstFCF = fcfs[fcfs.length - 1];
    const lastFCF = fcfs[0];
    const fcfGrowthRate = Math.pow(lastFCF / firstFCF, 1 / (fcfs.length - 1)) - 1;

    // 计算波动率
    const meanFCF = fcfs.reduce((a, b) => a + b, 0) / fcfs.length;
    const variance = fcfs.reduce((sum, fcf) => sum + Math.pow(fcf - meanFCF, 2), 0) / fcfs.length;
    const fcfVolatility = Math.sqrt(variance) / meanFCF;

    return {
      avgFCFMargin,
      avgFCFConversion,
      fcfGrowthRate,
      fcfVolatility,
    };
  }

  private projectFCF(
    historical: FCFAnalysis['historical'],
    metrics: FCFAnalysis['metrics']
  ): FCFAnalysis['projections'] {
    const lastYear = parseInt(historical[0].year);
    const lastRevenue = historical[0].revenue;
    const { projectionYears, revenueGrowthRate, targetFCFMargin } = this.inputs;

    const projections = [];
    let currentRevenue = lastRevenue;

    for (let i = 1; i <= projectionYears!; i++) {
      currentRevenue *= (1 + revenueGrowthRate!);
      const year = lastYear + i;

      // 逐渐改善到目标 FCF 利润率
      const currentMargin = metrics.avgFCFMargin;
      const marginImprovement = (targetFCFMargin! - currentMargin) * (i / projectionYears!);
      const projectedMargin = currentMargin + marginImprovement;

      projections.push({
        year,
        revenue: currentRevenue,
        fcf: currentRevenue * projectedMargin,
        fcfMargin: projectedMargin,
      });
    }

    return projections;
  }
}

// 计算历史平均FCF
export function calculateAverageFCF(data: CompanyData, years: number = 5): number {
  const { cashFlowStatements } = data;
  const recentStatements = cashFlowStatements.slice(-years);

  const totalFCF = recentStatements.reduce((sum, stmt) => {
    return sum + (stmt.operatingCashFlow - Math.abs(stmt.capitalExpenditure));
  }, 0);

  return totalFCF / recentStatements.length;
}

// 计算 FCF Yield
export function calculateFCFYield(fcf: number, marketCap: number): number {
  return fcf / marketCap;
}

// 计算每股 FCF
export function calculateFCFPerShare(fcf: number, sharesOutstanding: number): number {
  return fcf / sharesOutstanding;
}
