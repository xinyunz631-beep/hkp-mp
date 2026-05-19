import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { OrderCard } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAftersaleProgressData, type OrderAftersaleProgressData } from '@/pkg-order/services/aftersale-progress';
import './index.scss';

const AftersaleProgressPage = observer(function AftersaleProgressPage() {
  const [pageData, setPageData] = useState<OrderAftersaleProgressData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchAftersaleProgressData();
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可查看售后进度',
  });

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
                className="_pg-footer_button"
                onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderAftersaleList })}
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

            <OrderCard order={pageData.order} className="_pg-order-card" />

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
