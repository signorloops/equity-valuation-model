import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { CreditModel } from '../../models/credit.js';
import * as fmt from '../../utils/format.js';

export const creditCommand = new Command('credit')
  .description('信用分析与债务容量 (Credit Analysis)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .action(async (symbol: string) => {
    try {
      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  信用分析与债务容量 - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new CreditModel(data);
      const result = model.analyze();

      // 历史杠杆
      console.log(fmt.colorize('\n【历史杠杆指标】', 'yellow'));
      const histRows = result.historical.map(h => [
        h.year,
        fmt.formatCurrency(h.ebitda),
        fmt.formatCurrency(h.totalDebt),
        fmt.formatMultiple(h.leverageRatio, 1),
        fmt.formatMultiple(h.netLeverage, 1),
        fmt.formatMultiple(h.interestCoverage, 1),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', 'EBITDA', '总债务', '杠杆比率', '净杠杆', '利息覆盖'],
        histRows
      ));

      // 债务容量
      console.log(fmt.colorize('\n【债务容量分析】', 'yellow'));
      console.log(`  当前债务:       ${fmt.formatCurrency(result.debtCapacity.currentDebt)}`);
      console.log(`  最大债务容量:   ${fmt.formatCurrency(result.debtCapacity.maxDebt)}`);
      console.log(`  剩余额度:       ${fmt.colorize(fmt.formatCurrency(result.debtCapacity.headroom), result.debtCapacity.headroom > 0 ? 'green' : 'red')}`);
      console.log(`  可新增借款:     ${fmt.formatCurrency(result.debtCapacity.additionalBorrowing)}`);

      // 契约测试
      console.log(fmt.colorize('\n【契约测试】', 'yellow'));
      const leverageStatus = result.covenants.leverageTest.status === 'pass' ?
        fmt.colorize('通过', 'green') : fmt.colorize('失败', 'red');
      const coverageStatus = result.covenants.interestCoverageTest.status === 'pass' ?
        fmt.colorize('通过', 'green') : fmt.colorize('失败', 'red');

      console.log(`  杠杆契约:       限制 ${fmt.formatMultiple(result.covenants.leverageTest.covenant)} | 当前 ${fmt.formatMultiple(result.covenants.leverageTest.current)} | 缓冲 ${fmt.formatMultiple(result.covenants.leverageTest.cushion)} | ${leverageStatus}`);
      console.log(`  覆盖契约:       最低 ${fmt.formatMultiple(result.covenants.interestCoverageTest.covenant)} | 当前 ${fmt.formatMultiple(result.covenants.interestCoverageTest.current)} | 缓冲 ${fmt.formatMultiple(result.covenants.interestCoverageTest.cushion)} | ${coverageStatus}`);

      // 定价网格
      console.log(fmt.colorize('\n【债务定价网格】', 'yellow'));
      const pricingRows = result.pricingGrid.map(p => [
        p.leverage,
        p.spread,
        fmt.formatPercent(p.allInRate),
      ]);
      console.log(fmt.createMarkdownTable(
        ['杠杆区间', '利差', '全包利率'],
        pricingRows
      ));

      // 再融资日程
      console.log(fmt.colorize('\n【再融资日程】', 'yellow'));
      const refiRows = result.refinancing.map(r => [
        r.maturity,
        fmt.formatCurrency(r.amount),
        r.type,
      ]);
      console.log(fmt.createMarkdownTable(
        ['到期日', '金额', '类型'],
        refiRows
      ));

      // 建议
      console.log(fmt.colorize('\n【信用建议】', 'yellow'));
      console.log(`  评级:           ${result.recommendation.rating.toUpperCase()}`);
      console.log(`  最大债务容量:   ${fmt.formatCurrency(result.recommendation.maxDebtCapacity)}`);
      console.log(`  建议结构:       ${result.recommendation.suggestedStructure}`);

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
