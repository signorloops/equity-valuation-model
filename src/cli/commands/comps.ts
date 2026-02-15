import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { CompsModel } from '../../models/comps.js';
import * as fmt from '../../utils/format.js';

export const compsCommand = new Command('comps')
  .description('可比公司分析 (Comparable Company Analysis)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('--json', '输出JSON格式结果')
  .action(async (symbol: string, options: { json?: boolean }) => {
    try {
      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new CompsModel(data);
      const result = model.analyze();

      const currentPrice = data.stockPrice.current;
      const impliedPrice = result.impliedSharePrice.evEbitda.base;
      const upside = (impliedPrice - currentPrice) / currentPrice;

      // JSON 输出模式
      if (options.json) {
        const jsonOutput = {
          model: 'Comps',
          impliedPrice: impliedPrice,
          currentPrice: currentPrice,
          upside: upside,
          evEbitdaMultiple: result.multiples.evEbitda.median,
          evRevenueMultiple: result.multiples.evRevenue.median,
          peMultiple: result.multiples.pe.median,
        };
        console.log(JSON.stringify(jsonOutput));
        return;
      }

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  可比公司分析 (Trading Comps) - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      // 目标公司信息
      console.log(fmt.colorize('\n【目标公司信息】', 'yellow'));
      console.log(`  公司: ${data.profile.name} (${symbol.toUpperCase()})`);
      console.log(`  行业: ${data.profile.industry}`);
      console.log(`  收入: ${fmt.formatCurrency(result.target.revenue)}`);
      console.log(`  EBITDA: ${fmt.formatCurrency(result.target.ebitda)}`);

      // 可比公司列表
      console.log(fmt.colorize('\n【可比公司列表】', 'yellow'));
      const peerRows = result.peers.map(p => [
        p.symbol,
        p.name.substring(0, 15),
        fmt.formatCurrency(p.marketCap),
        fmt.formatCurrency(p.revenue),
        fmt.formatMultiple(p.enterpriseValue / p.ebitda, 1),
      ]);
      console.log(fmt.createMarkdownTable(
        ['代码', '公司名', '市值', '收入', 'EV/EBITDA'],
        peerRows
      ));

      // 倍数统计
      console.log(fmt.colorize('\n【倍数统计】', 'yellow'));
      console.log('EV/Revenue:');
      console.log(`  25th: ${fmt.formatMultiple(result.multiples.evRevenue.low)}  |  Median: ${fmt.formatMultiple(result.multiples.evRevenue.median)}  |  75th: ${fmt.formatMultiple(result.multiples.evRevenue.high)}  |  Mean: ${fmt.formatMultiple(result.multiples.evRevenue.mean)}`);
      console.log('EV/EBITDA:');
      console.log(`  25th: ${fmt.formatMultiple(result.multiples.evEbitda.low)}  |  Median: ${fmt.formatMultiple(result.multiples.evEbitda.median)}  |  75th: ${fmt.formatMultiple(result.multiples.evEbitda.high)}  |  Mean: ${fmt.formatMultiple(result.multiples.evEbitda.mean)}`);
      console.log('P/E:');
      console.log(`  25th: ${fmt.formatMultiple(result.multiples.pe.low)}  |  Median: ${fmt.formatMultiple(result.multiples.pe.median)}  |  75th: ${fmt.formatMultiple(result.multiples.pe.high)}  |  Mean: ${fmt.formatMultiple(result.multiples.pe.mean)}`);

      // 隐含估值
      console.log(fmt.colorize('\n【隐含估值 (EV/EBITDA法)】', 'yellow'));
      console.log(`  保守: ${fmt.formatCurrency(result.valuation.evEbitda.low)} → 每股 ${fmt.formatPrice(result.impliedSharePrice.evEbitda.low)}`);
      console.log(`  基准: ${fmt.formatCurrency(result.valuation.evEbitda.base)} → 每股 ${fmt.bold(fmt.formatPrice(result.impliedSharePrice.evEbitda.base))}`);
      console.log(`  乐观: ${fmt.formatCurrency(result.valuation.evEbitda.high)} → 每股 ${fmt.formatPrice(result.impliedSharePrice.evEbitda.high)}`);

      // 与当前价格对比
      console.log(fmt.colorize('\n【估值对比】', 'yellow'));
      console.log(`  当前股价: ${fmt.formatPrice(currentPrice)}`);
      console.log(`  隐含股价: ${fmt.formatPrice(impliedPrice)}`);
      console.log(`  上涨/下跌空间: ${upside >= 0 ? fmt.colorize(fmt.formatPercent(upside), 'green') : fmt.colorize(fmt.formatPercent(upside), 'red')}`);

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
