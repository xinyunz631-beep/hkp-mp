const MALL_RUNTIME_TEXT_PLACEHOLDERS = ['UAT商城联调商品'];
const MALL_RUNTIME_EXACT_TEXTS = new Set(['默认规格', 'Hello Kitty 官方商城']);
const MALL_RUNTIME_URL_PATTERNS = [/\/mock-\d{8}(?:[/?#]|$)/i];
const EDGE_PUNCTUATION_REGEXP = /^[\s:：,，;；|/、-]+|[\s:：,，;；|/、-]+$/g;

function trimText(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function compactDisplayText(value: string) {
  return value.replace(/\s+/g, ' ').replace(EDGE_PUNCTUATION_REGEXP, '').trim();
}

function removeAllFragments(value: string, fragments: string[]) {
  return fragments.reduce((result, fragment) => result.split(fragment).join(''), value);
}

// 从商城富文本里提取可用图片地址，给图片预览和失败态兜底统一复用。
export function extractMallRuntimeHtmlImageUrls(value?: string) {
  const normalized = trimText(value);
  if (!normalized) return [];

  const imageUrls = normalized.match(/<img\b[^>]*\bsrc\s*=\s*['"]([^'"]+)['"][^>]*>/gi) ?? [];
  return Array.from(new Set(imageUrls
    .map((imageTag) => imageTag.match(/\bsrc\s*=\s*['"]([^'"]+)['"]/)?.[1] || '')
    .map((imageUrl) => sanitizeMallRuntimeUrl(imageUrl))
    .filter(Boolean)));
}

export function sanitizeMallRuntimeText(value?: string) {
  const normalized = trimText(value);
  if (!normalized) return '';
  if (MALL_RUNTIME_EXACT_TEXTS.has(normalized)) return '';

  const sanitized = removeAllFragments(normalized, MALL_RUNTIME_TEXT_PLACEHOLDERS);
  const compacted = compactDisplayText(sanitized);
  return MALL_RUNTIME_EXACT_TEXTS.has(compacted) ? '' : compacted;
}

export function sanitizeMallRuntimeUrl(value?: string) {
  const normalized = trimText(value);
  if (!normalized) return '';
  if (MALL_RUNTIME_URL_PATTERNS.some((pattern) => pattern.test(normalized))) return '';
  return normalized;
}

export function sanitizeMallRuntimeHtml(value?: string) {
  const normalized = trimText(value);
  if (!normalized) return '';

  let next = removeAllFragments(normalized, MALL_RUNTIME_TEXT_PLACEHOLDERS);
  next = next.replace(/https?:\/\/[^\s"'<>]*\/mock-\d{8}[^\s"'<>]*/gi, '');
  next = next.replace(/(^|>)(\s*[：:，,、;；|/.-]+)/g, '$1');
  next = next.replace(/<(p|div|span)>\s*(?:&nbsp;|\s|<br\s*\/?>)*<\/\1>/gi, '');

  const plainText = compactDisplayText(
    next
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&'),
  );

  return plainText ? next.trim() : '';
}

export function sanitizeMallRuntimeTextList(values?: string[]) {
  return (values || []).map((value) => sanitizeMallRuntimeText(value)).filter(Boolean);
}

export function sanitizeMallRuntimeUrlList(values?: string[]) {
  return (values || []).map((value) => sanitizeMallRuntimeUrl(value)).filter(Boolean);
}
