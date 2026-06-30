import { RichText, View } from '@tarojs/components';
import classNames from 'classnames';
import { normalizeTicketRichTextHtml } from './rich-text-fit';
import './index.scss';

interface TicketRichTextProps {
  className?: string;
  nodes?: string;
}

// 统一票务富文本容器，只承接后端已维护好的富文本结构。
export function TicketRichText({ className, nodes }: TicketRichTextProps) {
  return (
    <View className={classNames('ticket-rich-text', className)}>
      <RichText className="ticket-rich-text_content" nodes={normalizeTicketRichTextHtml(nodes)} />
    </View>
  );
}
