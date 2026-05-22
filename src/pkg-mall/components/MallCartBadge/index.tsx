import { Text } from '@tarojs/components';
import classNames from 'classnames';
import './index.scss';

interface MallCartBadgeProps {
  count: number;
  className?: string;
}

export function MallCartBadge({ count, className }: MallCartBadgeProps) {
  if (count <= 0) return null;

  return (
    <Text className={classNames('mall-cart-badge', className)}>
      {count > 99 ? '99+' : count}
    </Text>
  );
}
