import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { SOTPModel } from '../../models/sotp.js';
import * as fmt from '../../utils/format.js';

export const sotpCommand = new Command('sotp')
  .description('部分之和估值 (Sum-of-the-Parts)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('--json', '输出JSON格式结果')
  .action(async (symbol: string, options: { json?: boolean }) => {
    try {
      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new SOTPModel(data);
      const result = model.analyze();

      const upside = (result.impliedValue.perShare - data.stockPrice.current) / data.stockPrice.current;

      // JSON 输出模式
      if (options.json) {
        const jsonOutput = {
          model: 'SOTP',
          impliedPrice: result.impliedValue.perShare,
          currentPrice: data.stockPrice.current,
          upside: upside,
          enterpriseValue: result.impliedValue.enterpriseValue,
          equityValue: result.impliedValue.equityValue,
          segments: result.segments.length,
        };
        console.log(JSON.stringify(jsonOutput));
        return;
      }

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  部分之和估值 (SOTP) - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      // 业务分部估值
      console.log(fmt.colorize('\n【业务分部估值】', 'yellow'));
      const segmentRows = result.segments.map(s => [
        s.name,
        fmt.formatCurrency(s.revenue),
        fmt.formatCurrency(s.ebitda),
        s.methodology.toUpperCase(),
        fmt.formatMultiple(s.multiple, 1),
        fmt.formatCurrency(s.value),
        fmt.formatPercent(s.percentOfTotal),
      ]);
      console.log(fmt.createMarkdownTable(
        ['业务分部', '收入', 'EBITDA', '方法', '倍数', '估值', '占比'],
        segmentRows
      ));

      // 调整项
      console.log(fmt.colorize('\n【调整项】', 'yellow'));
      console.log(`  公司总部费用:   ${fmt.formatCurrency(result.adjustments.corporateOverheadValue)}`);
      console.log(`  净债务:         ${fmt.formatCurrency(-result.adjustments.netDebt)}`);
      console.log(`  现金:           ${fmt.formatCurrency(result.adjustments.cash)}`);

      // 估值汇总
      console.log(fmt.colorize('\n【估值汇总】', 'yellow'));
      console.log(`  分部价值总和:   ${fmt.formatCurrency(result.sumOfParts.grossValue)}`);
      console.log(`  调整后净值:     ${fmt.formatCurrency(result.sumOfParts.netValue)}`);

      // 隐含价值
      console.log(fmt.colorize('\n【隐含价值】', 'yellow'));
      console.log(`  企业价值:       ${fmt.formatCurrency(result.impliedValue.enterpriseValue)}`);
      console.log(`  股权价值:       ${fmt.formatCurrency(result.impliedValue.equityValue)}`);
      console.log(`  每股价值:       ${fmt.bold(fmt.formatPrice(result.impliedValue.perShare))}`);

      // 情景分析
      console.log(fmt.colorize('\n【情景分析】', 'yellow'));
      console.log(`  保守情景:       ${fmt.formatCurrency(result.scenarios.conservative)} → ${fmt.formatPrice(result.scenarios.conservative / data.profile.sharesOutstanding)}`);
      console.log(`  基准情景:       ${fmt.formatCurrency(result.scenarios.base)} → ${fmt.formatPrice(result.scenarios.base / data.profile.sharesOutstanding)}`);
      console.log(`  乐观情景:       ${fmt.formatCurrency(result.scenarios.optimistic)} → ${fmt.formatPrice(result.scenarios.optimistic / data.profile.sharesOutstanding)}`);

      // 与当前价格对比
      console.log(fmt.colorize('\n【估值对比】', 'yellow'));
      console.log(`  当前股价:       ${fmt.formatPrice(data.stockPrice.current)}`);
      console.log(`  SOTP隐含股价:   ${fmt.formatPrice(result.impliedValue.perShare)}`);
      console.log(`  上涨/下跌空间:  ${upside >= 0 ? fmt.colorize(fmt.formatPercent(upside), 'green') : fmt.colorize(fmt.formatPercent(upside), 'red')}`);

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
