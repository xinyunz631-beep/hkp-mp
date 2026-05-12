import { CSSProperties, ReactNode, useState } from 'react';
import { View } from '@tarojs/components';
import { resolvePageChromeMetrics } from '@/core/utils/style';
import './index.scss';

interface PageNavbarProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

// 缓存页面 chrome 尺寸，避免页面滚动时重复读取系统信息。
function usePageChromeMetrics() {
  const [metrics] = useState(resolvePageChromeMetrics);
  return metrics;
}

// 渲染页面导航栏，可作为 PageLayout 的 header 插槽内容使用。
export function PageNavbar({ title, left, right }: PageNavbarProps) {
  const metrics = usePageChromeMetrics();
  const navbarStyle: CSSProperties = {
    height: `${metrics.statusBarHeight + metrics.headerHeight}px`,
    paddingTop: `${metrics.statusBarHeight}px`,
  };
  const contentStyle: CSSProperties = {
    height: `${metrics.headerContentHeight}px`,
    marginTop: `${metrics.headerContentTopGap}px`,
    paddingRight: `${metrics.menuRightReserve}px`,
  };

  return (
    <View className="page-navbar" style={navbarStyle}>
      <View className="page-navbar__content" style={contentStyle}>
        <View className="page-navbar__left">{left}</View>
        <View className="page-navbar__title">{title}</View>
        {right ? <View className="page-navbar__right">{right}</View> : null}
      </View>
    </View>
  );
}
