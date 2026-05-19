import { useEffect, useState } from 'react';
import { View } from '@tarojs/components';
import { KittySvgLoading } from '@/components/KittySvgLoading';
import { BaseSkeleton } from '@/core/components/BaseSkeleton';
import './index.scss';

interface PageLoadingProps {
  visible: boolean;
}

interface LoadingContentProps {
  text?: string;
  size?: number;
}

const homeLoadingTickets = Array.from({ length: 3 }, (_, index) => index);
const homeLoadingMenus = Array.from({ length: 8 }, (_, index) => index);
const homeLoadingTabs = Array.from({ length: 5 }, (_, index) => index);

// 渲染页面级加载内容，统一复用图形 loading 和文案排版。
function LoadingContent({ text = '加载中...', size = 80 }: LoadingContentProps) {
  return (
    <View className="page-loading__content">
      <KittySvgLoading size={size} />
      <View className="page-loading__label">{text}</View>
    </View>
  );
}

// 渲染页面级单例 loading 遮罩，显示状态由当前页面 runtime 独立维护。
export function PageLoading({ visible }: PageLoadingProps) {
  const [contentMounted, setContentMounted] = useState(visible);
  const hidden = !visible;

  // 外层 host 必须常驻，隐藏时只卸载下一层真实遮罩，避免影响 PageLayout/ScrollView 结构。
  useEffect(() => {
    if (visible) {
      setContentMounted(true);
      return undefined;
    }

    const timer = setTimeout(() => {
      setContentMounted(false);
    }, 280);

    return () => {
      clearTimeout(timer);
    };
  }, [visible]);

  return (
    <View className="page-loading-host" aria-hidden={hidden}>
      {contentMounted ? (
        <View className={hidden ? 'page-loading page-loading--hidden' : 'page-loading'}>
          <View className="page-loading__wash" />
          <LoadingContent />
        </View>
      ) : null}
    </View>
  );
}

// 渲染通用页面首次初始化 loading，没有页面专属骨架屏时兜底使用。
export function PageInitLoading() {
  return (
    <View className="page-init-state">
      <LoadingContent />
    </View>
  );
}

// 渲染首页首次初始化 loading，只用 BaseSkeleton 组合页面结构，不承载真实业务内容。
export function HomeInitLoading() {
  return (
    <View className="home-init-skeleton">
      <View className="home-init-skeleton__hero">
        <View className="home-init-skeleton__hero-toolbar">
          <BaseSkeleton
            className="home-init-skeleton__round-button"
            variant="circle"
            width="72px"
            height="72px"
            animated
          />
          <View className="home-init-skeleton__search">
            <BaseSkeleton rows={1} animated />
          </View>
          <BaseSkeleton className="home-init-skeleton__capsule" variant="block" height="58px" radius="32px" animated />
        </View>
        <View className="home-init-skeleton__hero-soft">
          <BaseSkeleton
            className="home-init-skeleton__soft-block home-init-skeleton__soft-block--large"
            variant="block"
            height="48px"
            radius="24px"
            animated
          />
          <BaseSkeleton
            className="home-init-skeleton__soft-block home-init-skeleton__soft-block--small"
            variant="block"
            height="58px"
            radius="28px"
            animated
          />
        </View>
        <View className="home-init-skeleton__year-line">
          <BaseSkeleton rows={1} animated />
        </View>
        <View className="home-init-skeleton__headline">
          <BaseSkeleton rows={1} animated />
        </View>
        <View className="home-init-skeleton__ticket-row">
          {homeLoadingTickets.map((item) => (
            <View key={item} className="home-init-skeleton__ticket">
              <BaseSkeleton rows={3} title animated />
            </View>
          ))}
        </View>
        <View className="home-init-skeleton__pager">
          <View className="home-init-skeleton__pager-dot home-init-skeleton__pager-dot--active" />
          <View className="home-init-skeleton__pager-dot" />
          <View className="home-init-skeleton__pager-dot" />
        </View>
        <View className="home-init-skeleton__notice">
          <BaseSkeleton rows={1} animated />
        </View>
      </View>

      <View className="home-init-skeleton__member-card">
        <View className="home-init-skeleton__member-header">
          <View className="home-init-skeleton__hello">
            <BaseSkeleton rows={1} animated />
          </View>
          <BaseSkeleton className="home-init-skeleton__level" variant="block" height="46px" radius="23px" animated />
        </View>
        <View className="home-init-skeleton__menu-grid">
          {homeLoadingMenus.map((item) => (
            <View key={item} className="home-init-skeleton__menu-item">
              <BaseSkeleton
                className="home-init-skeleton__menu-icon"
                variant="circle"
                width="106px"
                height="106px"
                animated
              />
              <BaseSkeleton className="home-init-skeleton__menu-label" rows={1} animated />
            </View>
          ))}
        </View>
      </View>

      <View className="home-init-skeleton__park-card">
        <BaseSkeleton className="home-init-skeleton__park-image" variant="block" height="220px" radius="26px" animated />
        <View className="home-init-skeleton__park-content">
          <BaseSkeleton rows={2} title animated />
        </View>
      </View>

      <View className="home-init-skeleton__tabbar">
        {homeLoadingTabs.map((item) => (
          <View key={item} className="home-init-skeleton__tabbar-item">
            <BaseSkeleton
              className={item === 2 ? 'home-init-skeleton__tabbar-center' : 'home-init-skeleton__tabbar-icon'}
              variant="circle"
              width={item === 2 ? '86px' : '48px'}
              height={item === 2 ? '86px' : '48px'}
              animated
            />
            {item !== 2 && <BaseSkeleton className="home-init-skeleton__tabbar-label" rows={1} animated />}
          </View>
        ))}
      </View>
    </View>
  );
}
