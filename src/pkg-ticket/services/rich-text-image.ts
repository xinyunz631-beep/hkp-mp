const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
};

function decodeHtmlAttribute(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (entity, code: string) => {
    const normalizedCode = code.toLowerCase();
    if (normalizedCode.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(normalizedCode.slice(2), 16));
    }
    if (normalizedCode.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(normalizedCode.slice(1), 10));
    }
    return HTML_ENTITY_MAP[normalizedCode] || entity;
  });
}

export function resolveFirstRichTextImage(richText?: string | null) {
  if (!richText) return '';

  const imageTag = richText.match(/<\s*img\b[^>]*>/i)?.[0] || '';
  if (!imageTag) return '';

  const srcMatch = imageTag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const rawSrc = (srcMatch?.[1] || srcMatch?.[2] || srcMatch?.[3] || '').trim();
  return rawSrc ? decodeHtmlAttribute(rawSrc) : '';
}
