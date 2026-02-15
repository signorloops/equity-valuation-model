import type { CompanyData } from '../data/types.js';
import { DCFModel } from './dcf.js';

/**
 * Sensitivity & Scenario Analysis
 * 敏感性与情景分析
 */

export interface SensitivityInputs {
  baseVariables?: {
    revenueGrowth?: number;
    margin?: number;
    wacc?: number;
    terminalGrowth?: number;
  };
  ranges?: Record<string, number[]>;
}

export interface SensitivityResult {
  baseCase: {
    variables: Record<string, number>;
    valuation: number;
  };
  oneWay: {
    variable: string;
    values: { input: number; output: number }[];
  }[];
  twoWay: {
    variable1: string;
    variable2: string;
    matrix: number[][];
    rowLabels: number[];
    colLabels: number[];
  }[];
  scenarios: {
    name: string;
    assumptions: Record<string, number>;
    valuation: number;
    probability: number;
  }[];
  breakeven: {
    variable: string;
    threshold: number;
    currentValue: number;
    buffer: number;
  }[];
  tornado: {
    variable: string;
    low: number;
    base: number;
    high: number;
    impact: number;
  }[];
}

export class SensitivityModel {
  private data: CompanyData;
  private inputs: Required<SensitivityInputs>;

  constructor(data: CompanyData, inputs: SensitivityInputs = {}) {
    this.data = data;

    // 默认假设
    const defaultGrowth = [0.15, 0.12, 0.10, 0.08, 0.06];

    this.inputs = {
      baseVariables: {
        revenueGrowth: 0.10,
        margin: 0.20,
        wacc: 0.10,
        terminalGrowth: 0.025,
        ...inputs.baseVariables,
      },
      ranges: {
        revenueGrowth: [0.05, 0.08, 0.10, 0.12, 0.15],
        margin: [0.15, 0.18, 0.20, 0.22, 0.25],
        wacc: [0.08, 0.09, 0.10, 0.11, 0.12],
        terminalGrowth: [0.01, 0.02, 0.025, 0.03, 0.04],
        ...inputs.ranges,
      },
    };
  }

  analyze(): SensitivityResult {
    const baseCase = this.calculateBaseCase();
    const oneWay = this.calculateOneWaySensitivity();
    const twoWay = this.calculateTwoWaySensitivity();
    const scenarios = this.calculateScenarios();
    const breakeven = this.calculateBreakeven();
    const tornado = this.calculateTornado();

    return {
      baseCase,
      oneWay,
      twoWay,
      scenarios,
      breakeven,
      tornado,
    };
  }

  private calculateValuation(overrides: Record<string, number> = {}): number {
    const vars = { ...this.inputs.baseVariables, ...overrides };
    const dcf = new DCFModel(this.data, {
      revenueGrowth: Array(5).fill(vars.revenueGrowth),
      wacc: vars.wacc,
      terminalGrowth: vars.terminalGrowth,
    });
    return dcf.calculate().impliedSharePrice;
  }

  private calculateBaseCase() {
    return {
      variables: this.inputs.baseVariables,
      valuation: this.calculateValuation(),
    };
  }

  private calculateOneWaySensitivity(): SensitivityResult['oneWay'] {
    const results: SensitivityResult['oneWay'] = [];

    for (const [variable, values] of Object.entries(this.inputs.ranges)) {
      if (!values) continue;

      const sensitivity = values.map(value => ({
        input: value,
        output: this.calculateValuation({ [variable]: value }),
      }));

      results.push({
        variable,
        values: sensitivity,
      });
    }

    return results;
  }

  private calculateTwoWaySensitivity(): SensitivityResult['twoWay'] {
    const results: SensitivityResult['twoWay'] = [];
    const variables = Object.keys(this.inputs.ranges);

    // 选择两个最重要的变量做二维分析
    const var1 = variables[0]; // revenueGrowth
    const var2 = variables[2]; // wacc

    const range1 = this.inputs.ranges[var1] || [];
    const range2 = this.inputs.ranges[var2] || [];

    const matrix: number[][] = [];
    for (const val1 of range1) {
      const row: number[] = [];
      for (const val2 of range2) {
        const valuation = this.calculateValuation({
          [var1]: val1,
          [var2]: val2,
        });
        row.push(valuation);
      }
      matrix.push(row);
    }

    results.push({
      variable1: var1,
      variable2: var2,
      matrix,
      rowLabels: range1,
      colLabels: range2,
    });

    return results;
  }

  private calculateScenarios(): SensitivityResult['scenarios'] {
    const base = this.calculateValuation();

    return [
      {
        name: 'Best Case',
        assumptions: {
          revenueGrowth: 0.15,
          margin: 0.25,
          wacc: 0.08,
          terminalGrowth: 0.04,
        },
        valuation: this.calculateValuation({
          revenueGrowth: 0.15,
          wacc: 0.08,
          terminalGrowth: 0.04,
        }),
        probability: 0.25,
      },
      {
        name: 'Base Case',
        assumptions: this.inputs.baseVariables,
        valuation: base,
        probability: 0.50,
      },
      {
        name: 'Worst Case',
        assumptions: {
          revenueGrowth: 0.05,
          margin: 0.15,
          wacc: 0.12,
          terminalGrowth: 0.01,
        },
        valuation: this.calculateValuation({
          revenueGrowth: 0.05,
          wacc: 0.12,
          terminalGrowth: 0.01,
        }),
        probability: 0.25,
      },
    ];
  }

  private calculateBreakeven(): SensitivityResult['breakeven'] {
    const currentPrice = this.data.stockPrice.current;

    // 盈亏平衡分析
    const breakevenVars = ['revenueGrowth', 'wacc', 'terminalGrowth'];
    const breakevenData: { variable: string; threshold: number; currentValue: number; buffer: number }[] = [];

    for (const variable of breakevenVars) {
      const currentValue = this.inputs.baseVariables[variable as keyof typeof this.inputs.baseVariables] || 0;
      const threshold = this.findBreakevenValue(variable, currentPrice);

      breakevenData.push({
        variable,
        threshold,
        currentValue,
        buffer: Math.abs(currentValue - threshold) / (currentValue || 1),
      });
    }

    return breakevenData;
  }

  private findBreakevenValue(variable: string, target: number): number {
    const range = this.inputs.ranges[variable] || [];
    let closest = range[0] || 0;
    let minDiff = Infinity;

    for (const value of range) {
      const valuation = this.calculateValuation({ [variable]: value });
      const diff = Math.abs(valuation - target);
      if (diff < minDiff) {
        minDiff = diff;
        closest = value;
      }
    }

    return closest;
  }

  private calculateTornado(): SensitivityResult['tornado'] {
    const base = this.calculateValuation();
    const tornado: SensitivityResult['tornado'] = [];

    for (const [variable, range] of Object.entries(this.inputs.ranges)) {
      if (!range || range.length < 2) continue;

      const low = this.calculateValuation({ [variable]: range[0] });
      const high = this.calculateValuation({ [variable]: range[range.length - 1] });

      tornado.push({
        variable,
        low: Math.min(low, high),
        base,
        high: Math.max(low, high),
        impact: Math.abs(high - low) / base,
      });
    }

    // 按影响程度排序
    return tornado.sort((a, b) => b.impact - a.impact);
  }
}
