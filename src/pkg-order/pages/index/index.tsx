import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { showWechatToast } from '@/core/utils/wechat-actions';
import { fetchOrderHomeData, type OrderHomeData } from '@/pkg-order/services';
import './index.scss';

function resolveOrderActionRoute(actionText: string) {
  if (actionText === '去评价') return MINI_PACKAGE_ROUTES.orderReviewCreate;
  if (actionText === '查看物流') return MINI_PACKAGE_ROUTES.orderLogistics;
  if (actionText === '申请售后') return MINI_PACKAGE_ROUTES.orderAftersaleType;
  if (actionText === '取消订单') return MINI_PACKAGE_ROUTES.orderCancel;
  if (actionText === '查看详情') return MINI_PACKAGE_ROUTES.orderDetail;
  return '';
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
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchOrderHomeData();
      const requestedTabKey = Taro.getCurrentInstance().router?.params?.tab;
      const matchedTab = nextData.tabs.find((tab) => tab.key === requestedTabKey);
      const nextActiveTabKey = matchedTab?.key ?? nextData.tabs[0]?.key ?? 'all';
      setPageData(nextData);
      setActiveTabKey(nextActiveTabKey);
    },
    loginRequired: true,
    loginReason: '登录后可查看订单',
  });

  const visibleSections = useMemo(() => {
    if (!pageData) return [];
    if (activeTabKey === 'all') return pageData.sections;
    return pageData.sections.filter((section) => section.tabKey === activeTabKey);
  }, [activeTabKey, pageData]);

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;
    const emptyCopy = resolveOrderEmptyCopy(activeTabKey);

    return (
      <View className="_pg">
        <PageShell title="我的订单" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-tabs">
              {pageData.tabs.map((tab) => {
                const active = tab.key === activeTabKey;

                return (
                  <View
                    className={`_pg-tabs_item ${active ? '_pg-tabs_item--active' : ''}`}
                    key={tab.key}
                    onClick={() => setActiveTabKey(tab.key)}
                  >
                    <Text>{tab.text}</Text>
                    {active ? <View className="_pg-tabs_indicator" /> : null}
                  </View>
                );
              })}
            </View>

            {visibleSections.length > 0 ? (
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
                              const nextUrl = item.actionText === '查看详情' ? `${nextRoute}?orderId=${item.id}` : nextRoute;
                              Taro.navigateTo({ url: nextUrl });
                              return;
                            }

                            void showWechatToast(`已选择${item.actionText}`);
                          }}
                        >
                          {item.actionText}
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
          </View>
        </PageShell>
      </View>
    );
  });
});

export default OrderIndexPage;
