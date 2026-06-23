interface FormatCurrencyOptions {
  showSymbol?: boolean;
  fallback?: string;
}

// 解析接口、草稿和运行时里常见的 number-like 输入，非法值显式返回 undefined。
export function parseNumberLike(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const normalizedValue = Number(value.trim());
    if (Number.isFinite(normalizedValue)) return normalizedValue;
  }
  return undefined;
}

// 格式化人民币金额，统一小程序内金额展示口径。
export function formatCurrency(value: unknown, options: FormatCurrencyOptions = {}) {
  const amount = parseNumberLike(value);
  if (typeof amount !== 'number') {
    return options.fallback ?? `${options.showSymbol === false ? '' : '¥'}0.00`;
  }

  const text = amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${options.showSymbol === false ? '' : '¥'}${text}`;
}

// 将金额分转为元，统一接口返回金额的展示转换。
export function centToYuan(value: unknown) {
  const amount = parseNumberLike(value);
  if (typeof amount !== 'number') return 0;
  return Number((amount / 100).toFixed(2));
}

// 直接把分单位金额格式化成页面展示文案，避免业务侧重复做分转元。
export function formatCentCurrency(value: unknown, options: FormatCurrencyOptions = {}) {
  return formatCurrency(centToYuan(value), options);
}
