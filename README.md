# Equity Valuation Model (EVM)

股票估值模型命令行工具 - 12种投行级估值模型

## 功能特性

该工具实现了以下12种专业金融估值模型：

| 命令 | 模型 | 描述 |
|------|------|------|
| `fcf` | 自由现金流分析 | FCF计算、利润率分析、5年预测 |
| `dcf` | DCF估值模型 | 现金流折现、WACC计算、敏感性分析 |
| `lbo` | 杠杆收购模型 | IRR/MOIC计算、债务结构、退出分析 |
| `comps` | 可比公司分析 | Trading multiples、估值区间 |
| `precedent` | 先例交易分析 | 控制权溢价、交易倍数 |
| `ipo` | IPO估值与定价 | 发行结构、定价区间、首日涨幅预期 |
| `credit` | 信用分析 | 债务容量、契约测试、定价网格 |
| `sotp` | 部分之和估值 | 分部估值、情景分析 |
| `operating` | 运营模型 | 单位经济学、LTV/CAC、盈亏平衡 |
| `sensitivity` | 敏感性分析 | 龙卷风图、情景分析 |
| `ma` | M&A增益/稀释 | EPS影响、协同效应、信用影响 |
| `ic-memo` | 投资委员会备忘录 | 完整IC文档生成 |
| `3s` | 三报表模型 | 利润表/资产负债表/现金流量表 |

## 安装

```bash
npm install
npm run build
npm link  # 全局安装 evm 命令
```

## 使用方法

```bash
# 自由现金流分析
evm fcf AAPL

# DCF估值
evm dcf TSLA --wacc 0.10 --terminal 0.025

# LBO分析
evm lbo AMZN --premium 0.30 --exit 12

# 可比公司分析
evm comps MSFT

# M&A分析
evm ma AAPL TSLA --premium 0.25

# 获取帮助
evm --help
evm dcf --help
```

## 输出格式

所有模型输出 Markdown 格式的分析报告，包含：
- 财务数据表格
- 关键指标高亮
- 颜色编码的上涨/下跌空间
- 敏感性分析矩阵

## 技术栈

- TypeScript
- Node.js
- Commander.js (CLI框架)
- Yahoo Finance API (数据获取)

## 数据源说明

本工具使用 **Yahoo Finance API** 获取数据：

- ✅ **实时数据**：股价、市值、市盈率、52周高低等
- ✅ **公司信息**：公司名称、行业、部门、股本、Beta值
- ⚠️ **财务报表**：由于 Yahoo Finance 于 2024年11月停止了财务报表历史数据API，财报数据使用基于真实市值估算的合理数值

估值分析基于真实市值和行业标准财务比率生成，适合用于估值方法论学习和快速分析。

## 免责声明

本工具仅供教育和研究目的使用，不构成投资建议。数据来源于 Yahoo Finance，可能存在延迟或不准确。投资有风险，决策需谨慎。

## License

MIT
