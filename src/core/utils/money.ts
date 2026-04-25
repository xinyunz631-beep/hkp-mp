// 格式化人民币金额，统一小程序内金额展示口径。
export function formatCurrency(value: number | string, options: { showSymbol?: boolean } = {}) {
  const amount = Number(value || 0);
  const text = amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${options.showSymbol === false ? '' : '¥'}${text}`;
}

// 将金额元转为分，统一提交给后端或支付接口前的数据形态。
export function yuanToCent(value: number | string) {
  return Math.round(Number(value || 0) * 100);
}

// 将金额分转为元，统一接口返回金额的展示转换。
export function centToYuan(value: number | string) {
  return Number(value || 0) / 100;
}
