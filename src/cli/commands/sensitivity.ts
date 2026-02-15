import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { SensitivityModel } from '../../models/sensitivity.js';
import * as fmt from '../../utils/format.js';

export const sensitivityCommand = new Command('sensitivity')
  .description('敏感性与情景分析 (Sensitivity & Scenario Analysis)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .action(async (symbol: string) => {
    try {
      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  敏感性与情景分析 - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new SensitivityModel(data);
      const result = model.analyze();

      // 基准情况
      console.log(fmt.colorize('\n【基准假设】', 'yellow'));
      console.log(`  收入增长率:     ${fmt.formatPercent(result.baseCase.variables.revenueGrowth)}`);
      console.log(`  利润率:         ${fmt.formatPercent(result.baseCase.variables.margin)}`);
      console.log(`  WACC:           ${fmt.formatPercent(result.baseCase.variables.wacc)}`);
      console.log(`  终值增长率:     ${fmt.formatPercent(result.baseCase.variables.terminalGrowth)}`);
      console.log(`  基准估值:       ${fmt.bold(fmt.formatPrice(result.baseCase.valuation))}`);

      // 单向敏感性
      console.log(fmt.colorize('\n【单向敏感性分析】', 'yellow'));
      for (const sens of result.oneWay) {
        console.log(`\n${sens.variable}:`);
        const rows = sens.values.map(v => [
          sens.variable === 'wacc' || sens.variable === 'terminalGrowth' ? fmt.formatPercent(v.input) : fmt.formatPercent(v.input),
          fmt.formatPrice(v.output),
          fmt.formatPercent((v.output - result.baseCase.valuation) / result.baseCase.valuation),
        ]);
        console.log(fmt.createMarkdownTable(
          ['假设值', '估值', '变化'],
          rows
        ));
      }

      // 二维敏感性
      console.log(fmt.colorize('\n【二维敏感性分析】', 'yellow'));
      for (const twoWay of result.twoWay) {
        console.log(`\n${twoWay.variable1} vs ${twoWay.variable2}:`);
        const headers = [twoWay.variable1, ...twoWay.colLabels.map(l => fmt.formatPercent(l, 1))];
        const rows = twoWay.matrix.map((row, i) => [
          fmt.formatPercent(twoWay.rowLabels[i], 1),
          ...row.map(v => fmt.formatPrice(v)),
        ]);
        console.log(fmt.createMarkdownTable(headers, rows));
      }

      // 情景分析
      console.log(fmt.colorize('\n【情景分析】', 'yellow'));
      const scenarioRows = result.scenarios.map(s => [
        s.name,
        fmt.formatPercent(s.assumptions.revenueGrowth),
        fmt.formatPercent(s.assumptions.wacc),
        fmt.formatPercent(s.assumptions.terminalGrowth),
        fmt.formatPrice(s.valuation),
        fmt.formatPercent(s.probability),
      ]);
      console.log(fmt.createMarkdownTable(
        ['情景', '收入增长率', 'WACC', '终值增长率', '估值', '概率'],
        scenarioRows
      ));

      // 概率加权估值
      const probabilityWeighted = result.scenarios.reduce((sum, s) => sum + s.valuation * s.probability, 0);
      console.log(`\n  概率加权估值:   ${fmt.bold(fmt.formatPrice(probabilityWeighted))}`);

      // 盈亏平衡分析
      console.log(fmt.colorize('\n【盈亏平衡分析】', 'yellow'));
      const breakevenRows = result.breakeven.map(b => [
        b.variable,
        fmt.formatPercent(b.currentValue),
        fmt.formatPercent(b.threshold),
        fmt.formatPercent(b.buffer),
      ]);
      console.log(fmt.createMarkdownTable(
        ['变量', '当前值', '盈亏平衡点', '安全边际'],
        breakevenRows
      ));

      // 龙卷风图数据
      console.log(fmt.colorize('\n【影响因子排序 (龙卷风分析)】', 'yellow'));
      const tornadoRows = result.tornado.map(t => [
        t.variable,
        fmt.formatPrice(t.low),
        fmt.formatPrice(t.base),
        fmt.formatPrice(t.high),
        fmt.formatPercent(t.impact),
      ]);
      console.log(fmt.createMarkdownTable(
        ['变量', '悲观', '基准', '乐观', '影响程度'],
        tornadoRows
      ));

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
