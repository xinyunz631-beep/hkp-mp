import {
  Children,
  CSSProperties,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  isValidElement,
  useCallback,
  useMemo,
  useState,
} from 'react';
import Taro from '@tarojs/taro';
import { View } from '@tarojs/components';
import { AppTabBar } from '@/core/components/AppTabBar';
import { PageLayout, type PageLayoutProps } from '@/core/components/PageLayout';
import { PageNavbar } from '@/core/components/PageNavbar';
import { usePageRuntimeRefresh } from '@/core/runtime/page-runtime-context';
import {
  resolvePageChromeMetrics,
  resolveWindowHeight,
  resolveWindowWidth,
  type PageChromeMetrics,
} from '@/core/utils/style';
import './PageShell.scss';

type PageShellScrollViewProps = NonNullable<PageLayoutProps['scrollViewProps']>;
type PageShellRefresherRefreshHandler = NonNullable<PageShellScrollViewProps['onRefresherRefresh']>;

interface PageShellProps extends PropsWithChildren {
  title: string;
  description?: string;
  // 透传到最外层 PageLayout，方便页面覆盖已有 layout 样式。
  className?: string;
  navbar?: ReactNode | false;
  navbarLeft?: ReactNode;
  navbarRight?: ReactNode;
  footer?: ReactNode;
  bottom?: ReactNode;
  share?: ReactNode;
  runtimeNode?: ReactNode;
  reserveTabBarSpace?: boolean;
  scrollView?: boolean;
  scrollViewProps?: PageLayoutProps['scrollViewProps'];
}

interface PageShellSlotProps extends PropsWithChildren {}

interface PageShellSlots {
  header?: ReactNode;
  footer?: ReactNode;
  share?: ReactNode;
  content: ReactNode[];
  hasHeader: boolean;
  hasFooter: boolean;
  hasShare: boolean;
}

// 声明页面顶部插槽，作为 PageShell 的直接子节点时会自动放在 navbar 下方。
export function PageHeader({ children }: PageShellSlotProps) {
  return <>{children}</>;
}

// 声明页面底部插槽，作为 PageShell 的直接子节点时会自动放入 PageLayout footer。
export function PageFooter({ children }: PageShellSlotProps) {
  return <>{children}</>;
}

// 声明页面相对插槽，作为 PageShell 的直接子节点时会按普通内容渲染，但层级高于 header/footer。
export function PageShare({ children }: PageShellSlotProps) {
  return <>{children}</>;
}

// PageRoot 作为 PageShare 的同义入口，方便页面按自己的语义命名。
export { PageShare as PageRoot };

// 根据页面配置决定 PageShell 是否渲染自定义导航栏。
function resolvePageShellNavbar(
  title: string,
  navbar: PageShellProps['navbar'],
  navbarLeft?: ReactNode,
  navbarRight?: ReactNode,
  refreshing?: boolean,
) {
  if (navbar === false) return undefined;
  if (navbar !== undefined) return navbar;

  return <PageNavbar title={title} left={navbarLeft} right={navbarRight} refreshing={refreshing} />;
}

// 合成 PageLayout 的 header：navbar 在上，PageHeader 声明内容在下。
function resolvePageShellLayoutHeader(
  title: string,
  navbar: PageShellProps['navbar'],
  slots: PageShellSlots,
  chromeMetrics: PageChromeMetrics,
  navbarLeft?: ReactNode,
  navbarRight?: ReactNode,
  navbarRefreshing?: boolean,
) {
  const navbarContent = resolvePageShellNavbar(title, navbar, navbarLeft, navbarRight, navbarRefreshing);

  if (!slots.hasHeader) return navbarContent;
  if (!navbarContent) {
    const customHeaderStyle: CSSProperties = {
      paddingTop: `${chromeMetrics.statusBarHeight}px`,
      paddingRight: `${chromeMetrics.menuRightReserve}px`,
    };

    return (
      <View className="page-shell__custom-header" style={customHeaderStyle}>
        {slots.header}
      </View>
    );
  }

  return (
    <>
      {navbarContent}
      {slots.header}
    </>
  );
}

// 判断节点是否为 PageShell 声明式插槽组件。
function isPageShellSlot(node: ReactNode, slotComponent: typeof PageHeader | typeof PageFooter | typeof PageShare): node is ReactElement<PageShellSlotProps> {
  return isValidElement(node) && node.type === slotComponent;
}

// 从 PageShell 直接子节点中提取 header/footer 插槽内容，剩余节点进入滚动内容。
function resolvePageShellSlots(children: ReactNode): PageShellSlots {
  const headers: ReactNode[] = [];
  const footers: ReactNode[] = [];
  const shares: ReactNode[] = [];
  const content: ReactNode[] = [];

  Children.toArray(children).forEach((child) => {
    if (isPageShellSlot(child, PageHeader)) {
      headers.push(child.props.children);
      return;
    }

    if (isPageShellSlot(child, PageFooter)) {
      footers.push(child.props.children);
      return;
    }

    if (isPageShellSlot(child, PageShare)) {
      shares.push(child.props.children);
      return;
    }

    content.push(child);
  });

  return {
    header: headers.length > 0 ? headers : undefined,
    footer: footers.length > 0 ? footers : undefined,
    share: shares.length > 0 ? shares : undefined,
    content,
    hasHeader: headers.length > 0,
    hasFooter: footers.length > 0,
    hasShare: shares.length > 0,
  };
}

function resolvePageShellChromeCacheKey(title: string) {
  return Taro.getCurrentInstance().router?.path || title;
}

function normalizeChromeMetricValue(value: number) {
  return Math.round(value * 100) / 100;
}

function resolvePageShellChromeCacheSignature(chromeMetrics: PageChromeMetrics) {
  return [
    resolveWindowWidth(),
    resolveWindowHeight(),
    chromeMetrics.statusBarHeight,
    chromeMetrics.headerHeight,
    chromeMetrics.headerContentHeight,
    chromeMetrics.headerContentTopGap,
    chromeMetrics.menuRightReserve,
  ].map(normalizeChromeMetricValue).join('|');
}

// 渲染轻量页面壳。默认不展示页面内 tabbar，仅主包指定页面显式开启。
export function PageShell({
  title,
  description,
  className,
  navbar,
  navbarLeft,
  navbarRight,
  footer,
  bottom,
  share,
  runtimeNode,
  reserveTabBarSpace = false,
  scrollView = true,
  scrollViewProps,
  children,
}: PageShellProps) {
  const [chromeMetrics] = useState(resolvePageChromeMetrics);
  const [refresherTriggered, setRefresherTriggered] = useState(false);
  const runtimeRefresh = usePageRuntimeRefresh();
  const slots = resolvePageShellSlots(children);
  const navbarRefreshing = Boolean(title && (
    refresherTriggered
    || runtimeRefresh?.refreshing
    || scrollViewProps?.refresherTriggered
  ));
  const layoutHeader = resolvePageShellLayoutHeader(
    title,
    navbar,
    slots,
    chromeMetrics,
    navbarLeft,
    navbarRight,
    navbarRefreshing,
  );
  const chromeCacheKey = resolvePageShellChromeCacheKey(title);
  const chromeCacheSignature = resolvePageShellChromeCacheSignature(chromeMetrics);
  const layoutFooter = slots.hasFooter ? slots.footer : footer ?? bottom;
  const layoutShare = slots.hasShare ? slots.share : share;
  const handleRefresherRefresh = useCallback<PageShellRefresherRefreshHandler>((event) => {
    const customRefresh = scrollViewProps?.onRefresherRefresh;

    setRefresherTriggered(true);

    void (async () => {
      try {
        if (customRefresh) {
          await customRefresh(event);
          return;
        }

        await runtimeRefresh?.reload();
      } catch {
        // initPage 的失败态由 usePageRuntime / 页面自定义 refresh handler 负责反馈。
      } finally {
        setRefresherTriggered(false);
      }
    })();
  }, [runtimeRefresh, scrollViewProps]);
  const resolvedScrollViewProps = useMemo<PageLayoutProps['scrollViewProps']>(() => {
    if (!scrollView) return undefined;

    const hasCustomRefresh = Boolean(scrollViewProps?.onRefresherRefresh);
    const hasRuntimeRefresh = Boolean(runtimeRefresh?.hasInitPage);
    const refresherEnabled = scrollViewProps?.refresherEnabled ?? (hasCustomRefresh || hasRuntimeRefresh);

    return {
      ...scrollViewProps,
      refresherEnabled,
      refresherTriggered: scrollViewProps?.refresherTriggered ?? refresherTriggered,
      onRefresherRefresh: refresherEnabled ? handleRefresherRefresh : scrollViewProps?.onRefresherRefresh,
    };
  }, [handleRefresherRefresh, refresherTriggered, runtimeRefresh, scrollView, scrollViewProps]);

  return (
    <PageLayout
      className={className}
      header={layoutHeader}
      footer={layoutFooter}
      share={layoutShare}
      tabBar={reserveTabBarSpace ? <AppTabBar /> : undefined}
      runtimeNode={runtimeNode}
      scrollViewProps={resolvedScrollViewProps}
      chromeCacheKey={chromeCacheKey}
      chromeCacheSignature={chromeCacheSignature}
    >
      <View className="page-shell">
        {slots.content.length > 0 ? <View className="page-shell__body">{slots.content}</View> : null}
      </View>
    </PageLayout>
  );
}
