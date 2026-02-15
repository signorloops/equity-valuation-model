import { Command } from 'commander';
import { yahooFinanceClient } from '../../data/yahoo-finance.js';
import { ICMemoModel } from '../../models/ic-memo.js';
import * as fmt from '../../utils/format.js';

export const icMemoCommand = new Command('ic-memo')
  .description('投资委员会备忘录 (Investment Committee Memo)')
  .argument('<symbol>', '股票代码 (如: AAPL)')
  .option('-t, --type <type>', '交易类型 (buyout/growth/venture/public)', 'buyout')
  .option('-a, --action <action>', '建议 (invest/pass/watch)', 'invest')
  .action(async (symbol: string, options) => {
    try {
      console.log(fmt.colorize(`\n${fmt.createSeparator('=')}`, 'cyan'));
      console.log(fmt.colorize(`  投资委员会备忘录 (IC Memo)`, 'bright'));
      console.log(fmt.colorize(`  ${symbol.toUpperCase()}`, 'bright'));
      console.log(fmt.colorize(fmt.createSeparator('='), 'cyan'));

      const data = await yahooFinanceClient.getCompanyData(symbol);
      const model = new ICMemoModel(data, {
        dealType: options.type,
        recommendedAction: options.action,
      });

      const result = model.generate();

      // 执行摘要
      console.log(fmt.colorize('\n【执行摘要】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      console.log(result.executiveSummary.investmentThesis);
      console.log(`\n预期回报: ${result.executiveSummary.expectedReturns}`);
      console.log(`\n关键风险: ${result.executiveSummary.keyRisks}`);

      // 交易概览
      console.log(fmt.colorize('\n【交易概览】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      console.log(`  交易类型:       ${result.dealOverview.type}`);
      console.log(`  交易规模:       ${fmt.formatCurrency(result.dealOverview.size)}`);
      console.log(`  交易结构:       ${result.dealOverview.structure}`);
      console.log(`  时间线:         ${result.dealOverview.timeline}`);
      console.log(`  资金用途:       ${result.dealOverview.useOfProceeds}`);

      // 公司分析
      console.log(fmt.colorize('\n【公司分析】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      console.log(`  商业模式:       ${result.companyAnalysis.businessModel}`);
      console.log(`  竞争地位:       ${result.companyAnalysis.competitivePosition}`);
      console.log(`  财务表现:       ${result.companyAnalysis.financialPerformance}`);
      console.log(`  管理团队:       ${result.companyAnalysis.managementTeam}`);

      // 行业分析
      console.log(fmt.colorize('\n【行业分析】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      console.log(`  市场规模:       ${result.industryAnalysis.marketSize}`);
      console.log(`  增长率:         ${result.industryAnalysis.growthRate}`);
      console.log(`  行业趋势:`);
      result.industryAnalysis.trends.forEach(trend => {
        console.log(`    • ${trend}`);
      });
      console.log(`  竞争格局:       ${result.industryAnalysis.competitiveDynamics}`);

      // 投资论点
      console.log(fmt.colorize('\n【投资论点】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      console.log('核心要点:');
      result.investmentThesis.points.forEach((point, i) => {
        console.log(`  ${i + 1}. ${point}`);
      });
      console.log('\n关键驱动因素:');
      result.investmentThesis.keyDrivers.forEach(driver => {
        console.log(`  • ${driver}`);
      });
      console.log('\n催化剂:');
      result.investmentThesis.catalysts.forEach(catalyst => {
        console.log(`  • ${catalyst}`);
      });

      // 估值
      console.log(fmt.colorize('\n【估值分析】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      console.log('估值方法:');
      result.valuation.methodologies.forEach(m => {
        console.log(`  ${m.name}: ${fmt.formatPrice(m.value)} (权重 ${fmt.formatPercent(m.weight)})`);
      });
      console.log(`\n加权平均估值:     ${fmt.bold(fmt.formatPrice(result.valuation.weightedValue))}`);
      console.log(`估值区间:         ${fmt.formatPrice(result.valuation.range.low)} - ${fmt.formatPrice(result.valuation.range.high)}`);

      // 回报分析
      console.log(fmt.colorize('\n【回报分析】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      console.log(`  预期IRR:        ${fmt.bold(fmt.formatPercent(result.returns.irr))}`);
      console.log(`  MOIC:           ${fmt.bold(fmt.formatMultiple(result.returns.moic))}`);
      console.log(`  回收期:         ${result.returns.paybackPeriod} 年`);
      console.log('\n退出情景:');
      result.returns.exitScenarios.forEach(s => {
        console.log(`  ${s.scenario}: 第${s.year}年, ${fmt.formatMultiple(s.multiple)}x, ${fmt.formatCurrency(s.proceeds)}`);
      });

      // 风险分析
      console.log(fmt.colorize('\n【风险评估】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      const riskRows = result.risks.map(r => [
        r.category,
        r.description.substring(0, 30) + '...',
        r.likelihood,
        r.impact,
        r.mitigation.substring(0, 20) + '...',
      ]);
      console.log(fmt.createMarkdownTable(
        ['风险类别', '描述', '可能性', '影响', '缓解措施'],
        riskRows
      ));

      // 投资建议
      console.log(fmt.colorize('\n【投资建议】', 'yellow'));
      console.log(fmt.createSeparator('-'));
      const actionColor = result.recommendation.action === 'invest' ? 'green' : result.recommendation.action === 'pass' ? 'red' : 'yellow';
      console.log(`  建议:           ${fmt.colorize(result.recommendation.action.toUpperCase(), actionColor)}`);
      console.log(`  理由:           ${result.recommendation.reasoning}`);

      if (result.recommendation.conditions.length > 0) {
        console.log('\n前提条件:');
        result.recommendation.conditions.forEach(c => {
          console.log(`  □ ${c}`);
        });
      }

      if (result.recommendation.nextSteps.length > 0) {
        console.log('\n下一步:');
        result.recommendation.nextSteps.forEach((step, i) => {
          console.log(`  ${i + 1}. ${step}`);
        });
      }

      console.log(fmt.colorize(`\n${fmt.createSeparator('=')}`, 'cyan'));
    } catch (error) {
      console.error(fmt.colorize(`错误: ${error}`, 'red'));
      process.exit(1);
    }
  });
