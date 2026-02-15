#!/usr/bin/env node

import { Command } from 'commander';
import {
  fcfCommand,
  dcfCommand,
  lboCommand,
  compsCommand,
  precedentCommand,
  ipoCommand,
  creditCommand,
  sotpCommand,
  operatingCommand,
  sensitivityCommand,
  maCommand,
  icMemoCommand,
  threeStatementCommand,
} from './commands/index.js';

const program = new Command();

program
  .name('evm')
  .description('股票估值模型命令行工具 - 12种投行级估值模型')
  .version('1.0.0');

// 添加所有命令
program.addCommand(fcfCommand);
program.addCommand(dcfCommand);
program.addCommand(lboCommand);
program.addCommand(compsCommand);
program.addCommand(precedentCommand);
program.addCommand(ipoCommand);
program.addCommand(creditCommand);
program.addCommand(sotpCommand);
program.addCommand(operatingCommand);
program.addCommand(sensitivityCommand);
program.addCommand(maCommand);
program.addCommand(icMemoCommand);
program.addCommand(threeStatementCommand);

// 帮助信息增强
program.on('--help', () => {
  console.log('');
  console.log('示例:');
  console.log('  $ evm fcf AAPL                    # 自由现金流分析');
  console.log('  $ evm dcf TSLA --wacc 0.12        # DCF估值，指定WACC');
  console.log('  $ evm lbo AMZN --premium 0.25     # LBO分析，指定溢价');
  console.log('  $ evm comps MSFT                  # 可比公司分析');
  console.log('  $ evm ma AAPL TSLA                # M&A增益/稀释分析');
  console.log('');
  console.log('模型列表:');
  console.log('  fcf         自由现金流分析');
  console.log('  dcf         DCF估值模型');
  console.log('  lbo         杠杆收购模型');
  console.log('  comps       可比公司分析');
  console.log('  precedent   先例交易分析');
  console.log('  ipo         IPO估值与定价');
  console.log('  credit      信用分析与债务容量');
  console.log('  sotp        部分之和估值');
  console.log('  operating   运营模型与单位经济学');
  console.log('  sensitivity 敏感性与情景分析');
  console.log('  ma          M&A增益/稀释分析');
  console.log('  ic-memo     投资委员会备忘录');
  console.log('  3s          三报表财务模型');
});

program.parse();
