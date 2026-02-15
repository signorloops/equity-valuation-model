#!/usr/bin/env node
// 检测股票所属行业的辅助脚本

import { yahooFinanceClient } from './dist/data/yahoo-finance.js';

const symbol = process.argv[2];

if (!symbol) {
  console.error('用法: node detect-industry.js <股票代码>');
  process.exit(1);
}

// 公司名称关键词映射表
const companyKeywords = {
  // SaaS/软件
  saas: ['SNOW', 'CRM', 'NOW', 'PLTR', 'DDOG', 'NET', 'OKTA', 'ZM', 'DOCU', 'TWLO', 'ZS', 'CRWD'],

  // 半导体/芯片
  tech: ['NVDA', 'AMD', 'INTC', 'QCOM', 'MU', 'AVGO', 'TXN', 'AMAT', 'LRCX', 'KLAC', 'MRVL', 'MCHP'],

  // 银行/金融
  bank: ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'USB', 'PNC', 'TFC', 'COF', 'SCHW', 'BLK'],

  // 汽车
  auto: ['TSLA', 'F', 'GM', 'TM', 'HMC', 'VWAGY', 'NIO', 'XPEV', 'LI', 'RIVN', 'LCID'],

  // 多元化集团
  conglomerate: ['AMZN', 'GOOGL', 'GOOG', 'MSFT', 'META', 'AAPL', 'BRK', 'BRK-A', 'BRK-B', 'BABA'],

  // 房地产/REITs
  reit: ['PLD', 'SPG', 'O', 'AMT', 'CCI', 'EQIX', 'DLR', 'PSA', 'AVB', 'EQR', 'VTR', 'WELL'],

  // 能源
  energy: ['XOM', 'CVX', 'COP', 'EOG', 'MPC', 'VLO', 'PSX', 'SLB', 'HAL', 'BKR', 'OXY'],

  // 消费/零售
  consumer: ['KO', 'PEP', 'WMT', 'COST', 'HD', 'LOW', 'TGT', 'NKE', 'SBUX', 'MCD', 'PG', 'WMT']
};

function detectBySymbol(symbol) {
  const upperSymbol = symbol.toUpperCase();

  for (const [type, symbols] of Object.entries(companyKeywords)) {
    if (symbols.includes(upperSymbol)) {
      return type;
    }
  }
  return null;
}

function detectByName(name) {
  if (!name) return null;

  const lowerName = name.toLowerCase();

  // SaaS/软件关键词
  if (lowerName.includes('snowflake') ||
      lowerName.includes('datadog') ||
      lowerName.includes('cloudflare') ||
      lowerName.includes('okta') ||
      lowerName.includes('zoom') ||
      lowerName.includes('docusign') ||
      lowerName.includes('twilio') ||
      lowerName.includes('zscaler') ||
      lowerName.includes('crowdstrike')) {
    return 'saas';
  }

  // 半导体关键词
  if (lowerName.includes('nvidia') ||
      lowerName.includes('intel') ||
      lowerName.includes('qualcomm') ||
      lowerName.includes('micron') ||
      lowerName.includes('broadcom') ||
      lowerName.includes('texas instruments') ||
      lowerName.includes('advanced micro')) {
    return 'tech';
  }

  // 银行关键词
  if (lowerName.includes('jpmorgan') ||
      lowerName.includes('bank of america') ||
      lowerName.includes('wells fargo') ||
      lowerName.includes('goldman sachs') ||
      lowerName.includes('morgan stanley') ||
      lowerName.includes('citigroup') ||
      lowerName.includes('charles schwab')) {
    return 'bank';
  }

  // 汽车关键词
  if (lowerName.includes('tesla') ||
      lowerName.includes('ford') ||
      lowerName.includes('general motors') ||
      lowerName.includes('toyota') ||
      lowerName.includes('honda') ||
      lowerName.includes('volkswagen') ||
      lowerName.includes('nio') ||
      lowerName.includes('rivian') ||
      lowerName.includes('lucid')) {
    return 'auto';
  }

  // 多元化集团
  if (lowerName.includes('amazon') ||
      lowerName.includes('alphabet') ||
      lowerName.includes('microsoft') ||
      lowerName.includes('meta') ||
      lowerName.includes('apple') ||
      lowerName.includes('berkshire')) {
    return 'conglomerate';
  }

  // 房地产
  if (lowerName.includes('prologis') ||
      lowerName.includes('simon property') ||
      lowerName.includes('realty income') ||
      lowerName.includes('american tower') ||
      lowerName.includes('equinix')) {
    return 'reit';
  }

  // 能源
  if (lowerName.includes('exxon') ||
      lowerName.includes('chevron') ||
      lowerName.includes('conocophillips') ||
      lowerName.includes('schlumberger') ||
      lowerName.includes('occidental')) {
    return 'energy';
  }

  // 消费
  if (lowerName.includes('coca-cola') ||
      lowerName.includes('pepsico') ||
      lowerName.includes('walmart') ||
      lowerName.includes('costco') ||
      lowerName.includes('home depot') ||
      lowerName.includes('nike') ||
      lowerName.includes('starbucks') ||
      lowerName.includes('mcdonald')) {
    return 'consumer';
  }

  return null;
}

async function detectIndustry(symbol) {
  try {
    // 首先通过symbol关键词匹配
    let detectedType = detectBySymbol(symbol);

    // 如果没有匹配，尝试获取公司信息
    let companyName = '';
    let industryFromApi = 'Unknown';
    let sectorFromApi = 'Unknown';

    try {
      const data = await yahooFinanceClient.getCompanyData(symbol);
      const { industry, sector } = data.profile;
      companyName = data.profile.name || '';
      industryFromApi = industry || 'Unknown';
      sectorFromApi = sector || 'Unknown';

      // 如果API返回有效行业信息，使用它
      if (industry && industry !== 'Unknown') {
        const apiType = mapToValuationType(industry, sector);
        if (apiType !== 'general') {
          detectedType = apiType;
        }
      }

      // 如果还是没有检测到，通过公司名称推断
      if (!detectedType) {
        detectedType = detectByName(companyName);
      }
    } catch (apiError) {
      // API调用失败，尝试只用symbol和名称推断
      detectedType = detectBySymbol(symbol) || detectByName(symbol);
    }

    // 如果还是没有，使用默认值
    if (!detectedType) {
      detectedType = 'general';
    }

    console.log(JSON.stringify({
      symbol: symbol.toUpperCase(),
      name: companyName || symbol,
      industry: industryFromApi,
      sector: sectorFromApi,
      detectedType: detectedType
    }));
  } catch (error) {
    console.error(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

function mapToValuationType(industry, sector) {
  const industryLower = (industry || '').toLowerCase();
  const sectorLower = (sector || '').toLowerCase();

  const text = `${industryLower} ${sectorLower}`;

  // SaaS/软件
  if (text.includes('software') ||
      text.includes('saas') ||
      text.includes('computer') ||
      text.includes('cloud') ||
      text.includes('data')) {
    return 'saas';
  }

  // 银行/金融
  if (text.includes('bank') ||
      text.includes('financial') ||
      text.includes('insurance') ||
      text.includes('credit')) {
    return 'bank';
  }

  // 汽车
  if (text.includes('auto') ||
      text.includes('motor') ||
      text.includes('vehicle') ||
      text.includes('car')) {
    return 'auto';
  }

  // 房地产/REITs
  if (text.includes('reit') ||
      text.includes('real estate') ||
      text.includes('property')) {
    return 'reit';
  }

  // 能源
  if (text.includes('oil') ||
      text.includes('gas') ||
      text.includes('energy') ||
      text.includes('petroleum')) {
    return 'energy';
  }

  // 消费/零售
  if (text.includes('consumer') ||
      text.includes('retail') ||
      text.includes('beverage') ||
      text.includes('food') ||
      text.includes('staples')) {
    return 'consumer';
  }

  // 半导体/科技硬件
  if (text.includes('semiconductor') ||
      text.includes('chip') ||
      text.includes('electronics') ||
      text.includes('hardware') ||
      text.includes('ai')) {
    return 'tech';
  }

  // 电信
  if (text.includes('telecom') ||
      text.includes('communication')) {
    return 'tech';
  }

  // 默认科技
  if (text.includes('technology') ||
      sectorLower.includes('technology')) {
    return 'tech';
  }

  // 其他情况返回通用
  return 'general';
}

detectIndustry(symbol);
