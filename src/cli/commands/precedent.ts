import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { PrecedentTransactionModel } from '../../models/precedent-transactions.js';
import * as fmt from '../../utils/format.js';

export const precedentCommand = new Command('precedent')
  .description('先例交易分析 (Precedent Transaction Analysis)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .action(async (symbol: string) => {
    try {
      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  先例交易分析 (Precedent Transactions) - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new PrecedentTransactionModel(data);
      const result = model.analyze();

      // 近期交易列表
      console.log(fmt.colorize('\n【近期相关交易】', 'yellow'));
      const transRows = result.transactions.slice(0, 10).map(t => [
        t.date.substring(0, 7),
        t.target.substring(0, 12),
        t.acquirer.substring(0, 12),
        fmt.formatCurrency(t.dealValue),
        fmt.formatMultiple(t.dealValue / t.targetEBITDA, 1),
        fmt.formatPercent(t.premium),
        t.strategic ? '战略' : '财务',
      ]);
      console.log(fmt.createMarkdownTable(
        ['日期', '目标公司', '收购方', '交易价值', 'EV/EBITDA', '溢价', '类型'],
        transRows
      ));

      // 倍数统计
      console.log(fmt.colorize('\n【交易倍数统计】', 'yellow'));
      console.log('EV/Revenue:');
      console.log(`  25th: ${fmt.formatMultiple(result.multiples.evRevenue.low)}  |  Median: ${fmt.formatMultiple(result.multiples.evRevenue.median)}  |  75th: ${fmt.formatMultiple(result.multiples.evRevenue.high)}  |  Mean: ${fmt.formatMultiple(result.multiples.evRevenue.mean)}`);
      console.log('EV/EBITDA:');
      console.log(`  25th: ${fmt.formatMultiple(result.multiples.evEbitda.low)}  |  Median: ${fmt.formatMultiple(result.multiples.evEbitda.median)}  |  75th: ${fmt.formatMultiple(result.multiples.evEbitda.high)}  |  Mean: ${fmt.formatMultiple(result.multiples.evEbitda.mean)}`);

      // 溢价分析
      console.log(fmt.colorize('\n【控制权溢价分析】', 'yellow'));
      console.log(`  25th: ${fmt.formatPercent(result.premiums.low)}  |  Median: ${fmt.formatPercent(result.premiums.median)}  |  75th: ${fmt.formatPercent(result.premiums.high)}  |  Mean: ${fmt.formatPercent(result.premiums.mean)}`);

      // 隐含估值
      console.log(fmt.colorize('\n【隐含估值 (基于先例交易)】', 'yellow'));
      console.log(`  保守: ${fmt.formatCurrency(result.valuation.evEbitda.low)} → 每股 ${fmt.formatPrice(result.impliedSharePrice.evEbitda.low)}`);
      console.log(`  基准: ${fmt.formatCurrency(result.valuation.evEbitda.base)} → 每股 ${fmt.bold(fmt.formatPrice(result.impliedSharePrice.evEbitda.base))}`);
      console.log(`  乐观: ${fmt.formatCurrency(result.valuation.evEbitda.high)} → 每股 ${fmt.formatPrice(result.impliedSharePrice.evEbitda.high)}`);

      // 与可比公司法对比
      console.log(fmt.colorize('\n【估值对比】', 'yellow'));
      console.log(`  当前股价:       ${fmt.formatPrice(data.stockPrice.current)}`);
      console.log(`  隐含股价(中值): ${fmt.formatPrice(result.impliedSharePrice.evEbitda.base)}`);
      const upside = (result.impliedSharePrice.evEbitda.base - data.stockPrice.current) / data.stockPrice.current;
      console.log(`  上涨/下跌空间:  ${upside >= 0 ? fmt.colorize(fmt.formatPercent(upside), 'green') : fmt.colorize(fmt.formatPercent(upside), 'red')}`);

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
