import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { OperatingModel } from '../../models/operating.js';
import * as fmt from '../../utils/format.js';

export const operatingCommand = new Command('operating')
  .description('运营模型与单位经济学 (Operating Model & Unit Economics)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('-c, --cac <number>', '获客成本', '100')
  .option('-a, --arpu <number>', '每用户平均收入(月)', '100')
  .action(async (symbol: string, options) => {
    try {
      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  运营模型与单位经济学 - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new OperatingModel(data, {
        cac: parseFloat(options.cac),
        arpu: parseFloat(options.arpu),
      });

      const result = model.analyze();

      // 单位经济学
      console.log(fmt.colorize('\n【单位经济学】', 'yellow'));
      console.log(`  获客成本 (CAC):      ${fmt.formatCurrency(result.unitEconomics.cac)}`);
      console.log(`  每用户月收入 (ARPU): ${fmt.formatCurrency(result.unitEconomics.arpu)}`);
      console.log(`  毛利率:              ${fmt.formatPercent(result.unitEconomics.grossMargin)}`);
      console.log(`  月流失率:            ${fmt.formatPercent(result.unitEconomics.churnRate)}`);
      console.log(`  用户生命周期 (LTV):  ${fmt.bold(fmt.formatCurrency(result.unitEconomics.ltv))}`);
      console.log(`  LTV/CAC 比率:        ${fmt.bold(fmt.formatMultiple(result.unitEconomics.ltvCacRatio))}`);
      console.log(`  CAC回本周期:         ${fmt.bold(result.unitEconomics.monthsToRecover.toString())} 个月`);

      // 季度汇总
      console.log(fmt.colorize('\n【季度财务预测 (前8个季度)】', 'yellow'));
      const qRows = result.quarterly.slice(0, 8).map(q => [
        `Q${q.quarter}`,
        fmt.formatCurrency(q.revenue),
        fmt.formatCurrency(q.grossProfit),
        fmt.formatCurrency(q.ebitda),
        fmt.formatPercent(q.margin),
      ]);
      console.log(fmt.createMarkdownTable(
        ['季度', '收入', '毛利', 'EBITDA', '利润率'],
        qRows
      ));

      // 年度汇总
      console.log(fmt.colorize('\n【年度财务预测】', 'yellow'));
      const aRows = result.annual.map(a => [
        `第${a.year}年`,
        fmt.formatCurrency(a.revenue),
        fmt.formatCurrency(a.ebitda),
        fmt.formatCurrency(a.netIncome),
        fmt.formatPercent(a.margin),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', '收入', 'EBITDA', '净利润', '利润率'],
        aRows
      ));

      // 盈亏平衡分析
      console.log(fmt.colorize('\n【盈亏平衡分析】', 'yellow'));
      console.log(`  盈亏平衡月份:   第 ${result.breakeven.month} 个月`);
      console.log(`  所需客户数:     ${fmt.formatNumber(result.breakeven.customers)}`);
      console.log(`  所需月收入:     ${fmt.formatCurrency(result.breakeven.monthlyRevenue)}`);

      // 情景分析
      console.log(fmt.colorize('\n【情景分析 (3年累计)】', 'yellow'));
      console.log(`  保守情景:       收入 ${fmt.formatCurrency(result.scenarios.conservative.revenue)} | EBITDA ${fmt.formatCurrency(result.scenarios.conservative.ebitda)} | 客户 ${fmt.formatNumber(result.scenarios.conservative.customers)}`);
      console.log(`  基准情景:       收入 ${fmt.formatCurrency(result.scenarios.base.revenue)} | EBITDA ${fmt.formatCurrency(result.scenarios.base.ebitda)} | 客户 ${fmt.formatNumber(result.scenarios.base.customers)}`);
      console.log(`  乐观情景:       收入 ${fmt.formatCurrency(result.scenarios.optimistic.revenue)} | EBITDA ${fmt.formatCurrency(result.scenarios.optimistic.ebitda)} | 客户 ${fmt.formatNumber(result.scenarios.optimistic.customers)}`);

      // 单位经济学健康度
      console.log(fmt.colorize('\n【单位经济学健康度】', 'yellow'));
      const ltvCacRatio = result.unitEconomics.ltvCacRatio;
      if (ltvCacRatio >= 3) {
        console.log(`  LTV/CAC: ${fmt.colorize(fmt.formatMultiple(ltvCacRatio), 'green')} (健康: >3x)`);
      } else if (ltvCacRatio >= 1.5) {
        console.log(`  LTV/CAC: ${fmt.colorize(fmt.formatMultiple(ltvCacRatio), 'yellow')} (尚可: 1.5-3x)`);
      } else {
        console.log(`  LTV/CAC: ${fmt.colorize(fmt.formatMultiple(ltvCacRatio), 'red')} (不健康: <1.5x)`);
      }

      const payback = result.unitEconomics.paybackPeriod;
      if (payback <= 12) {
        console.log(`  回本周期: ${fmt.colorize(payback.toFixed(1) + '个月', 'green')} (健康: <12个月)`);
      } else if (payback <= 18) {
        console.log(`  回本周期: ${fmt.colorize(payback.toFixed(1) + '个月', 'yellow')} (尚可: 12-18个月)`);
      } else {
        console.log(`  回本周期: ${fmt.colorize(payback.toFixed(1) + '个月', 'red')} (偏慢: >18个月)`);
      }

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
