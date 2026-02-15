import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { IPOModel } from '../../models/ipo.js';
import * as fmt from '../../utils/format.js';

export const ipoCommand = new Command('ipo')
  .description('IPO估值与定价分析 (IPO Valuation)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('-s, --shares <number>', '发行股数(百万)', '50')
  .option('-l, --low <number>', '低价', undefined)
  .option('-h, --high <number>', '高价', undefined)
  .action(async (symbol: string, options) => {
    try {
      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  IPO估值与定价分析 - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      const data = await yahooFinanceClient.getCompanyData(symbol);
      const primaryShares = parseFloat(options.shares) * 1000000;

      const model = new IPOModel(data, {
        primaryShares,
        secondaryShares: primaryShares * 0.2,
        priceLow: options.low ? parseFloat(options.low) : undefined,
        priceHigh: options.high ? parseFloat(options.high) : undefined,
      });

      const result = model.analyze();

      // 发行结构
      console.log(fmt.colorize('\n【发行结构】', 'yellow'));
      console.log(`  新股发行:       ${fmt.formatNumber(result.offering.primaryShares)} 股`);
      console.log(`  老股出售:       ${fmt.formatNumber(result.offering.secondaryShares)} 股`);
      console.log(`  总发行股数:     ${fmt.formatNumber(result.offering.totalShares)} 股`);

      // 融资规模
      console.log(fmt.colorize('\n【融资规模】', 'yellow'));
      console.log(`  低价区间:       ${fmt.formatCurrency(result.offering.totalProceeds.low)}`);
      console.log(`  中价区间:       ${fmt.formatCurrency(result.offering.totalProceeds.mid)}`);
      console.log(`  高价区间:       ${fmt.formatCurrency(result.offering.totalProceeds.high)}`);

      // 估值
      console.log(fmt.colorize('\n【IPO前后估值】', 'yellow'));
      console.log(`  IPO前估值:      ${fmt.formatCurrency(result.preMoney.valuation.mid)}`);
      console.log(`  IPO后估值:      ${fmt.formatCurrency(result.postMoney.valuation.mid)}`);
      console.log(`  发行股数占比:   ${fmt.formatPercent(result.dilution.dilutionPercent)}`);

      // 定价区间
      console.log(fmt.colorize('\n【定价区间建议】', 'yellow'));
      console.log(`  低价:           ${fmt.formatPrice(result.preMoney.valuation.low / result.preMoney.sharesOutstanding)}`);
      console.log(`  中价:           ${fmt.bold(fmt.formatPrice(result.preMoney.valuation.mid / result.preMoney.sharesOutstanding))}`);
      console.log(`  高价:           ${fmt.formatPrice(result.preMoney.valuation.high / result.preMoney.sharesOutstanding)}`);

      // 估值倍数
      console.log(fmt.colorize('\n【IPO估值倍数】', 'yellow'));
      console.log(`  EV/Revenue:     ${fmt.formatMultiple(result.valuationMetrics.evRevenue.mid)}`);
      console.log(`  EV/EBITDA:      ${fmt.formatMultiple(result.valuationMetrics.evEbitda.mid)}`);
      console.log(`  P/E:            ${fmt.formatMultiple(result.valuationMetrics.pe.mid)}`);

      // 可比IPO
      console.log(fmt.colorize('\n【近期可比IPO表现】', 'yellow'));
      const ipoRows = result.comparableIPOs.map(i => [
        i.company,
        i.date.substring(0, 7),
        fmt.formatPrice(i.offerPrice),
        fmt.formatPrice(i.firstDayClose),
        fmt.formatPercent(i.firstDayPop),
        fmt.formatMultiple(i.evRevenue, 1),
      ]);
      console.log(fmt.createMarkdownTable(
        ['公司', '上市日期', '发行价', '首日收盘价', '首日涨幅', 'EV/Revenue'],
        ipoRows
      ));

      // 首日涨幅预期
      console.log(fmt.colorize('\n【首日涨幅预期】', 'yellow'));
      console.log(`  保守估计:       ${fmt.formatPercent(result.firstDayPopEstimate.conservative)}`);
      console.log(`  基准估计:       ${fmt.formatPercent(result.firstDayPopEstimate.base)}`);
      console.log(`  乐观估计:       ${fmt.formatPercent(result.firstDayPopEstimate.optimistic)}`);

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
