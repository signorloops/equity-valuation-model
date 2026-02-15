import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { LBOModel } from '../../models/lbo.js';
import * as fmt from '../../utils/format.js';

export const lboCommand = new Command('lbo')
  .description('杠杆收购模型 (Leveraged Buyout)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('-p, --price <number>', '收购价格/股', undefined)
  .option('-r, --premium <number>', '收购溢价 (如: 0.30)', '0.30')
  .option('-e, --exit <number>', '退出倍数 (如: 10)', '10')
  .option('-y, --years <number>', '持有年限', '5')
  .option('--json', '输出JSON格式结果')
  .action(async (symbol: string, options: { price?: string; premium: string; exit: string; years: string; json?: boolean }) => {
    try {
      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new LBOModel(data, {
        purchasePrice: options.price ? parseFloat(options.price) : undefined,
        premium: isNaN(parseFloat(options.premium)) ? undefined : parseFloat(options.premium),
        exitMultiple: isNaN(parseFloat(options.exit)) ? undefined : parseFloat(options.exit),
        holdingPeriod: isNaN(parseInt(options.years)) ? undefined : parseInt(options.years),
      });

      const result = model.calculate();

      // JSON 输出模式
      if (options.json) {
        const jsonOutput = {
          model: 'LBO',
          purchasePrice: result.entry.purchasePrice,
          currentPrice: data.stockPrice.current,
          premium: result.entry.premium,
          irr: result.returns.irr,
          moic: result.returns.moic,
          exitMultiple: result.exit.exitMultiple,
        };
        console.log(JSON.stringify(jsonOutput));
        return;
      }

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  LBO杠杆收购模型 - ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      // 交易结构
      console.log(fmt.colorize('\n【交易结构】', 'yellow'));
      console.log(`  当前股价:       ${fmt.formatPrice(data.stockPrice.current)}`);
      console.log(`  收购价格:       ${fmt.formatPrice(result.entry.purchasePrice)}`);
      console.log(`  溢价:           ${fmt.formatPercent(result.entry.premium)}`);
      console.log(`  企业价值:       ${fmt.formatCurrency(result.entry.enterpriseValue)}`);
      console.log(`  股权出资:       ${fmt.formatCurrency(result.entry.equityContribution)} (${fmt.formatPercent(result.entry.equityContribution / result.entry.enterpriseValue)})`);
      console.log(`  债务融资:       ${fmt.formatCurrency(result.entry.debtFinancing)} (${fmt.formatPercent(result.entry.debtFinancing / result.entry.enterpriseValue)})`);

      // 债务结构
      console.log(fmt.colorize('\n【债务结构】', 'yellow'));
      console.log(`  优先级债务:     ${fmt.formatCurrency(result.debt.seniorDebt)}`);
      console.log(`  次级债务:       ${fmt.formatCurrency(result.debt.mezzanineDebt)}`);
      console.log(`  总债务:         ${fmt.formatCurrency(result.debt.totalDebt)}`);
      console.log(`  利率:           ${fmt.formatPercent(result.debt.interestRate)}`);
      console.log(`  年利息支出:     ${fmt.formatCurrency(result.debt.annualInterest)}`);

      // 财务预测
      console.log(fmt.colorize('\n【持有期财务预测】', 'yellow'));
      const projRows = result.projections.map(p => [
        p.year.toString(),
        fmt.formatCurrency(p.revenue),
        fmt.formatCurrency(p.ebitda),
        fmt.formatCurrency(p.freeCashFlow),
        fmt.formatCurrency(p.debtRepayment),
        fmt.formatCurrency(p.endingDebt),
      ]);
      console.log(fmt.createMarkdownTable(
        ['年份', '收入', 'EBITDA', 'FCF', '债务偿还', '剩余债务'],
        projRows
      ));

      // 退出分析
      console.log(fmt.colorize('\n【退出分析】', 'yellow'));
      console.log(`  退出年份:       第${result.exit.exitYear}年`);
      console.log(`  退出EBITDA:     ${fmt.formatCurrency(result.exit.exitEBITDA)}`);
      console.log(`  退出倍数:       ${fmt.formatMultiple(result.exit.exitMultiple)}`);
      console.log(`  退出企业价值:   ${fmt.formatCurrency(result.exit.exitEV)}`);
      console.log(`  退出时净债务:   ${fmt.formatCurrency(result.exit.netDebt)}`);
      console.log(`  退出股权价值:   ${fmt.formatCurrency(result.exit.equityValue)}`);

      // 回报分析
      console.log(fmt.colorize('\n【投资回报】', 'yellow'));
      console.log(`  IRR:            ${fmt.bold(fmt.formatPercent(result.returns.irr))}`);
      console.log(`  MOIC:           ${fmt.bold(fmt.formatMultiple(result.returns.moic))}`);
      console.log(`  毛利润:         ${fmt.formatCurrency(result.returns.grossProfit)}`);

      // 回报基准
      console.log(fmt.colorize('\n【回报基准对比】', 'dim'));
      console.log('  IRR > 20%:      优秀');
      console.log('  IRR 15-20%:     良好');
      console.log('  IRR 10-15%:     一般');
      console.log('  IRR < 10%:      较差');

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
