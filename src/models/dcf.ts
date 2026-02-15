import type { CompanyData, DCFValuation } from '../data/types.js';

/**
 * DCF (Discounted Cash Flow) 估值模型
 * 现金流折现模型
 */

export interface DCFInputs {
  projectionYears?: number;
  revenueGrowth?: number[];
  terminalGrowth?: number;
  wacc?: number;
  taxRate?: number;
  riskFreeRate?: number;
  marketRiskPremium?: number;
  beta?: number;
}

export class DCFModel {
  private data: CompanyData;
  private inputs: Required<DCFInputs>;

  constructor(data: CompanyData, inputs: DCFInputs = {}) {
    this.data = data;

    // 默认假设
    const lastRevenue = data.incomeStatements[data.incomeStatements.length - 1]?.revenue || 100000;
    const defaultGrowth = [0.15, 0.12, 0.10, 0.08, 0.06];

    // 先计算WACC需要的参数
    const beta = data.profile.beta || 1.0;
    const riskFreeRate = 0.04;
    const marketRiskPremium = 0.05;
    const costOfEquity = riskFreeRate + beta * marketRiskPremium;
    const costOfDebt = 0.04;
    const defaultWACC = costOfEquity * 0.7 + costOfDebt * 0.3 * (1 - 0.21);

    this.inputs = {
      projectionYears: 5,
      revenueGrowth: inputs.revenueGrowth ?? defaultGrowth,
      terminalGrowth: inputs.terminalGrowth ?? 0.025,
      wacc: inputs.wacc ?? defaultWACC,
      taxRate: inputs.taxRate ?? 0.21,
      riskFreeRate: inputs.riskFreeRate ?? riskFreeRate,
      marketRiskPremium: inputs.marketRiskPremium ?? marketRiskPremium,
      beta: inputs.beta ?? beta,
    };
  }

  calculate(): DCFValuation {
    const projections = this.calculateProjections();
    const terminalValue = this.calculateTerminalValue(projections);
    const enterpriseValue = this.calculateEnterpriseValue(projections, terminalValue);
    const { netDebt, impliedSharePrice, upside } = this.calculateEquityValue(enterpriseValue);

    return {
      assumptions: {
        revenueGrowth: this.inputs.revenueGrowth,
        ebitdaMargin: projections.map(p => p.ebitda / p.revenue),
        taxRate: this.inputs.taxRate,
        dAndAPercent: 0.05,
        capexPercent: 0.08,
        nwcPercent: 0.03,
        terminalGrowth: this.inputs.terminalGrowth,
        wacc: this.inputs.wacc,
      },
      projections,
      terminalValue,
      enterpriseValue,
      netDebt,
      equityValue: enterpriseValue - netDebt,
      sharesOutstanding: this.data.profile.sharesOutstanding,
      impliedSharePrice,
      currentPrice: this.data.stockPrice.current,
      upside,
    };
  }

  private calculateWACC(): number {
    const { riskFreeRate, marketRiskPremium, beta } = this.inputs;
    // 简化计算：CAPM 成本 + 债务成本
    const costOfEquity = riskFreeRate + beta * marketRiskPremium;
    const costOfDebt = 0.04;
    return costOfEquity * 0.7 + costOfDebt * 0.3 * (1 - this.inputs.taxRate);
  }

  private calculateProjections() {
    const lastStatement = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const lastCashflow = this.data.cashFlowStatements[this.data.cashFlowStatements.length - 1];
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];

    let currentRevenue = lastStatement.revenue;
    const projections = [];
    const { wacc, terminalGrowth, taxRate } = this.inputs;

    for (let year = 1; year <= this.inputs.projectionYears; year++) {
      const growthRate = this.inputs.revenueGrowth[year - 1] || this.inputs.revenueGrowth[this.inputs.revenueGrowth.length - 1];
      currentRevenue *= (1 + growthRate);

      // 假设
      const ebitdaMargin = 0.30;
      const dAndAPercent = 0.05;
      const capexPercent = 0.08;
      const nwcPercent = 0.03;

      const ebitda = currentRevenue * ebitdaMargin;
      const dAndA = currentRevenue * dAndAPercent;
      const ebit = ebitda - dAndA;
      const nopat = ebit * (1 - taxRate);
      const capex = currentRevenue * capexPercent;
      const nwcChange = (currentRevenue - lastStatement.revenue) * nwcPercent;

      const fcf = nopat + dAndA - capex - nwcChange;
      const discountFactor = Math.pow(1 + wacc, year);
      const presentValue = fcf / discountFactor;

      projections.push({
        year,
        revenue: currentRevenue,
        ebitda,
        ebit,
        nopat,
        dAndA,
        capex,
        nwcChange,
        fcf,
        discountFactor,
        presentValue,
      });

      lastStatement.revenue = currentRevenue;
    }

    return projections;
  }

  private calculateTerminalValue(projections: DCFValuation['projections']): number {
    const lastFCF = projections[projections.length - 1].fcf;
    const { wacc, terminalGrowth } = this.inputs;
    return (lastFCF * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  }

  private calculateEnterpriseValue(
    projections: DCFValuation['projections'],
    terminalValue: number
  ): number {
    const pvOfProjections = projections.reduce((sum, p) => sum + p.presentValue, 0);
    const pvOfTerminal = terminalValue / Math.pow(1 + this.inputs.wacc, this.inputs.projectionYears);
    return pvOfProjections + pvOfTerminal;
  }

  private calculateEquityValue(enterpriseValue: number) {
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];
    const netDebt = lastBalance.totalDebt - lastBalance.cashAndEquivalents;
    const equityValue = enterpriseValue - netDebt;
    const sharesOutstanding = this.data.profile.sharesOutstanding;
    const impliedSharePrice = equityValue / sharesOutstanding;
    const currentPrice = this.data.stockPrice.current;
    const upside = (impliedSharePrice - currentPrice) / currentPrice;

    return { netDebt, impliedSharePrice, upside };
  }

  // 敏感性分析
  sensitivityAnalysis(waccRange: number[], growthRange: number[]): number[][] {
    const results: number[][] = [];
    const originalWACC = this.inputs.wacc;
    const originalTerminalGrowth = this.inputs.terminalGrowth;

    for (const wacc of waccRange) {
      const row: number[] = [];
      for (const growth of growthRange) {
        this.inputs.wacc = wacc;
        this.inputs.terminalGrowth = growth;
        const valuation = this.calculate();
        row.push(valuation.impliedSharePrice);
      }
      results.push(row);
    }

    // 恢复原值
    this.inputs.wacc = originalWACC;
    this.inputs.terminalGrowth = originalTerminalGrowth;

    return results;
  }
}
