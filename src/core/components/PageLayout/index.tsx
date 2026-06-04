import { CSSProperties, PropsWithChildren, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import Taro, { useDidHide, useDidShow, useResize } from '@tarojs/taro';
import { ScrollView, View } from '@tarojs/components';
import type { ScrollViewProps } from '@tarojs/components';
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
  runtimeNode?: ReactNode;
  scrollViewProps?: PageLayoutScrollViewProps;
  chromeCacheKey?: string;
  chromeCacheSignature?: string;
}

let pageLayoutIdSeed = 0;
interface PageLayoutChromeCacheEntry {
  headerHeight: number;
  footerHeight: number;
  hasHeader: boolean;
  hasFooter: boolean;
  hasTabBar: boolean;
  bottomSafeAreaNeeded: boolean;
  signature?: string;
}

const pageLayoutChromeCache = new Map<string, PageLayoutChromeCacheEntry>();
const ZERO_HEIGHT_MEASURE_RETRY_LIMIT = 3;
const ZERO_HEIGHT_MEASURE_RETRY_DELAY_MS = 48;

interface ChromeSlotMeasurementOptions {
  hasContent: boolean;
  measuredHeight: number;
  currentHeight: number;
  zeroMeasureCountRef: {
    current: number;
  };
}

interface ChromeSlotMeasurement {
  height: number;
  ready: boolean;
  cacheable: boolean;
  shouldRetry: boolean;
}

function resolveChromeSlotMeasurement({
  hasContent,
  measuredHeight,
  currentHeight,
  zeroMeasureCountRef,
}: ChromeSlotMeasurementOptions): ChromeSlotMeasurement {
  if (!hasContent) {
    zeroMeasureCountRef.current = 0;
    return {
      height: 0,
      ready: true,
      cacheable: true,
      shouldRetry: false,
    };
  }

  if (measuredHeight > 0) {
    zeroMeasureCountRef.current = 0;
    return {
      height: measuredHeight,
      ready: true,
      cacheable: true,
      shouldRetry: false,
    };
  }

  zeroMeasureCountRef.current += 1;

  if (currentHeight > 0) {
    return {
      height: currentHeight,
      ready: true,
      cacheable: false,
      shouldRetry: zeroMeasureCountRef.current < ZERO_HEIGHT_MEASURE_RETRY_LIMIT,
    };
  }

  const zeroMeasurementSettled = zeroMeasureCountRef.current >= ZERO_HEIGHT_MEASURE_RETRY_LIMIT;

  return {
    height: 0,
    ready: zeroMeasurementSettled,
    cacheable: false,
    shouldRetry: !zeroMeasurementSettled,
  };
}

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
  runtimeNode,
  scrollViewProps,
  className,
  chromeCacheKey,
  chromeCacheSignature,
  children,
}: PageLayoutProps) {
  const footerNode = footer ?? bottom;
  const hasHeaderContent = Boolean(header);
  const hasFooterContent = Boolean(footerNode);
  const hasTabBar = Boolean(tabBar);
  const hasScrollView = Boolean(scrollViewProps);
  const [layoutId] = useState(createPageLayoutId);
  const [bottomSafeAreaNeeded] = useState(shouldReserveBottomSafeArea);
  const [initialChrome] = useState(() => {
    if (!chromeCacheKey) return undefined;

    const cachedChrome = pageLayoutChromeCache.get(chromeCacheKey);
    if (!cachedChrome) return undefined;
    if (cachedChrome.signature !== chromeCacheSignature) return undefined;
    if (cachedChrome.hasHeader !== hasHeaderContent) return undefined;
    if (cachedChrome.hasFooter !== hasFooterContent) return undefined;
    if (cachedChrome.hasTabBar !== hasTabBar) return undefined;
    if (cachedChrome.bottomSafeAreaNeeded !== bottomSafeAreaNeeded) return undefined;
    if (hasHeaderContent && cachedChrome.headerHeight <= 0) return undefined;
    if (hasFooterContent && cachedChrome.footerHeight <= 0) return undefined;

    return cachedChrome;
  });
  const [viewportHeight, setViewportHeight] = useState(() => resolveWindowHeight());
  const [headerHeight, setHeaderHeight] = useState(() => initialChrome?.headerHeight ?? 0);
  const [footerHeight, setFooterHeight] = useState(() => initialChrome?.footerHeight ?? 0);
  const [layoutActive, setLayoutActive] = useState(true);
  const [chromeMeasured, setChromeMeasured] = useState(Boolean(initialChrome));
  const [measureCoverVisible, setMeasureCoverVisible] = useState(!initialChrome);
  const headerHeightRef = useRef(headerHeight);
  const footerHeightRef = useRef(footerHeight);
  const headerZeroMeasureCountRef = useRef(0);
  const footerZeroMeasureCountRef = useRef(0);
  const layoutActiveRef = useRef(true);
  const measureRetryTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const measureLayoutChromeRef = useRef<() => void>(() => undefined);
  const headerId = `${layoutId}-header`;
  const footerId = `${layoutId}-footer`;

  const clearMeasureRetryTimer = useCallback(() => {
    if (!measureRetryTimerRef.current) return;

    clearTimeout(measureRetryTimerRef.current);
    measureRetryTimerRef.current = undefined;
  }, []);

  const scheduleMeasureRetry = useCallback(() => {
    clearMeasureRetryTimer();
    measureRetryTimerRef.current = setTimeout(() => {
      measureRetryTimerRef.current = undefined;
      if (!layoutActiveRef.current) return;

      measureLayoutChromeRef.current();
    }, ZERO_HEIGHT_MEASURE_RETRY_DELAY_MS);
  }, [clearMeasureRetryTimer]);

  const commitHeaderHeight = useCallback((nextHeight: number) => {
    headerHeightRef.current = nextHeight;
    setHeaderHeight((currentHeight) => (
      Math.abs(currentHeight - nextHeight) > 0.5 ? nextHeight : currentHeight
    ));
  }, []);

  const commitFooterHeight = useCallback((nextHeight: number) => {
    footerHeightRef.current = nextHeight;
    setFooterHeight((currentHeight) => (
      Math.abs(currentHeight - nextHeight) > 0.5 ? nextHeight : currentHeight
    ));
  }, []);

  // 重新测量顶部和底部固定区域高度，供中间占位和滚动容器使用。
  const measureLayoutChrome = useCallback(() => {
    Taro.nextTick(() => {
      const query = Taro.createSelectorQuery();
      query.select(`#${headerId}`).boundingClientRect();
      query.select(`#${footerId}`).boundingClientRect();
      query.exec((results: Array<LayoutRect | null | undefined>) => {
        const [headerRect, footerRect] = results;
        const nextViewportHeight = resolveWindowHeight();
        const measuredHeaderHeight = resolveRectHeight(headerRect);
        const measuredFooterHeight = resolveRectHeight(footerRect);
        const headerMeasurement = resolveChromeSlotMeasurement({
          hasContent: hasHeaderContent,
          measuredHeight: measuredHeaderHeight,
          currentHeight: headerHeightRef.current,
          zeroMeasureCountRef: headerZeroMeasureCountRef,
        });
        const footerMeasurement = resolveChromeSlotMeasurement({
          hasContent: hasFooterContent,
          measuredHeight: measuredFooterHeight,
          currentHeight: footerHeightRef.current,
          zeroMeasureCountRef: footerZeroMeasureCountRef,
        });
        const nextChromeMeasured = headerMeasurement.ready && footerMeasurement.ready;
        const nextChromeCacheable = headerMeasurement.cacheable && footerMeasurement.cacheable;

        if (chromeCacheKey && nextChromeMeasured && nextChromeCacheable) {
          pageLayoutChromeCache.set(chromeCacheKey, {
            headerHeight: headerMeasurement.height,
            footerHeight: footerMeasurement.height,
            hasHeader: hasHeaderContent,
            hasFooter: hasFooterContent,
            hasTabBar,
            bottomSafeAreaNeeded,
            signature: chromeCacheSignature,
          });
        }
        setViewportHeight((currentHeight) => (
          Math.abs(currentHeight - nextViewportHeight) > 0.5 ? nextViewportHeight : currentHeight
        ));
        commitHeaderHeight(headerMeasurement.height);
        commitFooterHeight(footerMeasurement.height);
        if (nextChromeMeasured) {
          setChromeMeasured(true);
        }
        if (headerMeasurement.shouldRetry || footerMeasurement.shouldRetry) {
          scheduleMeasureRetry();
        }
      });
    });
  }, [
    bottomSafeAreaNeeded,
    chromeCacheKey,
    chromeCacheSignature,
    commitFooterHeight,
    commitHeaderHeight,
    footerId,
    hasFooterContent,
    hasHeaderContent,
    hasTabBar,
    headerId,
    scheduleMeasureRetry,
  ]);

  measureLayoutChromeRef.current = measureLayoutChrome;

  useResize(() => {
    if (layoutActive) {
      measureLayoutChrome();
    }
  });

  useDidShow(() => {
    layoutActiveRef.current = true;
    setLayoutActive(true);
    measureLayoutChrome();
  });

  useDidHide(() => {
    layoutActiveRef.current = false;
    clearMeasureRetryTimer();
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

  // 首次测量前 header spacer 还没落位，用白色遮罩挡住主内容轻微跳动，测量完成后淡出。
  useEffect(() => {
    if (!chromeMeasured) return undefined;

    const coverTimer = setTimeout(() => {
      setMeasureCoverVisible(false);
    }, 220);

    return () => {
      clearTimeout(coverTimer);
    };
  }, [chromeMeasured]);

  useEffect(() => () => {
    clearMeasureRetryTimer();
  }, [clearMeasureRetryTimer]);

  const resolvedHeaderHeight = hasHeaderContent ? headerHeight : 0;
  const resolvedFooterHeight = hasFooterContent ? footerHeight : 0;
  const scrollContentHeight = Math.max(viewportHeight - resolvedHeaderHeight, 0);
  const plainContentHeight = Math.max(viewportHeight - resolvedHeaderHeight - resolvedFooterHeight, 0);
  const layoutStyle = {
    '--page-layout-header-height': `${resolvedHeaderHeight}px`,
    '--page-layout-footer-height': `${resolvedFooterHeight}px`,
    '--page-layout-content-height': `${scrollContentHeight}px`,
    '--page-layout-body-height': `${plainContentHeight}px`,
  } as CSSProperties;
  const scrollViewStyle: ScrollViewProps['style'] = hasScrollView
    ? typeof scrollViewProps?.style === 'string'
      ? `${scrollViewProps.style};height:${scrollContentHeight}px;`
      : {
          ...scrollViewProps?.style,
          height: `${scrollContentHeight}px`,
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
    <View className={layoutClassName} style={layoutStyle}>
      {header ? (
        <View className="page-layout__header" id={headerId}>
          {header}
        </View>
      ) : null}
      {hasScrollView ? (
        <>
          {resolvedHeaderHeight > 0 ? (
            <View className="page-layout__content-spacer page-layout__content-spacer--header" style={{ height: `${resolvedHeaderHeight}px` }} />
          ) : null}
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
              {children}
              {resolvedFooterHeight > 0 ? (
                <View className="page-layout__content-spacer page-layout__content-spacer--footer" style={{ height: `${resolvedFooterHeight}px` }} />
              ) : null}
              {tabBar ? <View className="page-layout__content-spacer page-layout__content-spacer--tabbar" /> : null}
              {bottomSafeAreaNeeded ? <View className="page-layout__content-spacer page-layout__content-spacer--safe-bottom" /> : null}
            </View>
          </ScrollView>
        </>
      ) : (
        <View className="page-layout__content">
          {resolvedHeaderHeight > 0 ? (
            <View className="page-layout__content-spacer page-layout__content-spacer--header" style={{ height: `${resolvedHeaderHeight}px` }} />
          ) : null}
          {children}
          {resolvedFooterHeight > 0 ? (
            <View className="page-layout__content-spacer page-layout__content-spacer--footer" style={{ height: `${resolvedFooterHeight}px` }} />
          ) : null}
          {tabBar ? <View className="page-layout__content-spacer page-layout__content-spacer--tabbar" /> : null}
          {bottomSafeAreaNeeded ? <View className="page-layout__content-spacer page-layout__content-spacer--safe-bottom" /> : null}
        </View>
      )}
      {hasFooterContent ? (
        <View className={classNames('page-layout__footer', hasFooterContent && 'page-layout__footer--content')} id={footerId}>
          {footerNode}
          {bottomSafeAreaNeeded && !tabBar ? <View className="page-layout__footer-safe-bottom-spacer" /> : null}
        </View>
      ) : null}
      {share ? <View className="page-layout__share">{share}</View> : null}
      {tabBar ? <View className="page-layout__tabbar">{tabBar}</View> : null}
      {measureCoverVisible ? (
        <View
          className={classNames(
            'page-layout__measure-cover',
            chromeMeasured && 'page-layout__measure-cover--hidden',
          )}
        />
      ) : null}
      {runtimeNode}
    </View>
  );
}
