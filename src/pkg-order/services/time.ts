function normalizeOrderTimeText(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

// 订单域时间展示保留后端返回精度：有秒显示秒，仅到分钟则显示到分钟。
export function formatOrderDateTime(value?: string, fallback = '') {
  const text = normalizeOrderTimeText(value);
  if (!text) return fallback;

  const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?$/);
  if (!match) return text.replace('T', ' ');

  const [, dateText, minuteText, secondText] = match;
  if (!minuteText) return dateText;

  return `${dateText} ${minuteText}${secondText ? `:${secondText}` : ''}`;
}

export function formatOrderClockTime(value?: string, fallback = '') {
  const dateTimeText = formatOrderDateTime(value, '');
  const match = dateTimeText.match(/\s(\d{2}:\d{2}(?::\d{2})?)$/);
  return match?.[1] || fallback;
}
