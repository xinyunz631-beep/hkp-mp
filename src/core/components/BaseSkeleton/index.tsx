import { Skeleton } from '@nutui/nutui-react-taro';
import { View } from '@tarojs/components';
import classNames from 'classnames';
import type { CSSProperties } from 'react';
import './index.scss';

type BaseSkeletonAvatarShape = 'round' | 'square';
type BaseSkeletonVariant = 'text' | 'block' | 'circle';

interface BaseSkeletonProps {
  className?: string;
  variant?: BaseSkeletonVariant;
  width?: string;
  height?: string;
  radius?: string;
  rows?: number;
  title?: boolean;
  avatar?: boolean;
  avatarSize?: string;
  avatarShape?: BaseSkeletonAvatarShape;
  animated?: boolean;
  count?: number;
}

// 渲染应用级统一骨架屏封装，页面不要直接散用第三方 Skeleton。
export function BaseSkeleton({
  className,
  variant = 'text',
  width,
  height,
  radius,
  rows = 1,
  title = false,
  avatar = false,
  avatarSize = '50px',
  avatarShape = 'round',
  animated = true,
  count = 1,
}: BaseSkeletonProps) {
  const isBlock = variant === 'block';
  const isCircle = variant === 'circle';
  const skeletonClassName = classNames('base-skeleton', `base-skeleton--${variant}`, className);
  const skeletonItems = Array.from({ length: count }, (_, index) => index);
  const skeletonStyle = {
    ...(width ? { width } : {}),
    ...(height ? { '--nutui-skeleton-line-height': height } : {}),
    ...(radius ? { '--nutui-skeleton-line-border-radius': radius } : {}),
  } as CSSProperties;
  const resolvedRows = isCircle ? 0 : isBlock ? 1 : rows;
  const resolvedTitle = isBlock || isCircle ? false : title;
  const resolvedAvatar = isCircle || avatar;
  const resolvedAvatarSize = isCircle ? (width || height || avatarSize) : avatarSize;

  return (
    <View className={skeletonClassName} style={skeletonStyle}>
      {skeletonItems.map((item) => (
        <Skeleton
          key={item}
          className="base-skeleton__item"
          rows={resolvedRows}
          title={resolvedTitle}
          avatar={resolvedAvatar}
          avatarSize={resolvedAvatarSize}
          avatarShape={avatarShape}
          animated={animated}
        />
      ))}
    </View>
  );
}
