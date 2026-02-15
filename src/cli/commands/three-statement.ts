import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { ThreeStatementModel } from '../../models/three-statement.js';
import * as fmt from '../../utils/format.js';

export const threeStatementCommand = new Command('3s')
  .description('三报表财务模型 (Three-Statement Model)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('-y, --years <number>', '预测年数', '5')
  .action(async (symbol: string, options) => {
    try {
      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  三报表财务模型 - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new ThreeStatementModel(data, {
        projectionYears: parseInt(options.years),
      });

      const result = model.project();

      // 利润表
      console.log(fmt.colorize('\n【预测利润表】', 'yellow'));
      const incomeRows = result.incomeStatements.map(i => [
        `第${i.year}年`,
        fmt.formatCurrency(i.revenue),
        fmt.formatCurrency(i.grossProfit),
        fmt.formatPercent(i.grossMargin),
        fmt.formatCurrency(i.operatingIncome),
        fmt.formatPercent(i.operatingMargin),
        fmt.formatCurrency(i.netIncome),
        fmt.formatPercent(i.netMargin),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', '收入', '毛利', '毛利率', '经营利润', '经营利润率', '净利润', '净利率'],
        incomeRows
      ));

      // 资产负债表
      console.log(fmt.colorize('\n【预测资产负债表 (关键项目)】', 'yellow'));
      const balanceRows = result.balanceSheets.map(b => [
        `第${b.year}年`,
        fmt.formatCurrency(b.cash),
        fmt.formatCurrency(b.totalCurrentAssets),
        fmt.formatCurrency(b.totalAssets),
        fmt.formatCurrency(b.totalDebt),
        fmt.formatCurrency(b.equity),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', '现金', '流动资产', '总资产', '总债务', '股东权益'],
        balanceRows
      ));

      // 现金流量表
      console.log(fmt.colorize('\n【预测现金流量表】', 'yellow'));
      const cfRows = result.cashFlowStatements.map(c => [
        `第${c.year}年`,
        fmt.formatCurrency(c.operatingCashFlow),
        fmt.formatCurrency(c.capex),
        fmt.formatCurrency(c.investingCashFlow),
        fmt.formatCurrency(c.financingCashFlow),
        fmt.formatCurrency(c.netChangeInCash),
        fmt.formatCurrency(c.endingCash),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', '经营现金流', '资本支出', '投资现金流', '融资现金流', '现金变动', '期末现金'],
        cfRows
      ));

      // 关键财务指标
      console.log(fmt.colorize('\n【关键财务指标】', 'yellow'));
      const lastBalance = result.balanceSheets[result.balanceSheets.length - 1];
      const lastIncome = result.incomeStatements[result.incomeStatements.length - 1];
      const lastCF = result.cashFlowStatements[result.cashFlowStatements.length - 1];

      console.log(`  资产周转率:     ${fmt.formatMultiple(lastIncome.revenue / lastBalance.totalAssets)}`);
      console.log(`  权益回报率:     ${fmt.formatPercent(lastIncome.netIncome / lastBalance.equity)}`);
      console.log(`  FCF/净利润:     ${fmt.formatMultiple(lastCF.operatingCashFlow / lastIncome.netIncome)}`);

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
