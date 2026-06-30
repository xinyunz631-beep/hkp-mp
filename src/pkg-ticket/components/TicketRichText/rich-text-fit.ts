const FIT_MARKER = 'data-hkp-mini-program-fit="true"';

const CONTAINER_STYLE = [
  'width:100%!important',
  'max-width:100%!important',
  'box-sizing:border-box!important',
  'overflow:hidden!important',
  'white-space:normal!important',
  'overflow-wrap:break-word!important',
  'word-break:break-word!important',
].join(';');

const BLOCK_STYLE = [
  'max-width:100%!important',
  'box-sizing:border-box!important',
  'white-space:normal!important',
  'overflow-wrap:break-word!important',
  'word-break:break-word!important',
].join(';');

const MEDIA_STYLE = [
  'display:block!important',
  'width:100%!important',
  'max-width:100%!important',
  'height:auto!important',
  'box-sizing:border-box!important',
].join(';');

const TABLE_STYLE = [
  'width:100%!important',
  'max-width:100%!important',
  'box-sizing:border-box!important',
  'table-layout:fixed!important',
  'word-break:break-word!important',
].join(';');

const CELL_STYLE = [
  'max-width:100%!important',
  'box-sizing:border-box!important',
  'white-space:normal!important',
  'overflow-wrap:break-word!important',
  'word-break:break-word!important',
].join(';');

function ensureStyleSemicolon(style: string) {
  const trimmedStyle = style.trim();
  if (!trimmedStyle) return '';
  return trimmedStyle.endsWith(';') ? trimmedStyle : `${trimmedStyle};`;
}

// 给富文本标签追加内联样式，保证微信 rich-text 内部节点不依赖外部 class 才能适配。
function appendInlineStyle(tag: string, style: string) {
  if (/\sstyle\s*=/i.test(tag)) {
    return tag.replace(/\sstyle\s*=\s*(["'])(.*?)\1/i, (_match, quote: string, currentStyle: string) => (
      ` style=${quote}${ensureStyleSemicolon(currentStyle)}${style}${quote}`
    ));
  }

  return tag.replace(/\s*\/?>$/, (ending) => ` style="${style}"${ending}`);
}

function appendStyleForTags(html: string, tagNames: string[], style: string) {
  const tagPattern = tagNames.join('|');
  return html.replace(new RegExp(`<\\s*(${tagPattern})\\b[^>]*>`, 'gi'), (tag) => appendInlineStyle(tag, style));
}

// 适配后台历史富文本：旧数据可能只有裸 img 或桌面宽度样式，微信端需要运行时兜底。
export function normalizeTicketRichTextHtml(nodes = '') {
  const trimmedNodes = nodes.trim();
  if (!trimmedNodes || trimmedNodes.includes(FIT_MARKER)) return trimmedNodes;

  const fittedHtml = appendStyleForTags(
    appendStyleForTags(
      appendStyleForTags(
        appendStyleForTags(
          trimmedNodes,
          ['img', 'image', 'video', 'iframe'],
          MEDIA_STYLE,
        ),
        ['table'],
        TABLE_STYLE,
      ),
      ['td', 'th'],
      CELL_STYLE,
    ),
    ['p', 'div', 'section', 'article', 'ul', 'ol', 'li', 'span'],
    BLOCK_STYLE,
  );

  return `<div ${FIT_MARKER} style="${CONTAINER_STYLE}">${fittedHtml}</div>`;
}
