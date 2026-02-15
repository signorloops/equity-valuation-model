import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { MAModel } from '../../models/ma.js';
import * as fmt from '../../utils/format.js';

export const maCommand = new Command('ma')
  .description('并购增益/稀释分析 (M&A Accretion/Dilution)')
  .argument('<acquirer>', '收购方股票代码')
  .argument('<target>', '目标公司股票代码')
  .option('-p, --premium <number>', '收购溢价 (如: 0.30)', '0.30')
  .option('-c, --cash <number>', '现金比例 (如: 0.40)', '0.40')
  .option('-s, --stock <number>', '股票比例 (如: 0.40)', '0.40')
  .option('-d, --debt <number>', '债务比例 (如: 0.20)', '0.20')
  .action(async (acquirerSymbol: string, targetSymbol: string, options) => {
    try {
      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
      console.log(fmt.colorize(`  M&A 并购增益/稀释分析`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator(), 'cyan'));

      const [acquirer, target] = await Promise.all([
        yahooFinanceClient.getCompanyData(acquirerSymbol),
        yahooFinanceClient.getCompanyData(targetSymbol),
      ]);

      const model = new MAModel(acquirer, target, {
        premium: parseFloat(options.premium),
        cashPercent: parseFloat(options.cash),
        stockPercent: parseFloat(options.stock),
        debtPercent: parseFloat(options.debt),
      });

      const result = model.analyze();

      // 交易概览
      console.log(fmt.colorize('\n【交易概览】', 'yellow'));
      console.log(`  收购方:         ${acquirer.profile.name} (${acquirerSymbol.toUpperCase()})`);
      console.log(`  目标公司:       ${target.profile.name} (${targetSymbol.toUpperCase()})`);
      console.log(`  当前股价:       ${fmt.formatPrice(target.stockPrice.current)}`);
      console.log(`  收购溢价:       ${fmt.formatPercent(result.deal.premium)}`);
      console.log(`  收购价格:       ${fmt.formatPrice(result.deal.offerPrice)}`);
      console.log(`  总对价:         ${fmt.formatCurrency(result.deal.totalConsideration)}`);

      // 支付结构
      console.log(fmt.colorize('\n【支付结构】', 'yellow'));
      console.log(`  现金:           ${fmt.formatCurrency(result.deal.cashComponent)} (${fmt.formatPercent(result.deal.cashComponent / result.deal.totalConsideration)})`);
      console.log(`  股票:           ${fmt.formatCurrency(result.deal.stockComponent)} (${fmt.formatPercent(result.deal.stockComponent / result.deal.totalConsideration)})`);
      console.log(`  债务:           ${fmt.formatCurrency(result.deal.debtComponent)} (${fmt.formatPercent(result.deal.debtComponent / result.deal.totalConsideration)})`);
      console.log(`  新股发行:       ${fmt.formatNumber(result.deal.sharesIssued)} 股`);

      // EPS 影响
      console.log(fmt.colorize('\n【EPS 影响分析】', 'yellow'));
      console.log(`  收购方独立EPS:  ${fmt.formatPrice(result.acquirerStandalone.eps)}`);
      console.log(`  备考EPS:        ${fmt.formatPrice(result.proForma.eps)}`);
      const impactColor = result.accretionDilution.isAccretive ? 'green' : 'red';
      const impactText = result.accretionDilution.isAccretive ? '增益' : '稀释';
      console.log(`  EPS ${impactText}:       ${fmt.colorize(fmt.formatPrice(result.accretionDilution.epsImpact), impactColor)} (${fmt.colorize(fmt.formatPercent(result.accretionDilution.percentChange), impactColor)})`);

      // 协同效应
      console.log(fmt.colorize('\n【协同效应】', 'yellow'));
      console.log(`  成本协同:       ${fmt.formatCurrency(result.synergies.costSynergies)}`);
      console.log(`  收入协同:       ${fmt.formatCurrency(result.synergies.revenueSynergies)}`);
      console.log(`  税前总协同:     ${fmt.formatCurrency(result.synergies.totalPretax)}`);
      console.log(`  税后协同:       ${fmt.formatCurrency(result.synergies.afterTax)}`);
      console.log(`  协同EPS贡献:    ${fmt.formatPrice(result.synergies.epsAccretion)}`);

      // 信用影响
      console.log(fmt.colorize('\n【信用影响】', 'yellow'));
      console.log(`  收购方EBITDA:   ${fmt.formatCurrency(result.creditMetrics.preDebtEbitda)}`);
      console.log(`  备考EBITDA:     ${fmt.formatCurrency(result.creditMetrics.postDebtEbitda)}`);
      console.log(`  交易前杠杆:     ${fmt.formatMultiple(result.creditMetrics.leveragePre)}`);
      console.log(`  交易后杠杆:     ${fmt.formatMultiple(result.creditMetrics.leveragePost)}`);

      // 盈亏平衡
      console.log(fmt.colorize('\n【盈亏平衡分析】', 'yellow'));
      console.log(`  所需协同效应:   ${fmt.formatCurrency(result.breakEven.requiredSynergies)}`);
      console.log(`  最大溢价空间:   ${fmt.formatPercent(result.breakEven.requiredPremium)}`);

      // 交易建议
      console.log(fmt.colorize('\n【交易评估】', 'yellow'));
      if (result.accretionDilution.isAccretive) {
        console.log(fmt.colorize('  ✓ 该交易为EPS增益型', 'green'));
      } else {
        console.log(fmt.colorize('  ✗ 该交易为EPS稀释型', 'red'));
        if (result.synergies.epsAccretion > Math.abs(result.accretionDilution.epsImpact)) {
          console.log(fmt.colorize('  ⚠ 考虑协同效应后可转为增益', 'yellow'));
        }
      }

      if (result.creditMetrics.leveragePost > 4) {
        console.log(fmt.colorize('  ⚠ 交易后杠杆率较高 (>4x)', 'yellow'));
      }

      console.log(fmt.colorize(`\n${fmt.createSeparator()}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
