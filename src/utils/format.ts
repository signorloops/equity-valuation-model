/**
 * 格式化工具函数
 * 用于将数值格式化为财务报告风格
 */

// 格式化货币（百万/十亿）
export function formatCurrency(value: number, decimals: number = 1): string {
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(decimals)}B`;
  } else if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(decimals)}M`;
  } else if (Math.abs(value) >= 1e3) {
    return `$${(value / 1e3).toFixed(decimals)}K`;
  }
  return `$${value.toFixed(decimals)}`;
}

// 格式化百分比
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// 格式化倍数
export function formatMultiple(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}x`;
}

// 格式化股价
export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

// 格式化大数字
export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

// 创建 Markdown 表格
export function createMarkdownTable(
  headers: string[],
  rows: (string | number)[][]
): string {
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataLines = rows.map(row => `| ${row.map(cell => String(cell)).join(' | ')} |`);

  return [headerLine, separatorLine, ...dataLines].join('\n');
}

// 创建分隔线
export function createSeparator(char: string = '=', length: number = 60): string {
  return char.repeat(length);
}

// 创建标题
export function createHeader(text: string, level: number = 1): string {
  return `${'#'.repeat(level)} ${text}`;
}

// 创建加粗文本
export function bold(text: string): string {
  return `**${text}**`;
}

// 创建斜体文本
export function italic(text: string): string {
  return `*${text}*`;
}

// 格式化日期
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

// 创建脚注
export function createFootnote(text: string): string {
  return `\n> ${text}`;
}

// 颜色代码（用于终端输出）
export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// 带颜色的格式化
export function colorize(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

// 根据数值返回颜色（正数为绿，负数为红）
export function formatDelta(value: number, decimals: number = 1): string {
  const formatted = `${value >= 0 ? '+' : ''}${(value * 100).toFixed(decimals)}%`;
  return value >= 0 ? colorize(formatted, 'green') : colorize(formatted, 'red');
}
