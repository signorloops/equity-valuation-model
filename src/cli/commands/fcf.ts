import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { FCFModel } from '../../models/fcf.js';
import * as fmt from '../../utils/format.js';

export const fcfCommand = new Command('fcf')
  .description('自由现金流分析 (Free Cash Flow Analysis)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('-y, --years <number>', '预测年数', '5')
  .option('-g, --growth <number>', '收入增长率 (如: 0.08)', '0.08')
  .option('-m, --margin <number>', '目标FCF利润率 (如: 0.20)', '0.20')
  .option('--json', '输出JSON格式结果')
  .action(async (symbol: string, options: { years: string; growth: string; margin: string; json?: boolean }) => {
    try {
      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new FCFModel(data, {
        projectionYears: parseInt(options.years),
        revenueGrowthRate: parseFloat(options.growth),
        targetFCFMargin: parseFloat(options.margin),
      });

      const result = model.analyze();

      // FCF Yield
      const currentFCF = result.historical[0].fcf;
      const fcfYield = currentFCF / data.profile.marketCap;
      const fcfPerShare = currentFCF / data.profile.sharesOutstanding;

      // JSON 输出模式
      if (options.json) {
        const jsonOutput = {
          model: 'FCF',
          fcfYield: fcfYield,
          fcfPerShare: fcfPerShare,
          currentPrice: data.stockPrice.current,
          avgFCFMargin: result.metrics.avgFCFMargin,
        };
        console.log(JSON.stringify(jsonOutput));
        return;
      }

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  自由现金流分析 - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      // 历史FCF分析
      console.log(fmt.colorize('\n【历史FCF表现】', 'yellow'));
      const historicalRows = result.historical.map(h => [
        h.year,
        fmt.formatCurrency(h.revenue),
        fmt.formatCurrency(h.operatingCashFlow),
        fmt.formatCurrency(h.capex),
        fmt.formatCurrency(h.fcf),
        fmt.formatPercent(h.fcfMargin),
        fmt.formatMultiple(h.fcfConversion),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', '收入', '经营现金流', '资本支出', '自由现金流', 'FCF利润率', 'FCF转化率'],
        historicalRows
      ));

      // 关键指标
      console.log(fmt.colorize('\n【FCF关键指标】', 'yellow'));
      console.log(`  平均FCF利润率:  ${fmt.formatPercent(result.metrics.avgFCFMargin)}`);
      console.log(`  平均FCF转化率:  ${fmt.formatMultiple(result.metrics.avgFCFConversion)}`);
      console.log(`  FCF年增长率:    ${fmt.formatPercent(result.metrics.fcfGrowthRate)}`);
      console.log(`  FCF波动性:      ${fmt.formatPercent(result.metrics.fcfVolatility)}`);

      // FCF预测
      console.log(fmt.colorize('\n【FCF预测】', 'yellow'));
      const projectionRows = result.projections.map(p => [
        p.year.toString(),
        fmt.formatCurrency(p.revenue),
        fmt.formatCurrency(p.fcf),
        fmt.formatPercent(p.fcfMargin),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', '预测收入', '预测FCF', 'FCF利润率'],
        projectionRows
      ));

      console.log(fmt.colorize('\n【估值指标】', 'yellow'));
      console.log(`  当前市值:       ${fmt.formatCurrency(data.profile.marketCap)}`);
      console.log(`  当前FCF:        ${fmt.formatCurrency(currentFCF)}`);
      console.log(`  FCF收益率:      ${fmt.formatPercent(fcfYield)}`);
      console.log(`  每股FCF:        ${fmt.formatPrice(fcfPerShare)}`);
      console.log(`  当前股价:       ${fmt.formatPrice(data.stockPrice.current)}`);

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
