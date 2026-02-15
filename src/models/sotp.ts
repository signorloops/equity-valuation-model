import type { CompanyData } from '../data/types.js';

/**
 * Sum-of-the-Parts (SOTP) Valuation
 * 部分之和估值
 */

export interface BusinessSegment {
  name: string;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number;
  growthRate: number;
  methodology: 'dcf' | 'comps' | 'multiple';
  multiple?: number;
}

export interface SOTPInputs {
  segments?: BusinessSegment[];
  corporateOverhead?: number;
  netDebtAllocation?: 'proportional' | 'revenue' | 'ebitda' | 'equal';
}

export interface SOTPResult {
  segments: {
    name: string;
    revenue: number;
    ebitda: number;
    methodology: string;
    multiple: number;
    value: number;
    percentOfTotal: number;
  }[];
  adjustments: {
    corporateOverhead: number;
    corporateOverheadValue: number;
    netDebt: number;
    cash: number;
    minorityInterest: number;
  };
  sumOfParts: {
    grossValue: number;
    netValue: number;
  };
  impliedValue: {
    enterpriseValue: number;
    equityValue: number;
    perShare: number;
  };
  scenarios: {
    conservative: number;
    base: number;
    optimistic: number;
  };
}

export class SOTPModel {
  private data: CompanyData;
  private inputs: Required<SOTPInputs>;

  constructor(data: CompanyData, inputs: SOTPInputs = {}) {
    this.data = data;
    this.inputs = {
      segments: inputs.segments || this.deriveSegments(),
      corporateOverhead: inputs.corporateOverhead || 0.02,
      netDebtAllocation: inputs.netDebtAllocation || 'ebitda',
    };
  }

  analyze(): SOTPResult {
    const segments = this.valueSegments();
    const adjustments = this.calculateAdjustments();
    const sumOfParts = this.calculateSumOfParts(segments, adjustments);
    const impliedValue = this.calculateImpliedValue(sumOfParts);
    const scenarios = this.calculateScenarios(segments);

    return {
      segments,
      adjustments,
      sumOfParts,
      impliedValue,
      scenarios,
    };
  }

  private deriveSegments(): BusinessSegment[] {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const totalRevenue = lastIncome.revenue;
    const totalEBITDA = lastIncome.ebitda;

    // 模拟分拆成3-4个业务单元
    return [
      {
        name: '核心业务',
        revenue: totalRevenue * 0.5,
        ebitda: totalEBITDA * 0.6,
        ebitdaMargin: 0.30,
        growthRate: 0.08,
        methodology: 'comps',
        multiple: 12,
      },
      {
        name: '成长业务',
        revenue: totalRevenue * 0.25,
        ebitda: totalEBITDA * 0.25,
        ebitdaMargin: 0.20,
        growthRate: 0.20,
        methodology: 'multiple',
        multiple: 18,
      },
      {
        name: '传统业务',
        revenue: totalRevenue * 0.20,
        ebitda: totalEBITDA * 0.12,
        ebitdaMargin: 0.15,
        growthRate: 0.02,
        methodology: 'multiple',
        multiple: 6,
      },
      {
        name: '新业务',
        revenue: totalRevenue * 0.05,
        ebitda: totalEBITDA * 0.03,
        ebitdaMargin: 0.10,
        growthRate: 0.35,
        methodology: 'multiple',
        multiple: 25,
      },
    ];
  }

  private valueSegments() {
    const segments = this.inputs.segments;
    const totalEBITDA = segments.reduce((sum, s) => sum + s.ebitda, 0);

    return segments.map(segment => {
      let multiple = segment.multiple || 10;

      // 根据估值方法调整倍数
      if (segment.methodology === 'dcf') {
        multiple = 10 + segment.growthRate * 50;
      } else if (segment.methodology === 'comps') {
        multiple = 8 + segment.ebitdaMargin * 20;
      }

      const value = segment.ebitda * multiple;

      return {
        name: segment.name,
        revenue: segment.revenue,
        ebitda: segment.ebitda,
        methodology: segment.methodology,
        multiple,
        value,
        percentOfTotal: segment.ebitda / totalEBITDA,
      };
    });
  }

  private calculateAdjustments() {
    const lastBalance = this.data.balanceSheets[this.data.balanceSheets.length - 1];
    const totalEBITDA = this.data.incomeStatements[this.data.incomeStatements.length - 1].ebitda;

    // 公司总部费用价值（通常按费用倍数估值，负值）
    const corporateOverheadValue = -totalEBITDA * this.inputs.corporateOverhead * 8;

    return {
      corporateOverhead: totalEBITDA * this.inputs.corporateOverhead,
      corporateOverheadValue,
      netDebt: lastBalance.totalDebt - lastBalance.cashAndEquivalents,
      cash: lastBalance.cashAndEquivalents,
      minorityInterest: 0,
    };
  }

  private calculateSumOfParts(
    segments: SOTPResult['segments'],
    adjustments: SOTPResult['adjustments']
  ) {
    const grossValue = segments.reduce((sum, s) => sum + s.value, 0);
    const netValue = grossValue + adjustments.corporateOverheadValue;

    return {
      grossValue,
      netValue,
    };
  }

  private calculateImpliedValue(sumOfParts: SOTPResult['sumOfParts']) {
    const adjustments = this.calculateAdjustments();
    const enterpriseValue = sumOfParts.netValue;
    const equityValue = enterpriseValue - adjustments.netDebt;
    const perShare = equityValue / this.data.profile.sharesOutstanding;

    return {
      enterpriseValue,
      equityValue,
      perShare,
    };
  }

  private calculateScenarios(segments: SOTPResult['segments']) {
    const baseValue = segments.reduce((sum, s) => sum + s.value, 0);
    const adjustments = this.calculateAdjustments();

    return {
      conservative: (baseValue * 0.85) - Math.abs(adjustments.corporateOverheadValue) - adjustments.netDebt,
      base: baseValue - Math.abs(adjustments.corporateOverheadValue) - adjustments.netDebt,
      optimistic: (baseValue * 1.20) - Math.abs(adjustments.corporateOverheadValue) - adjustments.netDebt,
    };
  }
}
