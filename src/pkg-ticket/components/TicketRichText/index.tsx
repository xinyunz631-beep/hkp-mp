import { RichText, View } from '@tarojs/components';
import classNames from 'classnames';
import './index.scss';

interface TicketRichTextProps {
  className?: string;
  nodes?: string;
}

// 保持后端富文本原文，前端不重写接口返回的 HTML 结构。
function normalizeRichTextHtml(nodes = '') {
  return nodes;
}

// 统一票务富文本容器，只承接后端已维护好的富文本结构。
export function TicketRichText({ className, nodes }: TicketRichTextProps) {
  return (
    <View className={classNames('ticket-rich-text', className)}>
      <RichText className="ticket-rich-text_content" nodes={normalizeRichTextHtml(nodes)} />
    </View>
  );
}
