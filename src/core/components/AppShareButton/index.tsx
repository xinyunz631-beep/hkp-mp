import { Button } from '@tarojs/components';
import type { ITouchEvent } from '@tarojs/components';
import classNames from 'classnames';
import type { PropsWithChildren } from 'react';
import { AppIcon } from '@/core/components/AppIcon';
import './index.scss';

interface AppShareButtonProps extends PropsWithChildren {
  className?: string;
  iconSize?: number | string;
  iconColor?: string;
  onClick?: (event: ITouchEvent) => void;
}

// 统一微信好友分享按钮本体；分享内容由页面 useShareAppMessage 提供。
export function AppShareButton({
  className,
  iconSize = 16,
  iconColor = '#667085',
  onClick,
  children,
}: AppShareButtonProps) {
  return (
    <Button
      className={classNames('app-share-button', className)}
      openType="share"
      onClick={onClick}
    >
      {children || <AppIcon name="share" size={iconSize} color={iconColor} />}
    </Button>
  );
}
