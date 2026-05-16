import { CSSProperties, ReactNode, useState } from 'react';
import { View } from '@tarojs/components';
import { ArrowLeft } from '@nutui/icons-react-taro';
import { navigateBackOrHome, isCurrentMainTabPage } from '@/core/utils/navigation';
import { resolvePageChromeMetrics } from '@/core/utils/style';
import './index.scss';

interface PageNavbarProps {
  title: string;
  left?: ReactNode;
  right?: ReactNode;
}

interface NavbarButtonProps {
  onClick: () => void;
}

// 缓存页面 chrome 尺寸，避免页面滚动时重复读取系统信息。
function usePageChromeMetrics() {
  const [metrics] = useState(resolvePageChromeMetrics);
  return metrics;
}

// 缓存当前页面是否为 tab 页，tab 页默认不展示返回按钮。
function usePageBackVisibility() {
  const [isTabPage] = useState(isCurrentMainTabPage);
  return !isTabPage;
}

// 渲染页面默认返回按钮，遵循页面栈只剩一个页面时回首页的统一逻辑。
function PageNavbarBackButton({ onClick }: NavbarButtonProps) {
  return (
    <View className="page-navbar__back" onClick={onClick}>
      <View className="page-navbar__back-hitbox">
        <ArrowLeft className="page-navbar__back-icon" size={18} color="#111111" />
      </View>
    </View>
  );
}

// 渲染页面导航栏，可作为 PageLayout 的 header 插槽内容使用。
export function PageNavbar({ title, left, right }: PageNavbarProps) {
  const metrics = usePageChromeMetrics();
  const showDefaultBackButton = usePageBackVisibility();
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
        <View className="page-navbar__left">
          {left ?? (showDefaultBackButton ? <PageNavbarBackButton onClick={navigateBackOrHome} /> : null)}
        </View>
        <View className="page-navbar__title">{title}</View>
        {right ? <View className="page-navbar__right">{right}</View> : null}
      </View>
    </View>
  );
}
