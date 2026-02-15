// 财务数据类型定义

export interface FinancialStatement {
  date: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  ebitda: number;
  depreciation?: number;
  amortization?: number;
}

export interface CashFlowStatement {
  date: string;
  operatingCashFlow: number;
  capitalExpenditure: number;
  freeCashFlow: number;
  depreciation: number;
  stockBasedCompensation?: number;
  changeInWorkingCapital?: number;
}

export interface BalanceSheet {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalDebt: number;
  cashAndEquivalents: number;
  workingCapital?: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  industry: string;
  sector: string;
  marketCap: number;
  sharesOutstanding: number;
  beta?: number;
}

export interface StockPrice {
  current: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  averageVolume: number;
}

export interface CompanyData {
  profile: CompanyProfile;
  incomeStatements: FinancialStatement[];
  cashFlowStatements: CashFlowStatement[];
  balanceSheets: BalanceSheet[];
  stockPrice: StockPrice;
}

// FCF 分析结果
export interface FCFAnalysis {
  historical: {
    year: string;
    revenue: number;
    netIncome: number;
    operatingCashFlow: number;
    capex: number;
    fcf: number;
    fcfMargin: number;
    fcfConversion: number;
  }[];
  metrics: {
    avgFCFMargin: number;
    avgFCFConversion: number;
    fcfGrowthRate: number;
    fcfVolatility: number;
  };
  projections: {
    year: number;
    revenue: number;
    fcf: number;
    fcfMargin: number;
  }[];
}

// DCF 估值结果
export interface DCFValuation {
  assumptions: {
    revenueGrowth: number[];
    ebitdaMargin: number[];
    taxRate: number;
    dAndAPercent: number;
    capexPercent: number;
    nwcPercent: number;
    terminalGrowth: number;
    wacc: number;
  };
  projections: {
    year: number;
    revenue: number;
    ebitda: number;
    ebit: number;
    nopat: number;
    dAndA: number;
    capex: number;
    nwcChange: number;
    fcf: number;
    discountFactor: number;
    presentValue: number;
  }[];
  terminalValue: number;
  enterpriseValue: number;
  netDebt: number;
  equityValue: number;
  sharesOutstanding: number;
  impliedSharePrice: number;
  currentPrice: number;
  upside: number;
}
