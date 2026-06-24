import { Text, View } from '@tarojs/components';
import type { ReactNode } from 'react';
import { AppIcon } from '@/core/components/AppIcon';
import { FixedSubmitBar } from '@/core/components/commerce';
import './index.scss';

interface TicketSubmitFooterProps {
  label?: ReactNode;
  amount?: number;
  amountText?: ReactNode;
  buttonText: ReactNode;
  disabled?: boolean;
  discountText?: ReactNode;
  onDiscountClick?: () => void;
  onSubmit?: () => void;
}

export function TicketSubmitFooter({
  label = '金额:',
  amount,
  amountText,
  buttonText,
  disabled = false,
  discountText,
  onDiscountClick,
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
        extra={discountText ? (
          <View className="ticket-submit-footer__discount" onClick={onDiscountClick}>
            <Text>{discountText}</Text>
            {onDiscountClick ? <AppIcon name="arrowRight" size={12} color="#8b909a" /> : null}
          </View>
        ) : undefined}
        onSubmit={onSubmit}
      />
    </View>
  );
}
