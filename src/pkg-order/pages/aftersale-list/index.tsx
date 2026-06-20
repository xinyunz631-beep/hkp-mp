import { useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppImage } from '@/core/components/AppImage';
import { FilterTabs } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { fetchAftersaleListData, type OrderAftersaleListData } from '@/pkg-order/services/aftersale-list';
import './index.scss';

// 售后记录可直接回到订单详情，继续查看订单里的优惠券使用和返还状态。
function resolveOrderDetailRoute(orderId: string) {
  return `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(orderId)}`;
}

const AftersaleListPage = observer(function AftersaleListPage() {
  const [pageData, setPageData] = useState<OrderAftersaleListData>();
  const [activeTabKey, setActiveTabKey] = useState('all');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchAftersaleListData();
      setPageData(nextData);
      setActiveTabKey(nextData.tabs[0]?.key ?? 'all');
    },
    loginRequired: true,
    loginReason: '登录后可查看售后记录',
  });

  const visibleRecords = useMemo(() => {
    if (!pageData) return [];
    if (activeTabKey === 'all') return pageData.records;
    return pageData.records.filter((record) => record.tabKey === activeTabKey);
  }, [activeTabKey, pageData]);

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell title="售后列表" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <FilterTabs
              className="_pg-tabs"
              tabs={pageData.tabs}
              activeKey={activeTabKey}
              onChange={setActiveTabKey}
            />

            <View className="_pg-records">
              {visibleRecords.length > 0 ? visibleRecords.map((record) => {
                const product = record.order.products[0];

                return (
                  <View
                    className="_pg-record"
                    key={record.id}
                    onClick={() => navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderAftersaleProgress}?orderId=${encodeURIComponent(record.order.id)}`)}
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
                      <Text className="_pg-record_desc">{record.typeText} · {record.statusDesc}</Text>
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
                      <View
                        className="_pg-record_button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderAftersaleProgress}?orderId=${encodeURIComponent(record.order.id)}`);
                        }}
                      >
                        <Text>{record.buttonText}</Text>
                      </View>
                    </View>
                  </View>
                );
              }) : (
                <BaseEmpty
                  className="_pg-empty"
                  title="暂无商城售后记录"
                  description="当前只展示真实退款/售后订单，未进入退款流程的商城订单不会出现在这里。"
                />
              )}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AftersaleListPage;
