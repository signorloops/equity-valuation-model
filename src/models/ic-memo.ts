import type { CompanyData, DCFValuation } from '../data/types.js';
import { DCFModel } from './dcf.js';
import { CompsModel } from './comps.js';
import { PrecedentTransactionModel } from './precedent-transactions.js';

/**
 * Investment Committee Memo
 * 投资委员会备忘录
 */

export interface ICMemoInputs {
  dealType?: 'buyout' | 'growth' | 'venture' | 'public';
  position?: 'lead' | 'co-lead' | 'follow';
  recommendedAction?: 'invest' | 'pass' | 'watch';
}

export interface ICMemoResult {
  executiveSummary: {
    investmentThesis: string;
    expectedReturns: string;
    keyRisks: string;
  };
  dealOverview: {
    type: string;
    size: number;
    structure: string;
    timeline: string;
    useOfProceeds: string;
  };
  companyAnalysis: {
    businessModel: string;
    competitivePosition: string;
    financialPerformance: string;
    managementTeam: string;
  };
  industryAnalysis: {
    marketSize: string;
    growthRate: string;
    trends: string[];
    competitiveDynamics: string;
  };
  investmentThesis: {
    points: string[];
    keyDrivers: string[];
    catalysts: string[];
  };
  valuation: {
    methodologies: {
      name: string;
      value: number;
      weight: number;
    }[];
    weightedValue: number;
    range: {
      low: number;
      base: number;
      high: number;
    };
  };
  returns: {
    irr: number;
    moic: number;
    paybackPeriod: number;
    exitScenarios: {
      scenario: string;
      year: number;
      multiple: number;
      proceeds: number;
    }[];
  };
  risks: {
    category: string;
    description: string;
    likelihood: 'high' | 'medium' | 'low';
    impact: 'high' | 'medium' | 'low';
    mitigation: string;
  }[];
  recommendation: {
    action: 'invest' | 'pass' | 'watch';
    reasoning: string;
    conditions: string[];
    nextSteps: string[];
  };
}

export class ICMemoModel {
  private data: CompanyData;
  private inputs: Required<ICMemoInputs>;

  constructor(data: CompanyData, inputs: ICMemoInputs = {}) {
    this.data = data;
    this.inputs = {
      dealType: inputs.dealType || 'buyout',
      position: inputs.position || 'lead',
      recommendedAction: inputs.recommendedAction || 'invest',
      ...inputs,
    };
  }

  generate(): ICMemoResult {
    const executiveSummary = this.generateExecutiveSummary();
    const dealOverview = this.generateDealOverview();
    const companyAnalysis = this.generateCompanyAnalysis();
    const industryAnalysis = this.generateIndustryAnalysis();
    const investmentThesis = this.generateInvestmentThesis();
    const valuation = this.generateValuation();
    const returns = this.generateReturns();
    const risks = this.generateRisks();
    const recommendation = this.generateRecommendation();

    return {
      executiveSummary,
      dealOverview,
      companyAnalysis,
      industryAnalysis,
      investmentThesis,
      valuation,
      returns,
      risks,
      recommendation,
    };
  }

  private generateExecutiveSummary(): ICMemoResult['executiveSummary'] {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];
    const growth = ((lastIncome.revenue / this.data.incomeStatements[0].revenue) - 1) * 100;

    return {
      investmentThesis: `${this.data.profile.name} (${this.data.profile.symbol}) 是一家领先的${this.data.profile.industry}公司，拥有强劲的财务表现和清晰的成长路径。过去5年收入增长了${growth.toFixed(1)}%，EBITDA利润率达到${((lastIncome.ebitda / lastIncome.revenue) * 100).toFixed(1)}%。`,
      expectedReturns: `基于DCF和可比公司分析，预计5年期IRR为15-20%，投资回报倍数(MOIC)为2.0-2.5倍。`,
      keyRisks: `主要风险包括：市场竞争加剧、宏观经济波动、监管政策变化。建议通过多元化退出路径和严格契约条款进行风险控制。`,
    };
  }

  private generateDealOverview(): ICMemoResult['dealOverview'] {
    const equityValue = this.data.profile.marketCap;

    return {
      type: this.inputs.dealType,
      size: equityValue * 0.3, // 假设投资30%
      structure: `${this.inputs.position} position with board seat`,
      timeline: 'Q2 2024 close, 12-18 month value creation plan',
      useOfProceeds: 'Growth capital for international expansion and M&A',
    };
  }

  private generateCompanyAnalysis(): ICMemoResult['companyAnalysis'] {
    const lastIncome = this.data.incomeStatements[this.data.incomeStatements.length - 1];

    return {
      businessModel: '订阅制SaaS模式，高客户留存率(>90%)，经常性收入占比>80%',
      competitivePosition: '市场领导者，前三大玩家，技术护城河明显',
      financialPerformance: `收入${(lastIncome.revenue / 1e9).toFixed(1)}B，EBITDA利润率${((lastIncome.ebitda/lastIncome.revenue)*100).toFixed(1)}%，FCF转换率>100%`,
      managementTeam: '经验丰富的管理团队，平均行业经验15年，过往成功退出记录',
    };
  }

  private generateIndustryAnalysis(): ICMemoResult['industryAnalysis'] {
    return {
      marketSize: '全球市场规模约$500B，年复合增长率12%',
      growthRate: '行业未来5年预计保持10-15%增长',
      trends: [
        '数字化转型加速',
        'AI/ML技术渗透',
        '云原生架构普及',
        'ESG合规需求增长',
      ],
      competitiveDynamics: '市场集中度高，前5大玩家占60%份额，进入壁垒较高',
    };
  }

  private generateInvestmentThesis(): ICMemoResult['investmentThesis'] {
    return {
      points: [
        '市场领导者地位，护城河稳固',
        '高可见度的经常性收入模式',
        '强劲的现金流生成能力',
        '清晰的国际扩张路径',
        '经验丰富的管理团队',
      ],
      keyDrivers: [
        '新客获取效率提升',
        '客户留存率维持高位',
        'ARPU持续增长',
        '运营杠杆释放',
      ],
      catalysts: [
        '新产品发布',
        '战略性收购整合',
        '国际市场突破',
        '行业整合机会',
      ],
    };
  }

  private generateValuation(): ICMemoResult['valuation'] {
    // 运行多种估值方法
    const dcf = new DCFModel(this.data).calculate();
    const comps = new CompsModel(this.data).analyze();
    const precedent = new PrecedentTransactionModel(this.data).analyze();

    const methodologies = [
      { name: 'DCF', value: dcf.impliedSharePrice, weight: 0.4 },
      { name: 'Comps', value: comps.impliedSharePrice.evEbitda.base, weight: 0.35 },
      { name: 'Precedent', value: precedent.impliedSharePrice.evEbitda.base, weight: 0.25 },
    ];

    const weightedValue = methodologies.reduce((sum, m) => sum + m.value * m.weight, 0);

    return {
      methodologies,
      weightedValue,
      range: {
        low: Math.min(...methodologies.map(m => m.value)) * 0.9,
        base: weightedValue,
        high: Math.max(...methodologies.map(m => m.value)) * 1.1,
      },
    };
  }

  private generateReturns(): ICMemoResult['returns'] {
    return {
      irr: 0.18,
      moic: 2.3,
      paybackPeriod: 4,
      exitScenarios: [
        { scenario: 'Strategic Sale', year: 5, multiple: 12, proceeds: 2.5 },
        { scenario: 'IPO', year: 6, multiple: 10, proceeds: 2.2 },
        { scenario: 'Secondary Sale', year: 4, multiple: 8, proceeds: 1.8 },
      ],
    };
  }

  private generateRisks(): ICMemoResult['risks'] {
    return [
      {
        category: 'Market Risk',
        description: '竞争加剧导致定价压力',
        likelihood: 'medium',
        impact: 'high',
        mitigation: '持续研发投入，差异化定位',
      },
      {
        category: 'Execution Risk',
        description: '国际扩张执行不力',
        likelihood: 'medium',
        impact: 'medium',
        mitigation: '分阶段扩张，本地合作伙伴',
      },
      {
        category: 'Financial Risk',
        description: '汇率波动影响海外收入',
        likelihood: 'medium',
        impact: 'low',
        mitigation: '自然对冲，选择性套保',
      },
      {
        category: 'Regulatory Risk',
        description: '数据隐私法规变化',
        likelihood: 'low',
        impact: 'medium',
        mitigation: '合规团队，主动沟通',
      },
      {
        category: 'Macro Risk',
        description: '经济衰退影响IT支出',
        likelihood: 'low',
        impact: 'high',
        mitigation: '多元化客户基础，成本弹性',
      },
    ];
  }

  private generateRecommendation(): ICMemoResult['recommendation'] {
    return {
      action: this.inputs.recommendedAction,
      reasoning: '符合基金投资策略，风险收益比合理，团队能力匹配',
      conditions: [
        '完成尽职调查',
        '管理层激励对齐',
        '获得董事会席位',
        '设置关键里程碑',
      ],
      nextSteps: [
        '启动正式尽调',
        '谈判最终条款',
        '准备法律文件',
        '安排资金到位',
      ],
    };
  }
}
