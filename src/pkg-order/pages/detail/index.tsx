import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { useState } from 'react';
import { fetchDetailData, type OrderDetailData } from '@/pkg-order/services/detail';
import './index.scss';

const DetailPage = observer(function DetailPage() {
  const [detailData, setDetailData] = useState<OrderDetailData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const orderId = Taro.getCurrentInstance().router?.params?.orderId;
      const nextData = await fetchDetailData(orderId);
      setDetailData(nextData);
    },
  });

  return pageRuntime.renderPage(() => {
    if (!detailData) return null;

    return (
      <View className="_pg">
        <PageShell title="订单详情" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-status-card">
              <Text className="_pg-status-card_title">{detailData.statusText}</Text>
              <View className="_pg-status-card_amount">
                <Text className="_pg-status-card_label">实付金额</Text>
                <Text className="_pg-status-card_value">{detailData.paidAmountText}</Text>
              </View>
            </View>

            <View className="_pg-card">
              <View className="_pg-card_header">
                <Text className="_pg-card_title">{detailData.title}</Text>
                <Text className="_pg-card_quantity">{detailData.quantityText}</Text>
              </View>
              {detailData.productFields.map((item) => (
                <View className="_pg-line-row" key={item.label}>
                  <Text className="_pg-line-row_label">{item.label}</Text>
                  <Text className="_pg-line-row_value">{item.value}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-card">
              {detailData.ticketFields.map((item) => (
                <View className="_pg-line-row" key={item.label}>
                  <Text className="_pg-line-row_label">{item.label}</Text>
                  <Text className="_pg-line-row_value">{item.value}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-card">
              <Text className="_pg-card_section-title">取票信息</Text>
              {detailData.contactFields.map((item) => (
                <View className="_pg-line-row" key={item.label}>
                  <Text className="_pg-line-row_label">{item.label}</Text>
                  <Text className="_pg-line-row_value">{item.value}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-card">
              {detailData.amountFields.map((item) => (
                <View className="_pg-line-row" key={item.label}>
                  <Text className="_pg-line-row_label">{item.label}</Text>
                  <Text className="_pg-line-row_value">{item.value}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-card _pg-card--last">
              {detailData.orderFields.map((item) => (
                <View className="_pg-order-meta" key={item.label}>
                  <Text className="_pg-order-meta_label">{item.label}：</Text>
                  <Text className="_pg-order-meta_value">{item.value}</Text>
                </View>
              ))}
              <View
                className="_pg-footer-action"
                onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderAftersaleType })}
              >
                {detailData.refundButtonText}
              </View>
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default DetailPage;
