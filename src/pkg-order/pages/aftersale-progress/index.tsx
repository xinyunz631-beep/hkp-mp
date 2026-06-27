import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { OrderCard } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { fetchAftersaleProgressData, type OrderAftersaleProgressData } from '@/pkg-order/services/aftersale-progress';
import './index.scss';

// 售后页继续回到原订单详情，便于用户核对订单里的优惠券使用和返还结果。
function resolveOrderDetailRoute(orderId: string) {
  return `${MINI_PACKAGE_ROUTES.orderDetail}?orderId=${encodeURIComponent(orderId)}`;
}

function resolveCouponDetailRoute(couponNo: string) {
  return `${MINI_PACKAGE_ROUTES.memberCouponDetail}?id=${encodeURIComponent(couponNo)}`;
}

function resolveAftersaleListRoute(orderId: string) {
  return `${MINI_PACKAGE_ROUTES.orderAftersaleList}?orderId=${encodeURIComponent(orderId)}`;
}

const AftersaleProgressPage = observer(function AftersaleProgressPage() {
  const [pageData, setPageData] = useState<OrderAftersaleProgressData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const params = Taro.getCurrentInstance().router?.params ?? {};
      const nextData = await fetchAftersaleProgressData({
        orderId: params.orderId,
        typeText: params.type ? decodeURIComponent(params.type) : undefined,
        reasonText: params.reason ? decodeURIComponent(params.reason) : undefined,
      });
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可查看售后进度',
  });

  function handleCouponPress(couponNo: string) {
    navigateToMiniRoute(resolveCouponDetailRoute(couponNo));
  }

  function renderCouponField(item: OrderAftersaleProgressData['couponFields'][number]) {
    return (
      <View className="_pg-meta_row _pg-meta_row--coupon" key={item.label}>
        <Text className="_pg-meta_label">{item.label}</Text>
        {item.couponLinks?.length ? (
          <View className="_pg-coupon-links">
            {item.couponLinks.map((link) => (
              <View className="_pg-coupon-links_item" key={`${item.label}-${link.couponNo}-${link.displayText || ''}-${link.detailText || ''}`}>
                <View className="_pg-coupon-links_chip" onClick={() => handleCouponPress(link.couponNo)}>
                  <Text className="_pg-coupon-links_chip-text">{link.displayText || link.couponNo}</Text>
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
          title="售后进度"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <View className="_pg-footer">
              <View
                className="_pg-footer_button _pg-footer_button--ghost"
                onClick={() => navigateToMiniRoute(resolveOrderDetailRoute(pageData.order.id))}
              >
                查看订单
              </View>
              <View
                className="_pg-footer_button"
                onClick={() => navigateToMiniRoute(resolveAftersaleListRoute(pageData.order.id))}
              >
                {pageData.primaryButtonText}
              </View>
            </View>
          )}
        >
          <View className="_pg-content">
            <View className="_pg-status">
              <Text className="_pg-status_title">{pageData.statusText}</Text>
              <Text className="_pg-status_desc">{pageData.statusDesc}</Text>
            </View>

            <OrderCard
              order={pageData.order}
              className="_pg-order-card"
              onClick={() => navigateToMiniRoute(resolveOrderDetailRoute(pageData.order.id))}
            />

            {pageData.couponFields.length ? (
              <View className="_pg-card">
                <Text className="_pg-card_title">优惠券处理</Text>
                <View className="_pg-meta">
                  {pageData.couponFields.map(renderCouponField)}
                </View>
              </View>
            ) : null}

            <View className="_pg-card">
              <Text className="_pg-card_title">售后信息</Text>
              <View className="_pg-meta">
                <View className="_pg-meta_row">
                  <Text className="_pg-meta_label">售后单号</Text>
                  <Text className="_pg-meta_value">{pageData.serviceNo}</Text>
                </View>
                <View className="_pg-meta_row">
                  <Text className="_pg-meta_label">售后类型</Text>
                  <Text className="_pg-meta_value">{pageData.typeText}</Text>
                </View>
                <View className="_pg-meta_row">
                  <Text className="_pg-meta_label">退款金额</Text>
                  <Text className="_pg-meta_value _pg-meta_value--accent">{pageData.refundAmountText}</Text>
                </View>
                <View className="_pg-meta_row">
                  <Text className="_pg-meta_label">申请原因</Text>
                  <Text className="_pg-meta_value">{pageData.reasonText}</Text>
                </View>
              </View>
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_title">处理进度</Text>
              <View className="_pg-steps">
                {pageData.progress.map((step, index) => (
                  <View className="_pg-steps_item" key={step.id}>
                    <View className="_pg-steps_axis">
                      <View className={`_pg-steps_dot ${index < 2 ? '_pg-steps_dot--active' : ''}`} />
                      {index < pageData.progress.length - 1 ? <View className="_pg-steps_line" /> : null}
                    </View>
                    <View className="_pg-steps_main">
                      <Text className={`_pg-steps_title ${index < 2 ? '_pg-steps_title--active' : ''}`}>
                        {step.title}
                      </Text>
                      <Text className="_pg-steps_time">{step.timeText}</Text>
                      {step.detailText ? <Text className="_pg-steps_desc">{step.detailText}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_title">补充信息</Text>
              <View className="_pg-meta">
                {pageData.fields.map((field) => (
                  <View className="_pg-meta_row" key={field.label}>
                    <Text className="_pg-meta_label">{field.label}</Text>
                    <Text className="_pg-meta_value">{field.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default AftersaleProgressPage;
