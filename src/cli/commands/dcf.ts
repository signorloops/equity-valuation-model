import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { DCFModel } from '../../models/dcf.js';
import * as fmt from '../../utils/format.js';

export const dcfCommand = new Command('dcf')
  .description('DCF估值模型 (Discounted Cash Flow)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('-t, --terminal <number>', '终值增长率 (如: 0.025)', '0.025')
  .option('-w, --wacc <number>', 'WACC (如: 0.10)', '0.10')
  .option('-g, --growth <numbers>', '收入增长预测，逗号分隔 (如: 0.15,0.12,0.10,0.08,0.06)')
  .option('--json', '输出JSON格式结果')
  .action(async (symbol: string, options: { terminal: string; wacc: string; growth?: string; json?: boolean }) => {
    try {
      const data = await yahooFinanceClient.getCompanyData(symbol);

      const growthRates = options.growth
        ? options.growth.split(',').map((g: string) => parseFloat(g.trim()))
        : undefined;

      const model = new DCFModel(data, {
        terminalGrowth: parseFloat(options.terminal),
        wacc: parseFloat(options.wacc),
        revenueGrowth: growthRates,
      });

      const result = model.calculate();

      // JSON 输出模式
      if (options.json) {
        const jsonOutput = {
          model: 'DCF',
          impliedPrice: result.impliedSharePrice,
          currentPrice: result.currentPrice,
          upside: result.upside,
          enterpriseValue: result.enterpriseValue,
          equityValue: result.equityValue,
          wacc: result.assumptions.wacc,
          terminalGrowth: result.assumptions.terminalGrowth,
        };
        console.log(JSON.stringify(jsonOutput));
        return;
      }

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  DCF估值模型 - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      // 假设
      console.log(fmt.colorize('\n【估值假设】', 'yellow'));
      console.log(`  WACC:           ${fmt.formatPercent(result.assumptions.wacc)}`);
      console.log(`  终值增长率:     ${fmt.formatPercent(result.assumptions.terminalGrowth)}`);
      console.log(`  税率:           ${fmt.formatPercent(result.assumptions.taxRate)}`);

      // 预测
      console.log(fmt.colorize('\n【自由现金流预测】', 'yellow'));
      const projectionRows = result.projections.map(p => [
        `第${p.year}年`,
        fmt.formatCurrency(p.revenue),
        fmt.formatCurrency(p.ebitda),
        fmt.formatCurrency(p.nopat),
        fmt.formatCurrency(p.fcf),
        fmt.formatCurrency(p.presentValue),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', '收入', 'EBITDA', 'NOPAT', 'FCF', '现值'],
        projectionRows
      ));

      // 估值结果
      console.log(fmt.colorize('\n【估值结果】', 'yellow'));
      console.log(`  预测期现值:     ${fmt.formatCurrency(result.projections.reduce((s, p) => s + p.presentValue, 0))}`);
      console.log(`  终值:           ${fmt.formatCurrency(result.terminalValue)}`);
      console.log(`  终值现值:       ${fmt.formatCurrency(result.terminalValue / Math.pow(1 + result.assumptions.wacc, 5))}`);
      console.log(`  企业价值:       ${fmt.bold(fmt.formatCurrency(result.enterpriseValue))}`);
      console.log(`  净债务:         ${fmt.formatCurrency(result.netDebt)}`);
      console.log(`  股权价值:       ${fmt.bold(fmt.formatCurrency(result.equityValue))}`);

      console.log(fmt.colorize('\n【每股价值分析】', 'yellow'));
      console.log(`  隐含股价:       ${fmt.bold(fmt.formatPrice(result.impliedSharePrice))}`);
      console.log(`  当前股价:       ${fmt.formatPrice(result.currentPrice)}`);
      console.log(`  上涨空间:       ${result.upside >= 0 ? fmt.colorize(fmt.formatPercent(result.upside), 'green') : fmt.colorize(fmt.formatPercent(result.upside), 'red')}`);

      // 敏感性分析
      console.log(fmt.colorize('\n【敏感性分析 (股价 vs WACC vs 终值增长率)】', 'yellow'));
      const waccRange = [0.08, 0.09, 0.10, 0.11, 0.12];
      const growthRange = [0.01, 0.02, 0.025, 0.03, 0.04];
      const sensitivity = model.sensitivityAnalysis(waccRange, growthRange);

      const sensRows = sensitivity.map((row, i) => [
        fmt.formatPercent(waccRange[i], 0),
        ...row.map(v => fmt.formatPrice(v)),
      ]);
      console.log(fmt.createMarkdownTable(
        ['WACC \\ g', ...growthRange.map(g => fmt.formatPercent(g, 1))],
        sensRows
      ));

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
