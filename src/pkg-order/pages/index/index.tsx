import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchOrderHomeData, type OrderHomeData } from '@/pkg-order/services';
import './index.scss';

function showComingSoon(title: string) {
  Taro.showToast({ title, icon: 'none' });
}

function resolveOrderActionRoute(actionText: string) {
  if (actionText === '去评价') return MINI_PACKAGE_ROUTES.orderReviewCreate;
  if (actionText === '查看物流') return MINI_PACKAGE_ROUTES.orderLogistics;
  return '';
}

const OrderIndexPage = observer(function OrderIndexPage() {
  const [pageData, setPageData] = useState<OrderHomeData>();
  const [activeTabKey, setActiveTabKey] = useState('all');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchOrderHomeData();
      setPageData(nextData);
      setActiveTabKey(nextData.tabs[0]?.key ?? 'all');
    },
  });

  const visibleSections = useMemo(() => {
    if (!pageData) return [];
    if (activeTabKey === 'all') return pageData.sections;
    return pageData.sections.slice(0, 1);
  }, [activeTabKey, pageData]);

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    return (
      <View className="_pg">
        <PageShell title="我的订单" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-tabs">
              {pageData.tabs.map((tab) => (
                <View
                  className={`_pg-tabs_item ${tab.key === activeTabKey ? '_pg-tabs_item--active' : ''}`}
                  key={tab.key}
                  onClick={() => setActiveTabKey(tab.key)}
                >
                  <Text>{tab.text}</Text>
                </View>
              ))}
            </View>

            {visibleSections.map((section) => (
              <View className="_pg-section" key={section.id}>
                <View className="_pg-section_header">
                  <Text className="_pg-section_date">{section.dateText}</Text>
                  <Text className="_pg-section_status">{section.statusText}</Text>
                </View>

                {section.items.map((item) => (
                  <View
                    className="_pg-order-item"
                    key={item.id}
                    onClick={() => Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${item.id}` })}
                  >
                    <AppImage className="_pg-order-item_image" src={item.imageSrc} mode="aspectFill" />
                    <View className="_pg-order-item_main">
                      <Text className="_pg-order-item_title">{item.title}</Text>
                      {item.subtitle ? <Text className="_pg-order-item_subtitle">{item.subtitle}</Text> : null}
                      {item.extraText ? <Text className="_pg-order-item_extra">{item.extraText}</Text> : null}
                      <Text className="_pg-order-item_price">{item.priceText}</Text>
                    </View>
                    <View className="_pg-order-item_aside">
                      <Text className="_pg-order-item_quantity">x{item.quantity}</Text>
                      <View
                        className="_pg-order-item_button"
                        onClick={(event) => {
                          event.stopPropagation();
                          const nextRoute = resolveOrderActionRoute(item.actionText);

                          if (nextRoute) {
                            Taro.navigateTo({ url: nextRoute });
                            return;
                          }

                          showComingSoon(`${item.actionText}即将开放`);
                        }}
                      >
                        {item.actionText}
                      </View>
                    </View>
                  </View>
                ))}

                {section.totalText ? <Text className="_pg-section_total">{section.totalText}</Text> : null}
              </View>
            ))}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default OrderIndexPage;
