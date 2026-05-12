import { PropsWithChildren, ReactNode, useCallback, useEffect, useState } from 'react';
import classNames from 'classnames';
import Taro, { useDidHide, useDidShow, useResize } from '@tarojs/taro';
import { ScrollView, View } from '@tarojs/components';
import type { ScrollViewProps } from '@tarojs/components';
import { PageRuntimeHost } from '@/core/components/PageRuntimeHost';
import {
  resolveRectHeight,
  resolveWindowHeight,
  shouldReserveBottomSafeArea,
  type LayoutRect,
} from '@/core/utils/style';
import './index.scss';

type PageLayoutScrollViewProps = Omit<ScrollViewProps, 'children' | 'className' | 'scrollY'>;

export interface PageLayoutProps extends PropsWithChildren {
  // 透传到最外层布局容器，供页面按需覆盖 layout 样式。
  className?: string;
  header?: ReactNode;
  footer?: ReactNode;
  bottom?: ReactNode;
  share?: ReactNode;
  tabBar?: ReactNode;
  scrollViewProps?: PageLayoutScrollViewProps;
}

let pageLayoutIdSeed = 0;

// 生成页面布局节点 ID，避免多个页面实例 selector query 互相命中。
function createPageLayoutId() {
  pageLayoutIdSeed += 1;
  return `page-layout-${pageLayoutIdSeed}`;
}

// 渲染页面级布局：顶部 header 插槽、中间滚动区自适应剩余高度，底部支持固定插槽。
export function PageLayout({
  header,
  footer,
  bottom,
  share,
  tabBar,
  scrollViewProps,
  className,
  children,
}: PageLayoutProps) {
  const [layoutId] = useState(createPageLayoutId);
  const [viewportHeight, setViewportHeight] = useState(() => resolveWindowHeight());
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const [layoutActive, setLayoutActive] = useState(true);
  const [bottomSafeAreaNeeded] = useState(shouldReserveBottomSafeArea);
  const headerId = `${layoutId}-header`;
  const footerId = `${layoutId}-footer`;
  const hasScrollView = Boolean(scrollViewProps);
  const footerNode = footer ?? bottom;

  // 重新测量顶部和底部固定区域高度，供中间占位和滚动容器使用。
  const measureLayoutChrome = useCallback(() => {
    Taro.nextTick(() => {
      const query = Taro.createSelectorQuery();
      query.select(`#${headerId}`).boundingClientRect();
      query.select(`#${footerId}`).boundingClientRect();
      query.exec((results: Array<LayoutRect | null | undefined>) => {
        const [headerRect, footerRect] = results;
        const nextViewportHeight = resolveWindowHeight();
        const nextHeaderHeight = resolveRectHeight(headerRect);
        const nextFooterHeight = resolveRectHeight(footerRect);

        setViewportHeight((currentHeight) => (
          Math.abs(currentHeight - nextViewportHeight) > 0.5 ? nextViewportHeight : currentHeight
        ));
        setHeaderHeight((currentHeight) => (
          Math.abs(currentHeight - nextHeaderHeight) > 0.5 ? nextHeaderHeight : currentHeight
        ));
        setFooterHeight((currentHeight) => (
          Math.abs(currentHeight - nextFooterHeight) > 0.5 ? nextFooterHeight : currentHeight
        ));
      });
    });
  }, [footerId, headerId]);

  useResize(() => {
    if (layoutActive) {
      measureLayoutChrome();
    }
  });

  useDidShow(() => {
    setLayoutActive(true);
    measureLayoutChrome();
  });

  useDidHide(() => {
    setLayoutActive(false);
  });

  // 每次渲染后都重测一次，保证 header/footer 内部状态变更后中间占位同步更新。
  useEffect(() => {
    if (!layoutActive) return undefined;

    measureLayoutChrome();
    const settleTimer = setTimeout(measureLayoutChrome, 80);
    return () => {
      clearTimeout(settleTimer);
    };
  });

  const scrollViewStyle: ScrollViewProps['style'] = hasScrollView
    ? typeof scrollViewProps?.style === 'string'
      ? `${scrollViewProps.style};height:${viewportHeight}px;`
      : {
          ...scrollViewProps?.style,
          height: `${viewportHeight}px`,
        }
    : undefined;
  const layoutClassName = classNames(
    'page-layout',
    hasScrollView ? 'page-layout--scroll' : 'page-layout--plain',
    tabBar && 'page-layout--with-tabbar',
    bottomSafeAreaNeeded && 'page-layout--safe-bottom',
    className,
  );

  return (
    <PageRuntimeHost>
      <View className={layoutClassName}>
        {header ? (
          <View className="page-layout__header" id={headerId}>
            {header}
          </View>
        ) : null}
        {hasScrollView ? (
          <ScrollView
            {...scrollViewProps}
            className="page-layout__scroll"
            style={scrollViewStyle}
            scrollY
            enableFlex={scrollViewProps?.enableFlex ?? true}
            enhanced={scrollViewProps?.enhanced ?? true}
            showScrollbar={scrollViewProps?.showScrollbar ?? false}
          >
            <View className="page-layout__content">
              {headerHeight > 0 ? (
                <View className="page-layout__content-spacer page-layout__content-spacer--header" style={{ height: `${headerHeight}px` }} />
              ) : null}
              {children}
              {footerHeight > 0 ? (
                <View className="page-layout__content-spacer page-layout__content-spacer--footer" style={{ height: `${footerHeight}px` }} />
              ) : null}
              {tabBar ? <View className="page-layout__content-spacer page-layout__content-spacer--tabbar" /> : null}
              {bottomSafeAreaNeeded ? <View className="page-layout__content-spacer page-layout__content-spacer--safe-bottom" /> : null}
            </View>
          </ScrollView>
        ) : (
          <View className="page-layout__content">
            {headerHeight > 0 ? (
              <View className="page-layout__content-spacer page-layout__content-spacer--header" style={{ height: `${headerHeight}px` }} />
            ) : null}
            {children}
            {footerHeight > 0 ? (
              <View className="page-layout__content-spacer page-layout__content-spacer--footer" style={{ height: `${footerHeight}px` }} />
            ) : null}
            {tabBar ? <View className="page-layout__content-spacer page-layout__content-spacer--tabbar" /> : null}
            {bottomSafeAreaNeeded ? <View className="page-layout__content-spacer page-layout__content-spacer--safe-bottom" /> : null}
          </View>
        )}
        {footerNode ? (
          <View className="page-layout__footer" id={footerId}>
            {footerNode}
            {bottomSafeAreaNeeded && !tabBar ? <View className="page-layout__footer-safe-bottom-spacer" /> : null}
          </View>
        ) : null}
        {share ? <View className="page-layout__share">{share}</View> : null}
        {tabBar ? <View className="page-layout__tabbar">{tabBar}</View> : null}
      </View>
    </PageRuntimeHost>
  );
}
