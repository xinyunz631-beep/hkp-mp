import { useEffect, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppImage } from '@/core/components/AppImage';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { fetchOrderHomeData, type OrderHomeData } from '@/pkg-order/services';
import type { OrderHomeActionData, OrderHomeItemData } from '@/pkg-order/services/model';
import './index.scss';

const ORDER_TAB_KEYS = ['all', 'pendingPay', 'pendingReceive', 'pendingReview', 'aftersale'];

function normalizeOrderTabKey(value?: string) {
  const normalizedValue = typeof value === 'string' ? value.trim() : '';
  return ORDER_TAB_KEYS.includes(normalizedValue) ? normalizedValue : 'all';
}

function resolveOrderActionRoute(actionText: string) {
  if (actionText === '去评价') return MINI_PACKAGE_ROUTES.orderReviewCreate;
  if (actionText === '查看物流') return MINI_PACKAGE_ROUTES.orderLogistics;
  if (actionText === '申请售后') return MINI_PACKAGE_ROUTES.orderAftersaleType;
  if (actionText === '继续支付') return MINI_PACKAGE_ROUTES.orderDetail;
  if (actionText === '取消订单') return MINI_PACKAGE_ROUTES.orderCancel;
  if (actionText === '查看详情') return MINI_PACKAGE_ROUTES.orderDetail;
  return '';
}

function navigateToOrderAction(route: string, orderId: string, withOrderId: boolean, itemId?: string) {
  const query: string[] = [];
  if (withOrderId) {
    query.push(`orderId=${encodeURIComponent(orderId)}`);
  }
  if (route === MINI_PACKAGE_ROUTES.orderReviewCreate && itemId) {
    query.push(`itemId=${encodeURIComponent(itemId)}`);
  }
  const nextUrl = query.length > 0 ? `${route}?${query.join('&')}` : route;
  navigateToMiniRoute(nextUrl);
}

function resolveOrderItemActions(item: OrderHomeItemData): OrderHomeActionData[] {
  if (item.actions?.length) return item.actions;
  return [{ text: item.actionText, tone: 'primary' }];
}

function shouldPassOrderId(actionText: string) {
  return ['查看详情', '继续支付', '取消订单', '申请售后', '查看物流', '去评价'].includes(actionText);
}

function resolveOrderActionClassName(action: OrderHomeActionData) {
  if (action.tone === 'default') return '_pg-order-item_button _pg-order-item_button--default';
  if (action.tone === 'danger') return '_pg-order-item_button _pg-order-item_button--danger';
  return '_pg-order-item_button _pg-order-item_button--primary';
}

function resolveOrderEmptyCopy(activeTabKey: string) {
  if (activeTabKey === 'pendingPay') {
    return {
      title: '暂无待支付订单',
      description: '提交订单后未完成支付的记录会展示在这里。',
    };
  }

  if (activeTabKey === 'pendingShip') {
    return {
      title: '暂无待发货订单',
      description: '商城商品付款后，待商家发货的记录会展示在这里。',
    };
  }

  if (activeTabKey === 'pendingReceive') {
    return {
      title: '暂无待收货订单',
      description: '已发货、待签收的商城订单会展示在这里。',
    };
  }

  if (activeTabKey === 'pendingReview') {
    return {
      title: '暂无待评价订单',
      description: '完成游玩、入住或收货后，可评价的订单会展示在这里。',
    };
  }

  return {
    title: '暂无订单',
    description: '完成购票、酒店或商城下单后，订单会展示在这里。',
  };
}

const OrderIndexPage = observer(function OrderIndexPage() {
  const [pageData, setPageData] = useState<OrderHomeData>();
  const [activeTabKey, setActiveTabKey] = useState('all');
  const [loadingMore, setLoadingMore] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const tabRequestSeqRef = useRef(0);
  const scrollTopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const requestedTabKey = Taro.getCurrentInstance().router?.params?.tab;
      const nextActiveTabKey = normalizeOrderTabKey(requestedTabKey);
      const nextData = await fetchOrderHomeData({
        tabKey: nextActiveTabKey,
      });
      setPageData(nextData);
      setActiveTabKey(nextActiveTabKey);
      setLoadingMore(false);
      setTabLoading(false);
    },
    loginRequired: true,
    loginReason: '登录后可查看订单',
  });

  useEffect(() => () => {
    if (scrollTopTimerRef.current) {
      clearTimeout(scrollTopTimerRef.current);
    }
  }, []);

  function scrollOrderContentToTop() {
    if (scrollTopTimerRef.current) {
      clearTimeout(scrollTopTimerRef.current);
    }

    setScrollTop(1);
    scrollTopTimerRef.current = setTimeout(() => {
      setScrollTop(0);
    }, 0);
  }

  async function switchOrderTab(tabKey: string) {
    if (tabKey === activeTabKey) return;

    const requestSeq = tabRequestSeqRef.current + 1;
    tabRequestSeqRef.current = requestSeq;
    setActiveTabKey(tabKey);
    setLoadingMore(false);
    setTabLoading(true);
    setPageData((currentData) => currentData ? {
      ...currentData,
      sections: [],
      page: 1,
      hasMore: false,
    } : currentData);
    scrollOrderContentToTop();

    try {
      const nextData = await fetchOrderHomeData({ tabKey });
      if (tabRequestSeqRef.current === requestSeq) {
        setPageData(nextData);
      }
    } catch {
      if (tabRequestSeqRef.current === requestSeq) {
        void showWechatToast('订单加载失败，请稍后重试');
      }
    } finally {
      if (tabRequestSeqRef.current === requestSeq) {
        setTabLoading(false);
      }
    }
  }

  async function loadMoreOrders() {
    if (!pageData?.hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const nextData = await fetchOrderHomeData({
        page: pageData.page + 1,
        pageSize: pageData.pageSize,
        tabKey: activeTabKey,
        existingSections: pageData.sections,
      });
      setPageData(nextData);
    } finally {
      setLoadingMore(false);
    }
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;
    const emptyCopy = resolveOrderEmptyCopy(activeTabKey);
    const visibleSections = tabLoading ? [] : pageData.sections;
    const contentClassName = [
      '_pg-content',
      tabLoading ? '_pg-content--loading' : '',
      !tabLoading && visibleSections.length === 0 ? '_pg-content--empty' : '',
    ].filter(Boolean).join(' ');

    return (
      <View className="_pg">
        <PageShell
          title="我的订单"
          className="_pg-shell"
          reserveTabBarSpace={false}
          scrollViewProps={{
            lowerThreshold: 180,
            scrollTop,
            scrollWithAnimation: true,
            onScrollToLower: () => void loadMoreOrders(),
          }}
        >
          <PageHeader>
            <View className="_pg-tabs">
              {pageData.tabs.map((tab) => {
                const active = tab.key === activeTabKey;

                return (
                  <View
                    className={`_pg-tabs_item ${active ? '_pg-tabs_item--active' : ''}`}
                    key={tab.key}
                    onClick={() => void switchOrderTab(tab.key)}
                  >
                    <Text>{tab.text}</Text>
                    {typeof tab.count === 'number' && tab.count > 0 ? (
                      <Text className="_pg-tabs_count">{tab.count > 99 ? '99+' : tab.count}</Text>
                    ) : null}
                    {active ? <View className="_pg-tabs_indicator" /> : null}
                  </View>
                );
              })}
            </View>
          </PageHeader>

          <View className={contentClassName}>

            {tabLoading ? (
              <View className="_pg-tab-loading">
                <Text>加载中...</Text>
              </View>
            ) : visibleSections.length > 0 ? (
              visibleSections.map((section) => (
                <View className="_pg-section" key={section.id}>
                  <View className="_pg-section_header">
                    <Text className="_pg-section_date">{section.dateText}</Text>
                    <Text className="_pg-section_status">{section.statusText}</Text>
                  </View>

                  {section.items.map((item) => (
                    <View
                      className="_pg-order-item"
                      key={item.id}
                      onClick={() => {
                        navigateToOrderAction(MINI_PACKAGE_ROUTES.orderDetail, item.orderId ?? item.id, true);
                      }}
                    >
                      <AppImage className="_pg-order-item_image" src={item.imageSrc} mode="aspectFill" emptyState="error" />
                      <View className="_pg-order-item_main">
                        <Text className="_pg-order-item_title">{item.title}</Text>
                        {item.subtitle ? <Text className="_pg-order-item_subtitle">{item.subtitle}</Text> : null}
                        {item.extraText ? <Text className="_pg-order-item_extra">{item.extraText}</Text> : null}
                        <Text className="_pg-order-item_price">{item.priceText}</Text>
                      </View>
                      <View className="_pg-order-item_aside">
                        {item.quantity > 0 ? <Text className="_pg-order-item_quantity">x{item.quantity}</Text> : null}
                        <View className="_pg-order-item_actions">
                          {resolveOrderItemActions(item).map((action) => (
                            <View
                              className={resolveOrderActionClassName(action)}
                              key={action.text}
                              onClick={(event) => {
                                event.stopPropagation();
                                const nextRoute = resolveOrderActionRoute(action.text);

                                if (nextRoute) {
                                  const orderId = item.orderId ?? item.id;
                                  navigateToOrderAction(
                                    nextRoute,
                                    orderId,
                                    shouldPassOrderId(action.text),
                                    item.itemId,
                                  );
                                  return;
                                }

                                void showWechatToast(`已选择${action.text}`);
                              }}
                            >
                              {action.text}
                            </View>
                          ))}
                        </View>
                      </View>
                    </View>
                  ))}

                  {section.totalText ? <Text className="_pg-section_total">{section.totalText}</Text> : null}
                </View>
              ))
            ) : (
              <BaseEmpty
                className="_pg-empty"
                title={emptyCopy.title}
                description={emptyCopy.description}
              />
            )}

            {visibleSections.length > 0 ? (
              <View className="_pg-load-more">
                <Text>{loadingMore ? '加载中...' : pageData.hasMore ? '继续下滑加载更多' : '没有更多订单了'}</Text>
              </View>
            ) : null}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default OrderIndexPage;
