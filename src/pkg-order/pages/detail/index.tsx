import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { useEffect, useRef, useState } from 'react';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { requestWechatPayment, showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { syncBffPaymentStatusSilently } from '@/core/services/bff-api';
import { payBffOrder, refundBffOrder } from '@/core/services/bff-order-api';
import { fetchDetailData, type OrderDetailData } from '@/pkg-order/services/detail';
import './index.scss';

const TICKET_ORDER_DETAIL_POLL_INTERVAL_MS = 3000;
const TICKET_ORDER_DETAIL_POLLING_STATUSES = [
  'PAYING',
  'PAID',
  'WAIT_USE',
  'FULFILLING',
  'PART_USED',
  'PARTIALLY_USED',
  'PARTIALLYUSED',
];

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

function resolveCouponDetailRoute(couponNo: string) {
  return `${MINI_PACKAGE_ROUTES.memberCouponDetail}?id=${encodeURIComponent(couponNo)}`;
}

// 判断票务凭证页是否需要继续静默刷新，覆盖异步出票和停留券码页被外部核销的场景。
function shouldPollTicketOrderDetail(detailData?: OrderDetailData) {
  if (!detailData) return false;
  if (detailData.sceneType !== 'TICKET') return false;

  const normalizedStatus = String(detailData.orderStatus || '').toUpperCase();
  return TICKET_ORDER_DETAIL_POLLING_STATUSES.includes(normalizedStatus);
}

function resolveTicketOrderPollingSnapshot(detailData?: OrderDetailData) {
  if (!detailData) return '';

  return JSON.stringify({
    orderStatus: detailData.orderStatus || '',
    statusText: detailData.statusText || '',
    primaryActionType: detailData.primaryActionType || '',
    refundButtonText: detailData.refundButtonText || '',
    ticketInstances: detailData.ticketInstances.map((ticket) => ({
      ticketNo: ticket.ticketNo,
      qrCodePayload: ticket.qrCodePayload,
      hasVoucherCode: Boolean(ticket.qrCodePayload || ticket.qrImageSrc),
      statusText: ticket.statusText,
      useTimesText: ticket.useTimesText,
    })),
  });
}

const DetailPage = observer(function DetailPage() {
  const [detailData, setDetailData] = useState<OrderDetailData>();
  const pageVisibleRef = useRef(true);
  const pollingRequestRef = useRef(false);
  const pollingSnapshotRef = useRef('');

  function applyDetailData(nextData: OrderDetailData) {
    pollingSnapshotRef.current = resolveTicketOrderPollingSnapshot(nextData);
    setDetailData(nextData);
  }

  function handleCouponPress(couponNo: string) {
    navigateToMiniRoute(resolveCouponDetailRoute(couponNo));
  }

  async function loadDetailData(options: { showErrorToast?: boolean; orderId?: string; skipApplyWhenHidden?: boolean } = {}) {
    const orderId = options.orderId || Taro.getCurrentInstance().router?.params?.orderId;
    const nextData = await fetchDetailData(orderId, {
      showErrorToast: options.showErrorToast,
    });
    if (options.skipApplyWhenHidden && !pageVisibleRef.current) return nextData;
    applyDetailData(nextData);
    return nextData;
  }

  async function pollTicketOrderDetailSilently(orderId: string) {
    const probeData = await fetchDetailData(orderId, { showErrorToast: false });
    if (!pageVisibleRef.current) return;

    const nextSnapshot = resolveTicketOrderPollingSnapshot(probeData);

    if (nextSnapshot !== pollingSnapshotRef.current) {
      await loadDetailData({ showErrorToast: false, orderId, skipApplyWhenHidden: true });
    }
  }

  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await loadDetailData();
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可查看订单详情',
  });

  useDidShow(() => {
    pageVisibleRef.current = true;
  });

  useDidHide(() => {
    pageVisibleRef.current = false;
  });

  useEffect(() => {
    if (!detailData || !shouldPollTicketOrderDetail(detailData)) return undefined;

    const pollingOrderId = detailData.id;
    const timer = setInterval(() => {
      if (!pageVisibleRef.current || pollingRequestRef.current) return;

      pollingRequestRef.current = true;
      pollTicketOrderDetailSilently(pollingOrderId)
        .catch(() => undefined)
        .finally(() => {
          pollingRequestRef.current = false;
        });
    }, TICKET_ORDER_DETAIL_POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [detailData?.id, detailData?.orderStatus, detailData?.sceneType, detailData?.ticketInstances.length]);

  async function handlePrimaryAction() {
    if (!detailData) return;

    if (detailData.primaryActionType === 'pay') {
      const payment = await payBffOrder(detailData.id, 'WECHAT');
      const paymentParams = payment.prepay?.paymentParams || payment.prepay?.payParams;
      if (!paymentParams) {
        await showWechatToast('支付参数缺失，请稍后再试');
        return;
      }
      const paymentStatus = await requestWechatPayment({
        title: '继续支付',
        amount: Number(detailData.paidAmountText.replace(/[^\d.]/g, '')),
        paymentParams: paymentParams as unknown as Parameters<typeof Taro.requestPayment>[0],
      });

      if (paymentStatus !== 'success') {
        await showWechatToast('支付未完成');
        return;
      }

      await syncBffPaymentStatusSilently(payment.prepay?.payNo);
      const nextData = await fetchDetailData(detailData.id);
      applyDetailData(nextData);
      await showWechatToast('支付成功', 'success');
      return;
    }

    if (detailData.primaryActionType === 'refund') {
      const confirmed = await showWechatConfirm({
        title: '申请退款',
        content: '确认提交整单退款申请？退款金额和可退状态将以后端校验结果为准。',
        confirmText: '提交',
        cancelText: '再看看',
      });

      if (!confirmed) return;

      await refundBffOrder(detailData.id, { reason: '用户小程序申请退款' });
      const nextData = await fetchDetailData(detailData.id);
      applyDetailData(nextData);
      await showWechatToast('退款申请已提交', 'success');
      return;
    }

    if (detailData.primaryActionType === 'aftersale') {
      navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderAftersaleType}?orderId=${encodeURIComponent(detailData.id)}`);
      return;
    }

    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.orderAftersaleType}?orderId=${encodeURIComponent(detailData.id)}`);
  }

  function renderCouponField(item: OrderDetailData['couponFields'][number]) {
    return (
      <View className="_pg-line-row" key={item.label}>
        <Text className="_pg-line-row_label">{item.label}</Text>
        <View className="_pg-line-row_content">
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
            <Text className="_pg-line-row_value">{item.value}</Text>
          )}
        </View>
      </View>
    );
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
                {detailData.quantityText ? <Text className="_pg-card_quantity">{detailData.quantityText}</Text> : null}
              </View>
              {detailData.productFields.map((item) => (
                <View className="_pg-line-row" key={item.label}>
                  <Text className="_pg-line-row_label">{item.label}</Text>
                  <Text className="_pg-line-row_value">{item.value}</Text>
                </View>
              ))}
            </View>

            {detailData.ticketInstances.length ? (
              <View className="_pg-card">
                <Text className="_pg-card_section-title">入园凭证</Text>
                {detailData.ticketInstances.map((ticket) => (
                  <View className="_pg-ticket-code" key={ticket.ticketNo || ticket.qrCodePayload}>
                    <View className="_pg-ticket-code_header">
                      <Text className="_pg-ticket-code_title">{ticket.productName}</Text>
                      <Text className="_pg-ticket-code_status">{ticket.statusText}</Text>
                    </View>
                    {ticket.qrImageSrc ? (
                      <AppImage className="_pg-ticket-code_qr" src={ticket.qrImageSrc} mode="aspectFit" emptyState="error" />
                    ) : null}
                    {ticket.qrCodePayload ? (
                      <Text className="_pg-ticket-code_payload">{ticket.qrCodePayload}</Text>
                    ) : null}
                    {ticket.ticketNo ? (
                      <View className="_pg-line-row">
                        <Text className="_pg-line-row_label">票码</Text>
                        <Text className="_pg-line-row_value">{ticket.ticketNo}</Text>
                      </View>
                    ) : null}
                    {ticket.skuName ? (
                      <View className="_pg-line-row">
                        <Text className="_pg-line-row_label">票种</Text>
                        <Text className="_pg-line-row_value">{ticket.skuName}</Text>
                      </View>
                    ) : null}
                    {ticket.visitDate ? (
                      <View className="_pg-line-row">
                        <Text className="_pg-line-row_label">游玩日期</Text>
                        <Text className="_pg-line-row_value">{ticket.visitDate}</Text>
                      </View>
                    ) : null}
                    {ticket.validTimeText ? (
                      <View className="_pg-line-row">
                        <Text className="_pg-line-row_label">有效期</Text>
                        <Text className="_pg-line-row_value">{ticket.validTimeText}</Text>
                      </View>
                    ) : null}
                    {ticket.useTimesText ? (
                      <View className="_pg-line-row">
                        <Text className="_pg-line-row_label">次数</Text>
                        <Text className="_pg-line-row_value">{ticket.useTimesText}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}

            {detailData.ticketFields.length ? (
              <View className="_pg-card">
                {detailData.ticketFields.map((item) => (
                  <View className="_pg-line-row" key={item.label}>
                    <Text className="_pg-line-row_label">{item.label}</Text>
                    <Text className="_pg-line-row_value">{item.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {detailData.contactFields.length ? (
              <View className="_pg-card">
                <Text className="_pg-card_section-title">{resolveContactSectionTitle(detailData)}</Text>
                {detailData.contactFields.map((item) => (
                  <View className="_pg-line-row" key={item.label}>
                    <Text className="_pg-line-row_label">{item.label}</Text>
                    <Text className="_pg-line-row_value">{item.value}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {detailData.couponFields.length ? (
              <View className="_pg-card">
                <Text className="_pg-card_section-title">优惠信息</Text>
                {detailData.couponFields.map(renderCouponField)}
              </View>
            ) : null}

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
