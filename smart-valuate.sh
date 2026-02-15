#!/bin/bash
# smart-valuate.sh - 智能估值模型选择脚本
# 根据行业自动选择最适合的估值模型组合

SYMBOL=$1
INDUSTRY=$2

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVM="node $SCRIPT_DIR/dist/cli/index.js"
DETECT="node $SCRIPT_DIR/detect-industry.js"

# 临时文件目录
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# 收集估值结果
DCF_RESULT=""
COMPS_RESULT=""
LBO_RESULT=""
SOTP_RESULT=""
FCF_RESULT=""

# 使用 Node.js 解析 JSON（更可靠）
parse_json() {
  local json="$1"
  local key="$2"
  if [ -z "$json" ]; then
    echo ""
    return
  fi
  node -e "try { const v = JSON.parse(process.argv[1]).$key; console.log(v === undefined ? '' : v); } catch { process.exit(0); }" "$json" 2>/dev/null
}

# 运行估值并收集JSON结果
run_valuation() {
  local model=$1
  local symbol=$2
  local extra_args=$3

  case $model in
    dcf)
      DCF_RESULT=$($EVM dcf $symbol $extra_args --json 2>/dev/null)
      ;;
    comps)
      COMPS_RESULT=$($EVM comps $symbol --json 2>/dev/null)
      ;;
    lbo)
      LBO_RESULT=$($EVM lbo $symbol --json 2>/dev/null)
      ;;
    sotp)
      SOTP_RESULT=$($EVM sotp $symbol --json 2>/dev/null)
      ;;
    fcf)
      FCF_RESULT=$($EVM fcf $symbol --json 2>/dev/null)
      ;;
  esac
}

# 生成汇总表格
generate_summary() {
  local symbol=$1

  echo ""
  echo "========================================"
  echo "  估值总结 - $symbol"
  echo "========================================"
  echo ""

  # 解析JSON结果 - 使用 Node.js 解析（更可靠）
  local dcf_price=$(parse_json "$DCF_RESULT" "impliedPrice")
  local dcf_current=$(parse_json "$DCF_RESULT" "currentPrice")
  local dcf_upside=$(parse_json "$DCF_RESULT" "upside")
  local dcf_wacc=$(parse_json "$DCF_RESULT" "wacc")

  local comps_price=$(parse_json "$COMPS_RESULT" "impliedPrice")
  local comps_current=$(parse_json "$COMPS_RESULT" "currentPrice")
  local comps_upside=$(parse_json "$COMPS_RESULT" "upside")
  local comps_multiple=$(parse_json "$COMPS_RESULT" "evEbitdaMultiple")

  local lbo_premium=$(parse_json "$LBO_RESULT" "premium")
  local lbo_irr=$(parse_json "$LBO_RESULT" "irr")
  local lbo_moic=$(parse_json "$LBO_RESULT" "moic")
  local lbo_current=$(parse_json "$LBO_RESULT" "currentPrice")

  local sotp_price=$(parse_json "$SOTP_RESULT" "impliedPrice")
  local sotp_upside=$(parse_json "$SOTP_RESULT" "upside")
  local sotp_segments=$(parse_json "$SOTP_RESULT" "segments")

  local fcf_yield=$(parse_json "$FCF_RESULT" "fcfYield")
  local fcf_margin=$(parse_json "$FCF_RESULT" "avgFCFMargin")
  local fcf_current=$(parse_json "$FCF_RESULT" "currentPrice")

  # 获取当前股价（从第一个有结果的模式中获取）
  local current_price="$dcf_current"
  if [ -z "$current_price" ]; then
    current_price="$comps_current"
  fi
  if [ -z "$current_price" ]; then
    current_price="$lbo_current"
  fi
  if [ -z "$current_price" ]; then
    current_price="$fcf_current"
  fi

  # 格式化价格显示
  format_price() {
    if [ -n "$1" ]; then
      printf "\$%.2f" "$1"
    else
      echo "-"
    fi
  }

  # 格式化百分比显示
  format_percent() {
    if [ -n "$1" ]; then
      local pct=$(echo "$1 * 100" | bc -l 2>/dev/null || echo "0")
      printf "%.1f%%" "$pct"
    else
      echo "-"
    fi
  }

  # 格式化倍数显示
  format_multiple() {
    if [ -n "$1" ]; then
      printf "%.1fx" "$1"
    else
      echo "-"
    fi
  }

  echo "【估值对比表】"
  printf "┌────────────┬──────────┬──────────┬──────────┬────────────┐\n"
  printf "│ %-10s │ %-8s │ %-8s │ %-8s │ %-10s │\n" "估值模型" "隐含股价" "当前股价" "上涨空间" "关键指标"
  printf "├────────────┼──────────┼──────────┼──────────┼────────────┤\n"

  # DCF行
  if [ -n "$dcf_price" ]; then
    printf "│ %-10s │ %-8s │ %-8s │ %-8s │ %-10s │\n" \
      "DCF" \
      "$(format_price $dcf_price)" \
      "$(format_price $current_price)" \
      "$(format_percent $dcf_upside)" \
      "WACC: $(format_percent $dcf_wacc)"
  fi

  # Comps行
  if [ -n "$comps_price" ]; then
    printf "│ %-10s │ %-8s │ %-8s │ %-8s │ %-10s │\n" \
      "Comps" \
      "$(format_price $comps_price)" \
      "$(format_price $current_price)" \
      "$(format_percent $comps_upside)" \
      "EV/EBITDA: $(format_multiple $comps_multiple)"
  fi

  # LBO行
  if [ -n "$lbo_irr" ]; then
    printf "│ %-10s │ %-8s │ %-8s │ %-8s │ %-10s │\n" \
      "LBO" \
      "-" \
      "$(format_price $current_price)" \
      "-" \
      "IRR: $(format_percent $lbo_irr)"
  fi

  # SOTP行
  if [ -n "$sotp_price" ]; then
    printf "│ %-10s │ %-8s │ %-8s │ %-8s │ %-10s │\n" \
      "SOTP" \
      "$(format_price $sotp_price)" \
      "$(format_price $current_price)" \
      "$(format_percent $sotp_upside)" \
      "${sotp_segments}分部"
  fi

  # FCF行
  if [ -n "$fcf_yield" ]; then
    printf "│ %-10s │ %-8s │ %-8s │ %-8s │ %-10s │\n" \
      "FCF" \
      "-" \
      "$(format_price $current_price)" \
      "-" \
      "Yield: $(format_percent $fcf_yield)"
  fi

  printf "└────────────┴──────────┴──────────┴──────────┴────────────┘\n"

  # 计算估值区间
  echo ""
  echo "【估值区间】"

  # 收集所有隐含价格
  local prices=""
  [ -n "$dcf_price" ] && prices="$prices $dcf_price"
  [ -n "$comps_price" ] && prices="$prices $comps_price"
  [ -n "$sotp_price" ] && prices="$prices $sotp_price"

  # 清理前导空格
  prices=$(echo "$prices" | sed 's/^ *//')

  if [ -n "$prices" ]; then
    # 计算最低、最高、平均
    local min_price=$(echo "$prices" | tr ' ' '\n' | grep -v '^$' | sort -n | head -1)
    local max_price=$(echo "$prices" | tr ' ' '\n' | grep -v '^$' | sort -n | tail -1)

    # 计算平均值
    local sum=0
    local count=0
    for p in $prices; do
      sum=$(echo "$sum + $p" | bc -l 2>/dev/null || echo "$sum")
      count=$((count + 1))
    done
    local avg_price=$(echo "scale=2; $sum / $count" | bc -l 2>/dev/null || echo "0")

    # 计算中位数
    local median_price=$(echo "$prices" | tr ' ' '\n' | sort -n | awk '{a[NR]=$1} END {if (NR%2==1) print a[int(NR/2)+1]; else print (a[NR/2]+a[NR/2+1])/2}')

    printf "  最低:   %s\n" "$(format_price $min_price)"
    printf "  最高:   %s\n" "$(format_price $max_price)"
    printf "  平均:   %s\n" "$(format_price $avg_price)"
    printf "  中位数: %s\n" "$(format_price $median_price)"

    # 投资建议
    if [ -n "$current_price" ] && [ "$current_price" != "0" ]; then
      local avg_upside=$(echo "scale=4; ($avg_price - $current_price) / $current_price" | bc -l 2>/dev/null || echo "0")

      echo ""
      echo "【投资建议】"
      printf "  基于多模型估值，目标价区间: %s - %s\n" "$(format_price $min_price)" "$(format_price $max_price)"
      printf "  当前股价: %s\n" "$(format_price $current_price)"
      printf "  潜在上涨空间: %s\n" "$(format_percent $avg_upside)"
    fi
  else
    echo "  暂无估值数据"
  fi

  echo ""
}

if [ -z "$SYMBOL" ]; then
  echo "用法: ./smart-valuate.sh <股票代码> [行业类型]"
  echo ""
  echo "💡 提示: 如果不指定行业，脚本会自动检测"
  echo ""
  echo "示例:"
  echo "  ./smart-valuate.sh PLTR       # 自动检测"
  echo "  ./smart-valuate.sh NVDA tech  # 手动指定"
  echo "  ./smart-valuate.sh JPM bank"
  exit 1
fi

# 如果没有提供行业，自动检测
if [ -z "$INDUSTRY" ]; then
  echo "🔍 正在检测 $SYMBOL 的行业类型..."

  # 调用Node.js脚本检测行业
  DETECT_RESULT=$($DETECT $SYMBOL 2>/dev/null)

  if [ $? -eq 0 ]; then
    # 解析JSON结果
    DETECTED_TYPE=$(echo $DETECT_RESULT | grep -o '"detectedType":"[^"]*"' | cut -d'"' -f4)
    COMPANY_NAME=$(echo $DETECT_RESULT | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    COMPANY_INDUSTRY=$(echo $DETECT_RESULT | grep -o '"industry":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$DETECTED_TYPE" ] && [ "$DETECTED_TYPE" != "general" ]; then
      INDUSTRY=$DETECTED_TYPE
      echo "✅ 检测到: $COMPANY_NAME"
      echo "   行业: $COMPANY_INDUSTRY"
      echo "   估值类型: $INDUSTRY"
      echo ""
    else
      echo "⚠️  无法自动识别行业，使用通用估值模型"
      echo "   检测信息: $COMPANY_NAME - $COMPANY_INDUSTRY"
      echo ""
      echo "💡 可手动指定行业类型:"
      echo "   saas, tech, bank, auto, reit, consumer, energy, conglomerate"
      INDUSTRY="general"
    fi
  else
    echo "⚠️  行业检测失败，使用通用估值模型"
    INDUSTRY="general"
  fi
fi

echo "========================================"
echo "  智能估值分析 - $SYMBOL"
echo "  行业类型: $INDUSTRY"
echo "========================================"

# 根据行业自动选择模型
case $INDUSTRY in
  saas|software|cloud)
    echo ""
    echo "☁️  SaaS行业估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  自由现金流分析"
    $EVM fcf $SYMBOL
    run_valuation fcf $SYMBOL
    echo ""
    echo "2️⃣  单位经济学分析 (LTV/CAC)"
    $EVM operating $SYMBOL
    echo ""
    echo "3️⃣  DCF估值"
    $EVM dcf $SYMBOL
    run_valuation dcf $SYMBOL
    echo ""
    echo "4️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    echo ""
    echo "5️⃣  敏感性分析"
    $EVM sensitivity $SYMBOL
    ;;

  tech|technology|ai|chip|semiconductor)
    echo ""
    echo "🖥️  科技行业估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  自由现金流分析"
    $EVM fcf $SYMBOL
    run_valuation fcf $SYMBOL
    echo ""
    echo "2️⃣  DCF估值 (高成长假设)"
    $EVM dcf $SYMBOL -g 0.20,0.18,0.15,0.12,0.10
    run_valuation dcf $SYMBOL "-g 0.20,0.18,0.15,0.12,0.10"
    echo ""
    echo "3️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    echo ""
    echo "4️⃣  敏感性分析"
    $EVM sensitivity $SYMBOL
    echo ""
    echo "5️⃣  LBO分析"
    $EVM lbo $SYMBOL
    run_valuation lbo $SYMBOL
    ;;

  bank|financial|insurance)
    echo ""
    echo "🏦 金融行业估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  可比公司分析 (P/B为主)"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    echo ""
    echo "2️⃣  信用分析"
    $EVM credit $SYMBOL
    echo ""
    echo "3️⃣  三报表模型"
    $EVM 3s $SYMBOL -y 3
    ;;

  auto|automotive|ev|motor)
    echo ""
    echo "🚗 汽车行业估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  自由现金流分析"
    $EVM fcf $SYMBOL
    run_valuation fcf $SYMBOL
    echo ""
    echo "2️⃣  DCF估值"
    $EVM dcf $SYMBOL
    run_valuation dcf $SYMBOL
    echo ""
    echo "3️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    echo ""
    echo "4️⃣  LBO分析"
    $EVM lbo $SYMBOL
    run_valuation lbo $SYMBOL
    echo ""
    echo "5️⃣  敏感性分析"
    $EVM sensitivity $SYMBOL
    ;;

  reit|real-estate|property)
    echo ""
    echo "🏢 房地产估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  分部估值 (SOTP)"
    $EVM sotp $SYMBOL
    run_valuation sotp $SYMBOL
    echo ""
    echo "2️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    echo ""
    echo "3️⃣  信用分析"
    $EVM credit $SYMBOL
    ;;

  conglomerate|diversified)
    echo ""
    echo "🏭 多元化集团估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  分部估值 (SOTP)"
    $EVM sotp $SYMBOL
    run_valuation sotp $SYMBOL
    echo ""
    echo "2️⃣  DCF估值"
    $EVM dcf $SYMBOL
    run_valuation dcf $SYMBOL
    echo ""
    echo "3️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    ;;

  consumer|retail|staples|beverage|food)
    echo ""
    echo "🛒 消费行业估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  自由现金流分析"
    $EVM fcf $SYMBOL
    run_valuation fcf $SYMBOL
    echo ""
    echo "2️⃣  DCF估值 (稳定增长)"
    $EVM dcf $SYMBOL -g 0.05,0.05,0.04,0.04,0.03
    run_valuation dcf $SYMBOL "-g 0.05,0.05,0.04,0.04,0.03"
    echo ""
    echo "3️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    ;;

  energy|oil|gas|petroleum)
    echo ""
    echo "⛽ 能源行业估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    echo ""
    echo "2️⃣  DCF估值 (周期调整)"
    $EVM dcf $SYMBOL
    run_valuation dcf $SYMBOL
    echo ""
    echo "3️⃣  敏感性分析"
    $EVM sensitivity $SYMBOL
    ;;

  ipo|newlisting)
    echo ""
    echo "🚀 IPO估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  IPO分析"
    $EVM ipo $SYMBOL
    echo ""
    echo "2️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    echo ""
    echo "3️⃣  先例交易分析"
    $EVM precedent $SYMBOL
    ;;

  *)
    echo ""
    echo "📊 通用估值组合"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1️⃣  自由现金流分析"
    $EVM fcf $SYMBOL
    run_valuation fcf $SYMBOL
    echo ""
    echo "2️⃣  DCF估值"
    $EVM dcf $SYMBOL
    run_valuation dcf $SYMBOL
    echo ""
    echo "3️⃣  可比公司分析"
    $EVM comps $SYMBOL
    run_valuation comps $SYMBOL
    ;;
esac

# 生成估值总结
generate_summary $SYMBOL

echo ""
echo "========================================"
echo "  智能估值分析完成"
echo "========================================"
