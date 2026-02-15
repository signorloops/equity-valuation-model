# 智能估值模型选择指南

## 快速决策矩阵

### Step 1: 判断公司类型

```
公司是否盈利？
├── 否（亏损）→ Operating Model + Comps (EV/Revenue)
│   └── SaaS/订阅？→ 重点看 Operating (LTV/CAC)
│   └── 初创科技？→ Comps (P/S倍数)
│
└── 是（盈利）→ 继续 Step 2
```

### Step 2: 判断行业特性

```
行业类型？
├── 科技/成长 → DCF (高增长率) + Comps
├── 金融/银行 → Comps (P/B) + Credit
├── 制造业 → Comps (P/E) + DCF
├── 多元化集团 → SOTP (分部估值)
├── 房地产 → SOTP + Comps
└── 公用事业 → DCF (稳定股息) + Credit
```

### Step 3: 判断投资目的

```
投资场景？
├── 长期投资 → DCF + Sensitivity
├── 相对价值 → Comps + Precedent
├── 并购评估 → LBO + M&A
├── 风险分析 → Sensitivity + Credit
└── IPO分析 → IPO + Comps
```

## 行业-模型匹配表

| 股票代码 | 公司 | 行业 | 推荐模型 | 理由 |
|---------|------|------|---------|------|
| NVDA | 英伟达 | 科技/AI芯片 | DCF + Comps | 高增长但需看同业估值 |
| TSLA | 特斯拉 | 电动车/成长 | DCF + Comps + Operating | 兼具科技和制造业特性 |
| AAPL | 苹果 | 科技/成熟 | DCF + Comps + LBO | 现金流稳定，适合杠杆 |
| MSFT | 微软 | 科技/SaaS | DCF + Operating + Comps | 云业务用Operating分析 |
| SNOW | Snowflake | SaaS | **Operating** + Comps | 订阅模式，看单位经济学 |
| JPM | 摩根大通 | 银行 | Comps + Credit | 用P/B和资本充足率 |
| AMZN | 亚马逊 | 电商/云 | SOTP + DCF | 业务多元化需分部估值 |
| KO | 可口可乐 | 消费/成熟 | DCF + Comps | 稳定现金流，股息模型 |
| XOM | 埃克森美孚 | 能源/周期 | Comps + DCF | 商品价格影响大 |
| PLD | Prologis | REITs | SOTP + Comps | 房地产净资产估值 |

## 具体选择逻辑

### 1️⃣ 为什么科技股用 DCF + Comps？

**DCF**：科技股价值主要来自未来增长，DCF能反映增长预期
**Comps**：科技股估值波动大，需要同业对比验证

示例：
```bash
# NVDA 估值
$ evm dcf NVDA -g 0.20,0.18,0.15,0.12,0.10  # 高增长假设
$ evm comps NVDA                              # 与AMD、INTC比较
```

### 2️⃣ 为什么SaaS公司用 Operating Model？

**关键指标**：
- LTV（客户生命周期价值）
- CAC（获客成本）
- LTV/CAC 比率（健康度）
- 月流失率

示例：
```bash
# Salesforce 估值
$ evm operating CRM --cac 1000 --arpu 200
```

### 3️⃣ 为什么多元化公司用 SOTP？

**原理**：不同业务板块适用不同估值方法

示例：
```bash
# Amazon = 电商 + AWS + 广告
$ evm sotp AMZN  # 分别估值各部分后加总
```

### 4️⃣ 为什么银行股不用 DCF？

**原因**：
- 银行现金流难以预测（受监管影响大）
- 资产质量比现金流更重要
- 用 P/B（市净率）更准确

示例：
```bash
# 摩根大通估值
$ evm comps JPM  # 看P/B、P/E、ROE
$ evm credit JPM # 看资本充足率
```

### 5️⃣ 为什么并购用 LBO + M&A？

**LBO**：测试财务买家能出多少钱
**M&A**：测试战略买家溢价能力

示例：
```bash
# 微软收购动视暴雪分析
$ evm lbo ATVI --premium 0.30  # 私募视角
$ evm ma MSFT ATVI --premium 0.30  # 战略协同
```

## 智能选择脚本

创建一个自动化选择脚本：

```bash
#!/bin/bash
# smart-valuate.sh

SYMBOL=$1
INDUSTRY=$2

# 根据行业自动选择模型
case $INDUSTRY in
  "tech"|"technology")
    echo "🖥️  科技行业: DCF + Comps"
    evm dcf $SYMBOL
    evm comps $SYMBOL
    ;;
  "saas"|"software")
    echo "☁️  SaaS行业: Operating + DCF"
    evm operating $SYMBOL
    evm dcf $SYMBOL
    ;;
  "bank"|"financial")
    echo "🏦 金融行业: Comps + Credit"
    evm comps $SYMBOL
    evm credit $SYMBOL
    ;;
  "reit"|"real-estate")
    echo "🏢 房地产: SOTP + Comps"
    evm sotp $SYMBOL
    evm comps $SYMBOL
    ;;
  "conglomerate")
    echo "🏭 多元化集团: SOTP"
    evm sotp $SYMBOL
    ;;
  "auto"|"automotive")
    echo "🚗 汽车行业: DCF + Comps + LBO"
    evm dcf $SYMBOL
    evm comps $SYMBOL
    evm lbo $SYMBOL
    ;;
  *)
    echo "📊 通用估值: DCF + Comps"
    evm dcf $SYMBOL
    evm comps $SYMBOL
    ;;
esac
```

使用方法：
```bash
chmod +x smart-valuate.sh
./smart-valuate.sh NVDA tech
./smart-valuate.sh JPM bank
./smart-valuate.sh AMZN conglomerate
```

## 常见错误

❌ **错误**: 对亏损公司用 DCF
✅ **正确**: 用 Operating 或 Comps

❌ **错误**: 对银行用 DCF
✅ **正确**: 用 Comps (P/B)

❌ **错误**: 对初创公司用 LBO
✅ **正确**: LBO需要稳定现金流

❌ **错误**: 只看一个模型
✅ **正确**: 至少用2-3个模型交叉验证
