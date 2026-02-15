import type { CompanyData } from '../data/types.js';

/**
 * Three-Statement Financial Model
 * 三报表财务模型（利润表、资产负债表、现金流量表）
 */

export interface ThreeStatementInputs {
  projectionYears?: number;
  revenueGrowth?: number[];
  grossMargin?: number;
  operatingMargin?: number;
  taxRate?: number;
  workingCapitalDays?: {
    ar: number;
    inventory: number;
    ap: number;
  };
}

export interface ThreeStatementResult {
  incomeStatements: {
    year: number;
    revenue: number;
    costOfGoodsSold: number;
    grossProfit: number;
    grossMargin: number;
    operatingExpenses: number;
    operatingIncome: number;
    operatingMargin: number;
    interestExpense: number;
    preTaxIncome: number;
    tax: number;
    netIncome: number;
    netMargin: number;
  }[];
  balanceSheets: {
    year: number;
    cash: number;
    accountsReceivable: number;
    inventory: number;
    totalCurrentAssets: number;
    ppe: number;
    totalAssets: number;
    accountsPayable: number;
    totalCurrentLiabilities: number;
    totalDebt: number;
    totalLiabilities: number;
    equity: number;
    totalLiabilitiesAndEquity: number;
  }[];
  cashFlowStatements: {
    year: number;
    netIncome: number;
    depreciation: number;
    changeInWorkingCapital: number;
    operatingCashFlow: number;
    capex: number;
    investingCashFlow: number;
    debtIssuance: number;
    financingCashFlow: number;
    netChangeInCash: number;
    beginningCash: number;
    endingCash: number;
  }[];
}

export class ThreeStatementModel {
  private data: CompanyData;
  private inputs: Required<ThreeStatementInputs>;

  constructor(data: CompanyData, inputs: ThreeStatementInputs = {}) {
    this.data = data;

    const lastRevenue = data.incomeStatements[data.incomeStatements.length - 1]?.revenue || 100000;

    this.inputs = {
      projectionYears: 5,
      revenueGrowth: [0.15, 0.12, 0.10, 0.08, 0.06],
      grossMargin: 0.40,
      operatingMargin: 0.20,
      taxRate: 0.21,
      workingCapitalDays: {
        ar: 45,
        inventory: 60,
        ap: 30,
      },
      ...inputs,
    };
  }

  project(): ThreeStatementResult {
    const incomeStatements: ThreeStatementResult['incomeStatements'] = [];
    const balanceSheets: ThreeStatementResult['balanceSheets'] = [];
    const cashFlowStatements: ThreeStatementResult['cashFlowStatements'] = [];

    let lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    let lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];
    let lastCashflow = this.data.cashFlowStatements[this.data.cashFlowStatements.length - 1];

    for (let year = 1; year <= this.inputs.projectionYears; year++) {
      // 利润表
      const growth = this.inputs.revenueGrowth[year - 1] || this.inputs.revenueGrowth[this.inputs.revenueGrowth.length - 1];
      const revenue = lastIncome.revenue * (1 + growth);
      const cogs = revenue * (1 - this.inputs.grossMargin);
      const grossProfit = revenue - cogs;

      const operatingIncome = revenue * this.inputs.operatingMargin;
      const operatingExpenses = grossProfit - operatingIncome;

      const interestExpense = lastBalance.totalDebt * 0.05;
      const preTaxIncome = operatingIncome - interestExpense;
      const tax = preTaxIncome * this.inputs.taxRate;
      const netIncome = preTaxIncome - tax;

      incomeStatements.push({
        year,
        revenue,
        costOfGoodsSold: cogs,
        grossProfit,
        grossMargin: grossProfit / revenue,
        operatingExpenses,
        operatingIncome,
        operatingMargin: operatingIncome / revenue,
        interestExpense,
        preTaxIncome,
        tax,
        netIncome,
        netMargin: netIncome / revenue,
      });

      // 资产负债表
      const days = this.inputs.workingCapitalDays;
      const ar = (revenue / 365) * days.ar;
      const inventory = (cogs / 365) * days.inventory;
      const ap = (cogs / 365) * days.ap;

      const depreciation = lastBalance.totalAssets * 0.05;
      const ppe = lastBalance.totalAssets * 0.4 + (revenue - lastIncome.revenue) * 0.3;
      const totalCurrentAssets = lastBalance.cashAndEquivalents + ar + inventory;
      const totalAssets = totalCurrentAssets + ppe;

      const totalCurrentLiabilities = ap + revenue * 0.1;
      const totalDebt = lastBalance.totalDebt;
      const totalLiabilities = totalCurrentLiabilities + totalDebt;

      const equity = totalAssets - totalLiabilities;

      balanceSheets.push({
        year,
        cash: lastBalance.cashAndEquivalents,
        accountsReceivable: ar,
        inventory,
        totalCurrentAssets,
        ppe,
        totalAssets,
        accountsPayable: ap,
        totalCurrentLiabilities,
        totalDebt,
        totalLiabilities,
        equity,
        totalLiabilitiesAndEquity: totalLiabilities + equity,
      });

      // 现金流量表
      const changeInWC = (ar - (lastIncome.revenue / 365) * days.ar) +
                         (inventory - (lastIncome.revenue * 0.6 / 365) * days.inventory) -
                         (ap - (lastIncome.revenue * 0.6 / 365) * days.ap);

      const operatingCF = netIncome + depreciation - changeInWC;
      const capex = ppe - lastBalance.totalAssets * 0.4 + depreciation;
      const investingCF = -capex;
      const debtIssuance = 0;
      const financingCF = debtIssuance;
      const netChangeInCash = operatingCF + investingCF + financingCF;
      const endingCash = lastBalance.cashAndEquivalents + netChangeInCash;

      cashFlowStatements.push({
        year,
        netIncome,
        depreciation,
        changeInWorkingCapital: changeInWC,
        operatingCashFlow: operatingCF,
        capex,
        investingCashFlow: investingCF,
        debtIssuance,
        financingCashFlow: financingCF,
        netChangeInCash,
        beginningCash: lastBalance.cashAndEquivalents,
        endingCash,
      });

      // 更新用于下一年
      lastIncome = { ...lastIncome, revenue, netIncome };
      lastBalance.cashAndEquivalents = endingCash;
    }

    return {
      incomeStatements,
      balanceSheets,
      cashFlowStatements,
    };
  }
}
