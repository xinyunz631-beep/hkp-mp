import { Text, View } from '@tarojs/components';
import type { ReactNode } from 'react';
import { FixedSubmitBar } from '@/core/components/commerce';
import './index.scss';

interface TicketSubmitFooterProps {
  label?: ReactNode;
  amount?: number;
  amountText?: ReactNode;
  buttonText: ReactNode;
  disabled?: boolean;
  discountText?: ReactNode;
  onSubmit?: () => void;
}

export function TicketSubmitFooter({
  label = '金额:',
  amount,
  amountText,
  buttonText,
  disabled = false,
  discountText,
  onSubmit,
}: TicketSubmitFooterProps) {
  return (
    <View className="ticket-submit-footer">
      <View className="ticket-submit-footer__top-shadow" />
      <FixedSubmitBar
        className="ticket-submit-footer__bar"
        label={label}
        amount={amount}
        amountText={amountText}
        buttonText={buttonText}
        disabled={disabled}
        extra={discountText ? <Text className="ticket-submit-footer__discount">{discountText}</Text> : undefined}
        onSubmit={onSubmit}
      />
    </View>
  );
}
