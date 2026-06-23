import { Image } from '@tarojs/components';
import { Empty } from '@nutui/nutui-react-taro';
import classNames from 'classnames';
import type { ReactNode } from 'react';
import './index.scss';

type BaseEmptyStatus = 'empty' | 'error' | 'network';
type BaseEmptySize = 'small' | 'base';

interface BaseEmptyProps {
  className?: string;
  title?: ReactNode;
  description?: ReactNode;
  image?: ReactNode;
  status?: BaseEmptyStatus;
  size?: BaseEmptySize;
  actionText?: ReactNode;
  actionDisabled?: boolean;
  onAction?: () => void | Promise<void | boolean>;
}

const BASE_EMPTY_IMAGE_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180" role="img" aria-label="empty state">
  <defs>
    <linearGradient id="base-empty-card" x1="64" y1="58" x2="176" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f5f6fa" />
    </linearGradient>
    <linearGradient id="base-empty-accent" x1="166" y1="92" x2="204" y2="132" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ff8fc4" />
      <stop offset="100%" stop-color="#e25291" />
    </linearGradient>
  </defs>
  <ellipse cx="120" cy="154" rx="72" ry="13" fill="#eef1f6" />
  <rect x="62" y="62" width="116" height="78" rx="18" fill="url(#base-empty-card)" stroke="#e4e8f0" stroke-width="4" />
  <path d="M66 84 L120 116 L174 84" fill="none" stroke="#e8ecf3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M88 74 H152" stroke="#edf0f6" stroke-width="4" stroke-linecap="round" />
  <circle cx="184" cy="116" r="19" fill="url(#base-empty-accent)" />
  <path d="M176 116 H192 M184 108 V124" stroke="#ffffff" stroke-width="5" stroke-linecap="round" />
  <path d="M92 52 C86 41 90 32 102 39 C108 43 111 50 111 58" fill="#ffffff" stroke="#e4e8f0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M148 52 C154 41 150 32 138 39 C132 43 129 50 129 58" fill="#ffffff" stroke="#e4e8f0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="105" cy="92" r="4.8" fill="#2b2f3a" />
  <circle cx="135" cy="92" r="4.8" fill="#2b2f3a" />
  <ellipse cx="120" cy="101" rx="5.8" ry="4" fill="#f4c64e" stroke="#2b2f3a" stroke-width="2.4" />
  <circle cx="96" cy="105" r="5" fill="#ffb0c8" opacity="0.72" />
  <circle cx="144" cy="105" r="5" fill="#ffb0c8" opacity="0.72" />
</svg>`;

const BASE_EMPTY_IMAGE_SRC = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BASE_EMPTY_IMAGE_SVG)}`;

function BaseEmptyImage({ size, status }: { size: BaseEmptySize; status: BaseEmptyStatus }) {
  return (
    <Image
      svg
      className={classNames('base-empty__image', `base-empty__image--${size}`, `base-empty__image--${status}`)}
      src={BASE_EMPTY_IMAGE_SRC}
      mode="aspectFit"
    />
  );
}

// 渲染应用级统一空态/失败态封装，页面通过业务文案和动作配置复用 NutUI Empty。
export function BaseEmpty({
  className,
  title,
  description,
  image,
  status = 'empty',
  size = 'base',
  actionText,
  actionDisabled = false,
  onAction,
}: BaseEmptyProps) {
  const emptyClassName = classNames('base-empty', className);
  const resolvedImage = image === undefined ? <BaseEmptyImage size={size} status={status} /> : image;
  const actions = actionText
    ? [{
        text: actionText,
        type: 'primary' as const,
        fill: 'solid' as const,
        disabled: actionDisabled,
        onClick: handleAction,
      }]
    : [];

  // 执行空态主操作，异步结果交给调用方自身流程处理。
  async function handleAction() {
    if (actionDisabled || !onAction) return;
    await onAction();
  }

  return (
    <Empty
      className={emptyClassName}
      image={resolvedImage}
      status={status}
      size={size}
      title={title}
      description={description}
      actions={actions}
    />
  );
}
