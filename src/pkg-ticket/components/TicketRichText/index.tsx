import { RichText, View } from '@tarojs/components';
import classNames from 'classnames';
import './index.scss';

interface TicketRichTextProps {
  className?: string;
  nodes?: string;
}

function mergeStyleAttribute(existStyle = '', defaultStyle: string) {
  const trimmedStyle = existStyle.trim();
  if (!trimmedStyle) return defaultStyle;

  return `${defaultStyle};${trimmedStyle}`;
}

function applyDefaultTagStyle(html: string, tagName: string, defaultStyle: string) {
  const tagRegExp = new RegExp(`<${tagName}([^>]*)>`, 'gi');

  return html.replace(tagRegExp, (matched, rawAttrs = '') => {
    const attrs = String(rawAttrs);
    const styleRegExp = /\sstyle=(["'])(.*?)\1/i;
    const styleMatched = attrs.match(styleRegExp);

    if (styleMatched) {
      const nextStyle = mergeStyleAttribute(styleMatched[2], defaultStyle);
      const nextAttrs = attrs.replace(styleRegExp, ` style=${styleMatched[1]}${nextStyle}${styleMatched[1]}`);
      return `<${tagName}${nextAttrs}>`;
    }

    return `<${tagName}${attrs} style="${defaultStyle}">`;
  });
}

function normalizeRichTextHtml(nodes = '') {
  if (!nodes) return '';

  return [
    ['div', 'box-sizing:border-box;max-width:100%;font-size:30px;line-height:1.65;color:#111111;word-break:break-word'],
    ['p', 'margin:0 0 24px;font-size:30px;line-height:1.65;color:#111111;word-break:break-word'],
    ['span', 'font-size:30px;line-height:1.65;color:inherit;word-break:break-word'],
    ['text', 'font-size:30px;line-height:1.65;color:inherit;word-break:break-word'],
    ['img', 'display:block;width:100%;max-width:100%;height:auto;margin:18px 0;border:0'],
  ].reduce((html, [tagName, defaultStyle]) => applyDefaultTagStyle(html, tagName, defaultStyle), nodes);
}

// 统一票务富文本容器；CSS 能命中时走外层样式，命不中时由 HTML inline style 兜底。
export function TicketRichText({ className, nodes }: TicketRichTextProps) {
  return (
    <View className={classNames('ticket-rich-text', className)}>
      <RichText className="ticket-rich-text_content" nodes={normalizeRichTextHtml(nodes)} />
    </View>
  );
}
