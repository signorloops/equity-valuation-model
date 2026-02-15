import type { CompanyData } from '../data/types.js';

/**
 * Operating Model & Unit Economics
 * 运营模型与单位经济学
 */

export interface OperatingInputs {
  projectionMonths?: number;
  startingCustomers?: number;
  monthlyGrowth?: number;
  cac?: number;
  arpu?: number;
  grossMargin?: number;
  churnRate?: number;
  ltvMonths?: number;
}

export interface OperatingResult {
  unitEconomics: {
    cac: number;                    // 获客成本
    arpu: number;                   // 每用户平均收入（月）
    grossMargin: number;
    churnRate: number;
    ltv: number;                    // 用户生命周期价值
    ltvCacRatio: number;
    paybackPeriod: number;          // 回本周期（月）
    monthsToRecover: number;
  };
  monthly: {
    month: number;
    customers: number;
    newCustomers: number;
    churnedCustomers: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    salesMarketing: number;
    operatingExpenses: number;
    ebitda: number;
    cumulativeCashFlow: number;
  }[];
  quarterly: {
    quarter: number;
    revenue: number;
    grossProfit: number;
    operatingExpenses: number;
    ebitda: number;
    margin: number;
  }[];
  annual: {
    year: number;
    revenue: number;
    ebitda: number;
    netIncome: number;
    margin: number;
  }[];
  breakeven: {
    month: number;
    customers: number;
    monthlyRevenue: number;
  };
  scenarios: {
    conservative: { revenue: number; ebitda: number; customers: number };
    base: { revenue: number; ebitda: number; customers: number };
    optimistic: { revenue: number; ebitda: number; customers: number };
  };
}

export class OperatingModel {
  private data: CompanyData;
  private inputs: Required<OperatingInputs>;

  constructor(data: CompanyData, inputs: OperatingInputs = {}) {
    this.data = data;

    const lastRevenue = data.incomeStatements[data.incomeStatements.length - 1]?.revenue || 100000000;
    const estimatedCustomers = Math.floor(lastRevenue / 1000);

    this.inputs = {
      projectionMonths: 36,
      startingCustomers: inputs.startingCustomers || estimatedCustomers,
      monthlyGrowth: 0.05,
      cac: inputs.cac || 100,
      arpu: inputs.arpu || 100,
      grossMargin: 0.75,
      churnRate: 0.02,
      ltvMonths: 24,
      ...inputs,
    };
  }

  analyze(): OperatingResult {
    const unitEconomics = this.calculateUnitEconomics();
    const monthly = this.projectMonthly();
    const quarterly = this.aggregateQuarterly(monthly);
    const annual = this.aggregateAnnual(monthly);
    const breakeven = this.findBreakeven(monthly);
    const scenarios = this.calculateScenarios();

    return {
      unitEconomics,
      monthly,
      quarterly,
      annual,
      breakeven,
      scenarios,
    };
  }

  private calculateUnitEconomics() {
    const { cac, arpu, grossMargin, churnRate, ltvMonths } = this.inputs;

    // LTV = ARPU × Gross Margin × 平均用户寿命
    const avgLifetimeMonths = churnRate > 0 ? 1 / churnRate : ltvMonths;
    const ltv = arpu * grossMargin * Math.min(avgLifetimeMonths, ltvMonths);
    const ltvCacRatio = ltv / cac;
    const paybackPeriod = cac / (arpu * grossMargin);

    return {
      cac,
      arpu,
      grossMargin,
      churnRate,
      ltv,
      ltvCacRatio,
      paybackPeriod,
      monthsToRecover: Math.ceil(paybackPeriod),
    };
  }

  private projectMonthly() {
    const { projectionMonths, startingCustomers, monthlyGrowth, arpu, grossMargin, cac } = this.inputs;
    const opexPerCustomer = arpu * 0.3; // 运营成本占ARPU的30%

    let customers = startingCustomers;
    let cumulativeCashFlow = 0;
    const monthly = [];

    for (let month = 1; month <= projectionMonths; month++) {
      const newCustomers = Math.floor(customers * monthlyGrowth);
      const churnedCustomers = Math.floor(customers * this.inputs.churnRate);
      customers = customers + newCustomers - churnedCustomers;

      const revenue = customers * arpu;
      const cogs = revenue * (1 - grossMargin);
      const grossProfit = revenue - cogs;
      const salesMarketing = newCustomers * cac;
      const operatingExpenses = customers * opexPerCustomer + 50000; // 固定成本
      const ebitda = grossProfit - salesMarketing - operatingExpenses;

      cumulativeCashFlow += ebitda;

      monthly.push({
        month,
        customers,
        newCustomers,
        churnedCustomers,
        revenue,
        cogs,
        grossProfit,
        salesMarketing,
        operatingExpenses,
        ebitda,
        cumulativeCashFlow,
      });
    }

    return monthly;
  }

  private aggregateQuarterly(monthly: OperatingResult['monthly']) {
    const quarters = Math.ceil(monthly.length / 3);
    const quarterly = [];

    for (let q = 0; q < quarters; q++) {
      const startMonth = q * 3;
      const endMonth = Math.min(startMonth + 3, monthly.length);
      const quarterMonths = monthly.slice(startMonth, endMonth);

      const revenue = quarterMonths.reduce((sum, m) => sum + m.revenue, 0);
      const grossProfit = quarterMonths.reduce((sum, m) => sum + m.grossProfit, 0);
      const operatingExpenses = quarterMonths.reduce((sum, m) => sum + m.operatingExpenses + m.salesMarketing, 0);
      const ebitda = quarterMonths.reduce((sum, m) => sum + m.ebitda, 0);

      quarterly.push({
        quarter: q + 1,
        revenue,
        grossProfit,
        operatingExpenses,
        ebitda,
        margin: revenue > 0 ? ebitda / revenue : 0,
      });
    }

    return quarterly;
  }

  private aggregateAnnual(monthly: OperatingResult['monthly']) {
    const years = Math.ceil(monthly.length / 12);
    const annual = [];

    for (let y = 0; y < years; y++) {
      const startMonth = y * 12;
      const endMonth = Math.min(startMonth + 12, monthly.length);
      const yearMonths = monthly.slice(startMonth, endMonth);

      const revenue = yearMonths.reduce((sum, m) => sum + m.revenue, 0);
      const ebitda = yearMonths.reduce((sum, m) => sum + m.ebitda, 0);
      const netIncome = ebitda * 0.79; // 税后

      annual.push({
        year: y + 1,
        revenue,
        ebitda,
        netIncome,
        margin: revenue > 0 ? ebitda / revenue : 0,
      });
    }

    return annual;
  }

  private findBreakeven(monthly: OperatingResult['monthly']) {
    const breakevenMonth = monthly.find(m => m.ebitda > 0);

    if (breakevenMonth) {
      return {
        month: breakevenMonth.month,
        customers: breakevenMonth.customers,
        monthlyRevenue: breakevenMonth.revenue,
      };
    }

    return {
      month: monthly.length,
      customers: monthly[monthly.length - 1].customers,
      monthlyRevenue: monthly[monthly.length - 1].revenue,
    };
  }

  private calculateScenarios() {
    const base = this.projectMonthly();

    // 保守：增长减半，流失翻倍
    const conservativeModel = new OperatingModel(this.data, {
      ...this.inputs,
      monthlyGrowth: this.inputs.monthlyGrowth * 0.5,
      churnRate: this.inputs.churnRate * 2,
    });
    const conservative = conservativeModel.projectMonthly();

    // 乐观：增长翻倍，流失减半
    const optimisticModel = new OperatingModel(this.data, {
      ...this.inputs,
      monthlyGrowth: this.inputs.monthlyGrowth * 2,
      churnRate: this.inputs.churnRate * 0.5,
    });
    const optimistic = optimisticModel.projectMonthly();

    return {
      conservative: {
        revenue: conservative.reduce((sum, m) => sum + m.revenue, 0),
        ebitda: conservative[conservative.length - 1].cumulativeCashFlow,
        customers: conservative[conservative.length - 1].customers,
      },
      base: {
        revenue: base.reduce((sum, m) => sum + m.revenue, 0),
        ebitda: base[base.length - 1].cumulativeCashFlow,
        customers: base[base.length - 1].customers,
      },
      optimistic: {
        revenue: optimistic.reduce((sum, m) => sum + m.revenue, 0),
        ebitda: optimistic[optimistic.length - 1].cumulativeCashFlow,
        customers: optimistic[optimistic.length - 1].customers,
      },
    };
  }
}
