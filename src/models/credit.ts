import type { CompanyData } from '../data/types.js';

/**
 * Credit Analysis & Debt Capacity Model
 * 信用分析与债务容量模型
 */

export interface CreditInputs {
  targetLeverage?: number;       // 目标杠杆率 (Debt/EBITDA)
  minInterestCoverage?: number;  // 最低利息覆盖倍数
  covenantCushion?: number;      // 契约缓冲 (通常20%)
}

export interface CreditResult {
  historical: {
    year: string;
    ebitda: number;
    totalDebt: number;
    netDebt: number;
    interestExpense: number;
    leverageRatio: number;
    netLeverage: number;
    interestCoverage: number;
  }[];
  projections: {
    year: number;
    ebitda: number;
    totalDebt: number;
    interestExpense: number;
    leverageRatio: number;
    interestCoverage: number;
  }[];
  debtCapacity: {
    currentDebt: number;
    maxDebt: number;
    headroom: number;
    additionalBorrowing: number;
  };
  covenants: {
    leverageTest: {
      covenant: number;
      current: number;
      cushion: number;
      status: 'pass' | 'fail';
    };
    interestCoverageTest: {
      covenant: number;
      current: number;
      cushion: number;
      status: 'pass' | 'fail';
    };
  };
  pricingGrid: {
    leverage: string;
    spread: string;
    allInRate: number;
  }[];
  refinancing: {
    maturity: string;
    amount: number;
    type: string;
  }[];
  recommendation: {
    rating: 'investment' | 'speculative' | 'high-yield';
    maxDebtCapacity: number;
    suggestedStructure: string;
  };
}

export class CreditModel {
  private data: CompanyData;
  private inputs: Required<CreditInputs>;

  constructor(data: CompanyData, inputs: CreditInputs = {}) {
    this.data = data;
    this.inputs = {
      targetLeverage: 3.0,
      minInterestCoverage: 3.0,
      covenantCushion: 0.20,
      ...inputs,
    };
  }

  analyze(): CreditResult {
    const historical = this.calculateHistorical();
    const projections = this.projectFuture();
    const debtCapacity = this.calculateDebtCapacity();
    const covenants = this.testCovenants(historical);
    const pricingGrid = this.getPricingGrid();
    const refinancing = this.getRefinancingSchedule();
    const recommendation = this.makeRecommendation();

    return {
      historical,
      projections,
      debtCapacity,
      covenants,
      pricingGrid,
      refinancing,
      recommendation,
    };
  }

  private calculateHistorical() {
    const { incomeStatements, balanceSheets, cashFlowStatements } = this.data;
    const years = Math.min(incomeStatements.length, balanceSheets.length, cashFlowStatements.length);

    return Array.from({ length: years }, (_, i) => {
      const income = incomeStatements[i];
      const balance = balanceSheets[i];
      const year = new Date(balance.date).getFullYear();

      const ebitda = income.ebitda;
      const totalDebt = balance.totalDebt;
      const netDebt = totalDebt - balance.cashAndEquivalents;
      const interestExpense = totalDebt * 0.05; // 假设5%利率

      return {
        year: year.toString(),
        ebitda,
        totalDebt,
        netDebt,
        interestExpense,
        leverageRatio: totalDebt / ebitda,
        netLeverage: netDebt / ebitda,
        interestCoverage: ebitda / interestExpense,
      };
    }).reverse();
  }

  private projectFuture() {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];

    let ebitda = lastIncome.ebitda;
    const debt = lastBalance.totalDebt;
    const interestRate = 0.05;

    return Array.from({ length: 5 }, (_, i) => {
      const year = new Date().getFullYear() + i + 1;
      ebitda *= 1.08; // 假设8%增长
      const interestExpense = debt * interestRate;

      return {
        year,
        ebitda,
        totalDebt: debt,
        interestExpense,
        leverageRatio: debt / ebitda,
        interestCoverage: ebitda / interestExpense,
      };
    });
  }

  private calculateDebtCapacity() {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];
    const ebitda = lastIncome.ebitda;
    const currentDebt = lastBalance.totalDebt;
    const maxDebt = ebitda * this.inputs.targetLeverage;

    return {
      currentDebt,
      maxDebt,
      headroom: maxDebt - currentDebt,
      additionalBorrowing: Math.max(0, maxDebt - currentDebt),
    };
  }

  private testCovenants(historical: CreditResult['historical']) {
    const current = historical[0];
    const leverageLimit = this.inputs.targetLeverage * (1 + this.inputs.covenantCushion);
    const coverageFloor = this.inputs.minInterestCoverage * (1 - this.inputs.covenantCushion);

    const leverageStatus: 'pass' | 'fail' = current.leverageRatio <= leverageLimit ? 'pass' : 'fail';
    const coverageStatus: 'pass' | 'fail' = current.interestCoverage >= coverageFloor ? 'pass' : 'fail';

    return {
      leverageTest: {
        covenant: leverageLimit,
        current: current.leverageRatio,
        cushion: leverageLimit - current.leverageRatio,
        status: leverageStatus,
      },
      interestCoverageTest: {
        covenant: coverageFloor,
        current: current.interestCoverage,
        cushion: current.interestCoverage - coverageFloor,
        status: coverageStatus,
      },
    };
  }

  private getPricingGrid() {
    return [
      { leverage: '< 1.0x', spread: 'L + 150-175bps', allInRate: 0.055 },
      { leverage: '1.0x - 2.0x', spread: 'L + 175-200bps', allInRate: 0.06 },
      { leverage: '2.0x - 3.0x', spread: 'L + 200-250bps', allInRate: 0.065 },
      { leverage: '3.0x - 4.0x', spread: 'L + 250-300bps', allInRate: 0.075 },
      { leverage: '> 4.0x', spread: 'L + 350-450bps', allInRate: 0.09 },
    ];
  }

  private getRefinancingSchedule() {
    return [
      { maturity: '2025-06', amount: 500000000, type: 'Revolver' },
      { maturity: '2026-12', amount: 1000000000, type: 'Term Loan A' },
      { maturity: '2027-06', amount: 1500000000, type: 'Term Loan B' },
      { maturity: '2028-12', amount: 750000000, type: 'Senior Notes' },
    ];
  }

  private makeRecommendation(): CreditResult['recommendation'] {
    const { leverageRatio } = this.calculateHistorical()[0];
    const maxDebt = this.calculateDebtCapacity().maxDebt;

    if (leverageRatio < 2.0) {
      return {
        rating: 'investment',
        maxDebtCapacity: maxDebt,
        suggestedStructure: '50% Revolver + 30% Term Loan A + 20% Senior Notes',
      };
    } else if (leverageRatio < 4.0) {
      return {
        rating: 'speculative',
        maxDebtCapacity: maxDebt,
        suggestedStructure: '40% Term Loan B + 40% Senior Notes + 20% Mezzanine',
      };
    } else {
      return {
        rating: 'high-yield',
        maxDebtCapacity: maxDebt * 0.8,
        suggestedStructure: '60% Senior Secured + 40% High Yield Bonds',
      };
    }
  }
}
