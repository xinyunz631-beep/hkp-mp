import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { useState } from 'react';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { requestWechatPayment, showWechatToast } from '@/core/utils/wechat-actions';
import { payPendingMallOrder } from '@/pkg-order/services/checkout';
import { fetchDetailData, type OrderDetailData } from '@/pkg-order/services/detail';
import './index.scss';

function formatPayExpireAt(payExpireAt?: string) {
  if (!payExpireAt) return '30分钟内';

  const expireDate = new Date(payExpireAt);
  if (Number.isNaN(expireDate.getTime())) return '30分钟内';

  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${pad(expireDate.getHours())}:${pad(expireDate.getMinutes())}前`;
}

function resolveContactSectionTitle(detailData: OrderDetailData) {
  const fieldText = [
    ...detailData.productFields,
    ...detailData.contactFields,
  ].map((field) => `${field.label}${field.value}`).join('');

  if (/收货|配送/.test(fieldText)) return '收货信息';
  if (/入住|离店|房间/.test(fieldText)) return '入住信息';
  return '取票信息';
}

function resolveAmountLabel(detailData: OrderDetailData) {
  return detailData.primaryActionType === 'pay' ? '待支付金额' : '实付金额';
}

const DetailPage = observer(function DetailPage() {
  const [detailData, setDetailData] = useState<OrderDetailData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const orderId = Taro.getCurrentInstance().router?.params?.orderId;
      const nextData = await fetchDetailData(orderId);
      setDetailData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可查看订单详情',
  });

  async function handlePrimaryAction() {
    if (!detailData) return;

    if (detailData.primaryActionType === 'pay') {
      const paymentStatus = await requestWechatPayment({
        title: '继续支付',
        amount: Number(detailData.paidAmountText.replace(/[^\d.]/g, '')),
        allowPending: true,
      });

      if (paymentStatus !== 'success') {
        await showWechatToast('订单已保留，可稍后继续支付');
        return;
      }

      const nextOrder = payPendingMallOrder(detailData.id);
      if (!nextOrder) {
        await showWechatToast('订单状态更新失败，请稍后再试');
        return;
      }

      const nextData = await fetchDetailData(detailData.id);
      setDetailData(nextData);
      await showWechatToast('支付成功', 'success');
      return;
    }

    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderAftersaleType}?orderId=${encodeURIComponent(detailData.id)}`);
  }

  return pageRuntime.renderPage(() => {
    if (!detailData) return null;

    return (
      <View className="_pg">
        <PageShell title="订单详情" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-status-card">
              <Text className="_pg-status-card_title">{detailData.statusText}</Text>
              {detailData.primaryActionType === 'pay' ? (
                <Text className="_pg-status-card_deadline">请在{formatPayExpireAt(detailData.payExpireAt)}完成支付，超时订单将自动关闭</Text>
              ) : null}
              <View className="_pg-status-card_amount">
                <Text className="_pg-status-card_label">{resolveAmountLabel(detailData)}</Text>
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
              <Text className="_pg-card_section-title">{resolveContactSectionTitle(detailData)}</Text>
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
              {detailData.refundButtonText ? (
                <View
                  className="_pg-footer-action"
                  onClick={() => void handlePrimaryAction()}
                >
                  {detailData.refundButtonText}
                </View>
              ) : null}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default DetailPage;
