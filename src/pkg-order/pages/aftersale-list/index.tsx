import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { FilterTabs } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAftersaleListData, type OrderAftersaleListData } from '@/pkg-order/services/aftersale-list';
import './index.scss';

const AftersaleListPage = observer(function AftersaleListPage() {
  const [pageData, setPageData] = useState<OrderAftersaleListData>();
  const [activeTabKey, setActiveTabKey] = useState('all');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchAftersaleListData();
      setPageData(nextData);
      setActiveTabKey(nextData.tabs[0]?.key ?? 'all');
    },
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
              {visibleRecords.map((record) => {
                const product = record.order.products[0];

                return (
                  <View
                    className="_pg-record"
                    key={record.id}
                    onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderAftersaleProgress })}
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
                      <Text className="_pg-record_quantity">x{product?.quantity || 1}</Text>
                    </View>

                    <View className="_pg-record_meta">
                      <Text className="_pg-record_desc">{record.typeText} · {record.statusDesc}</Text>
                      <Text className="_pg-record_time">{record.createdAt}</Text>
                    </View>

                    <View className="_pg-record_footer">
                      <View className="_pg-record_button">
                        <Text>{record.buttonText}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AftersaleListPage;
