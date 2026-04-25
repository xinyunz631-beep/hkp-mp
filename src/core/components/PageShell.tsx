import { PropsWithChildren } from 'react';
import { View } from '@tarojs/components';
import './PageShell.scss';

interface PageShellProps extends PropsWithChildren {
  title: string;
  description?: string;
}

// 渲染轻量页面壳，仅用于主包占位页和极简基础页面。
export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <View className="page-shell">
      <View className="page-shell__title">{title}</View>
      {description ? <View className="page-shell__desc">{description}</View> : null}
      {children ? <View className="page-shell__body">{children}</View> : null}
    </View>
  );
}
