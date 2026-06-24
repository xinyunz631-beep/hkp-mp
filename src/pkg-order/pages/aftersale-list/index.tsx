import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppImage } from '@/core/components/AppImage';
import { FilterTabs } from '@/core/components/commerce';
import { PageHeader, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { fetchAftersaleListData, type OrderAftersaleListData } from '@/pkg-order/services/aftersale-list';
import './index.scss';

const AFTERSALE_LIST_PAGE_SIZE = 10;

// 售后记录可直接回到订单详情，继续查看订单里的优惠券使用和返还状态。
function resolveOrderDetailRoute(orderId: string) {
  return `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(orderId)}`;
}

function resolveCouponDetailRoute(couponNo: string) {
  return `${MINI_PACKAGE_ROUTES.memberCouponDetail}?id=${encodeURIComponent(couponNo)}`;
}

// 进入售后进度时透传 BFF 返回的售后类型，避免同一订单多次售后时丢上下文。
function resolveProgressRoute(record: OrderAftersaleListData['records'][number]) {
  const query = [
    `orderId=${encodeURIComponent(record.order.id)}`,
    record.typeText ? `type=${encodeURIComponent(record.typeText)}` : '',
  ].filter(Boolean).join('&');
  return `${MINI_PACKAGE_ROUTES.orderAftersaleProgress}?${query}`;
}

const AftersaleListPage = observer(function AftersaleListPage() {
  const [pageData, setPageData] = useState<OrderAftersaleListData>();
  const [activeTabKey, setActiveTabKey] = useState('all');
  const [visiblePage, setVisiblePage] = useState(1);
  const [scrollTop, setScrollTop] = useState<number>();
  const scrollTopTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const routeOrderId = Taro.getCurrentInstance().router?.params?.orderId;
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchAftersaleListData({
        orderId: routeOrderId,
      });
      setPageData(nextData);
      setActiveTabKey(nextData.tabs[0]?.key ?? 'all');
      setVisiblePage(1);
    },
    loginRequired: true,
    loginReason: '登录后可查看售后记录',
  });

  useEffect(() => () => {
    if (scrollTopTimerRef.current) {
      clearTimeout(scrollTopTimerRef.current);
    }
  }, []);

  const visibleRecords = useMemo(() => {
    if (!pageData) return [];
    const tabMatchedRecords = activeTabKey === 'all'
      ? pageData.records
      : pageData.records.filter((record) => record.tabKey === activeTabKey);

    if (!routeOrderId) return tabMatchedRecords;

    return tabMatchedRecords.filter((record) => record.order.id === routeOrderId);
  }, [activeTabKey, pageData, routeOrderId]);
  const displayedRecords = useMemo(
    () => visibleRecords.slice(0, visiblePage * AFTERSALE_LIST_PAGE_SIZE),
    [visiblePage, visibleRecords],
  );
  const hasMoreRecords = displayedRecords.length < visibleRecords.length;
  const maxVisiblePage = Math.max(1, Math.ceil(visibleRecords.length / AFTERSALE_LIST_PAGE_SIZE));

  function scrollAftersaleContentToTop() {
    if (scrollTopTimerRef.current) {
      clearTimeout(scrollTopTimerRef.current);
    }

    setScrollTop(1);
    scrollTopTimerRef.current = setTimeout(() => {
      setScrollTop(undefined);
      scrollTopTimerRef.current = undefined;
    }, 360);
  }

  function switchAftersaleTab(tabKey: string) {
    if (tabKey === activeTabKey) return;

    setActiveTabKey(tabKey);
    setVisiblePage(1);
    scrollAftersaleContentToTop();
  }

  function loadMoreAftersaleRecords() {
    if (!hasMoreRecords) return;

    setVisiblePage((currentPage) => Math.min(currentPage + 1, maxVisiblePage));
  }

  function handleCouponPress(couponNo: string) {
    navigateToMiniRoute(resolveCouponDetailRoute(couponNo));
  }

  function renderCouponField(item: OrderAftersaleListData['couponFields'][number]) {
    return (
      <View className="_pg-meta_row _pg-meta_row--coupon" key={item.label}>
        <Text className="_pg-meta_label">{item.label}</Text>
        {item.couponLinks?.length ? (
          <View className="_pg-coupon-links">
            {item.couponLinks.map((link) => (
              <View className="_pg-coupon-links_item" key={`${item.label}-${link.couponNo}-${link.detailText || ''}`}>
                <View className="_pg-coupon-links_chip" onClick={() => handleCouponPress(link.couponNo)}>
                  <Text className="_pg-coupon-links_chip-text">{link.couponNo}</Text>
                </View>
                {link.detailText ? <Text className="_pg-coupon-links_desc">{link.detailText}</Text> : null}
              </View>
            ))}
          </View>
        ) : (
          <Text className="_pg-meta_value">{item.value}</Text>
        )}
      </View>
    );
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell
          title="售后列表"
          className="_pg-shell"
          reserveTabBarSpace={false}
          scrollViewProps={{
            lowerThreshold: 180,
            ...(typeof scrollTop === 'number' ? { scrollTop, scrollWithAnimation: true } : {}),
            onScrollToLower: loadMoreAftersaleRecords,
          }}
        >
          <PageHeader>
            <FilterTabs
              className="_pg-tabs"
              tabs={pageData.tabs}
              activeKey={activeTabKey}
              onChange={switchAftersaleTab}
            />
          </PageHeader>

          <View className="_pg-content">
            {routeOrderId && pageData.couponFields.length ? (
              <View className="_pg-facts">
                <Text className="_pg-facts_title">优惠券处理</Text>
                <View className="_pg-meta">
                  {pageData.couponFields.map(renderCouponField)}
                </View>
              </View>
            ) : null}

            <View className="_pg-records">
              {displayedRecords.length > 0 ? displayedRecords.map((record) => {
                const product = record.order.products[0];

                return (
                  <View
                    className="_pg-record"
                    key={record.id}
                    onClick={() => navigateToMiniRoute(resolveProgressRoute(record))}
                  >
                    <View className="_pg-record_header">
                      <Text className="_pg-record_service-no">{record.serviceNo}</Text>
                      <Text className="_pg-record_status">{record.statusText}</Text>
                    </View>

                    <View className="_pg-record_product">
                      <AppImage
                        className="_pg-record_image"
                        src={product?.image.src || ''}
                        mode="aspectFill"
                        emptyState="error"
                      />
                      <View className="_pg-record_main">
                        <Text className="_pg-record_title">{product?.title}</Text>
                        {product?.skuText ? <Text className="_pg-record_spec">{product.skuText}</Text> : null}
                        <Text className="_pg-record_amount">{record.amountText}</Text>
                      </View>
                      {product?.quantity ? <Text className="_pg-record_quantity">x{product.quantity}</Text> : null}
                    </View>

                    <View className="_pg-record_meta">
                      <Text className="_pg-record_desc">{[record.typeText, record.statusDesc].filter(Boolean).join(' · ')}</Text>
                      <Text className="_pg-record_time">{record.createdAt}</Text>
                    </View>

                    <View className="_pg-record_footer">
                      <View
                        className="_pg-record_button _pg-record_button--ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigateToMiniRoute(resolveOrderDetailRoute(record.order.id));
                        }}
                      >
                        <Text>查看订单</Text>
                      </View>
                      {record.buttonText ? (
                        <View
                          className="_pg-record_button"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigateToMiniRoute(resolveProgressRoute(record));
                          }}
                        >
                          <Text>{record.buttonText}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              }) : (
                <BaseEmpty
                  className="_pg-empty"
                  title={routeOrderId ? '当前订单暂无售后记录' : '暂无售后记录'}
                  description={routeOrderId
                    ? '订单进入真实售后流程后，会在这里展示处理进度和退款结果。'
                    : '当前只展示真实退款/售后订单，未进入退款流程的订单不会出现在这里。'}
                />
              )}
              {displayedRecords.length > 0 ? (
                <View className="_pg-load-more">
                  <Text>{hasMoreRecords ? '继续下滑加载更多' : '没有更多售后记录了'}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AftersaleListPage;
