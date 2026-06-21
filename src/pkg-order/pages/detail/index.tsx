import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { Canvas, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import drawQrcode from 'weapp-qrcode';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { requestWechatPayment, showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { syncBffPaymentStatusSilently } from '@/core/services/bff-api';
import { payBffOrder, refundBffOrder } from '@/core/services/bff-order-api';
import { fetchDetailData, type OrderDetailData } from '@/pkg-order/services/detail';
import './index.scss';

const TICKET_ORDER_DETAIL_POLL_INTERVAL_MS = 3000;
const TICKET_CODE_CANVAS_ID_PREFIX = 'ticket-order-code-canvas';
const TICKET_CODE_CANVAS_SIZE_PX = 300;
const WEAPP_DESIGN_WIDTH = 750;
const TICKET_ORDER_DETAIL_POLLING_STATUSES = [
  'PENDING_PAYMENT',
  'PAYING',
  'PAID',
  'WAIT_USE',
  'FULFILLING',
  'PART_USED',
  'PARTIALLY_USED',
  'PARTIALLYUSED',
  'REFUNDING',
  'REFUND_PENDING',
  'REFUND_PROCESSING',
];
const TICKET_ORDER_DETAIL_TERMINAL_TICKET_STATUS_TEXTS = ['已核销', '已作废', '已退款', '已过期'];

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

function resolveTicketCodeCanvasSizeRpx() {
  try {
    const systemInfo = Taro.getSystemInfoSync();
    if (!systemInfo.windowWidth) return TICKET_CODE_CANVAS_SIZE_PX * 2;

    return Math.round((TICKET_CODE_CANVAS_SIZE_PX * WEAPP_DESIGN_WIDTH) / systemInfo.windowWidth);
  } catch {
    return TICKET_CODE_CANVAS_SIZE_PX * 2;
  }
}

function resolveTicketQrKey(ticket: OrderDetailData['ticketInstances'][number], index: number) {
  return `${ticket.ticketNo || 'ticket'}-${ticket.qrCodePayload || ticket.qrImageSrc || 'code'}-${index}`;
}

function resolveTicketQrCanvasId(index: number) {
  return `${TICKET_CODE_CANVAS_ID_PREFIX}-${index}`;
}

function convertTicketQrCanvasToImage(canvasId: string) {
  return new Promise<string>((resolve, reject) => {
    Taro.canvasToTempFilePath({
      canvasId,
      x: 0,
      y: 0,
      width: TICKET_CODE_CANVAS_SIZE_PX,
      height: TICKET_CODE_CANVAS_SIZE_PX,
      destWidth: TICKET_CODE_CANVAS_SIZE_PX,
      destHeight: TICKET_CODE_CANVAS_SIZE_PX,
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    });
  });
}

function resolveOrderFooterActionsClassName() {
  return ['_pg-footer-actions'].join(' ');
}

function resolveOrderFooterActionClassName(type: 'primary' | 'ghost' = 'primary') {
  return [
    '_pg-footer-action',
    type === 'ghost' ? '_pg-footer-action--ghost' : '',
  ].filter(Boolean).join(' ');
}

// 从详情金额文案里还原支付金额，只用于继续支付的零元单判断。
function resolveDetailPayAmount(detailData: OrderDetailData) {
  const amount = Number(detailData.paidAmountText.replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

// 判断票务凭证页是否需要继续静默刷新，覆盖异步出票和停留券码页被外部核销的场景。
function shouldPollTicketOrderDetail(detailData?: OrderDetailData) {
  if (!detailData) return false;
  if (detailData.sceneType !== 'TICKET') return false;

  const normalizedStatus = String(detailData.orderStatus || '').toUpperCase();
  if (!TICKET_ORDER_DETAIL_POLLING_STATUSES.includes(normalizedStatus)) return false;

  if (!detailData.ticketInstances.length) return true;
  return detailData.ticketInstances.some((ticket) => (
    !TICKET_ORDER_DETAIL_TERMINAL_TICKET_STATUS_TEXTS.includes(ticket.statusText)
  ));
}

function resolveTicketOrderPollingSnapshot(detailData?: OrderDetailData) {
  if (!detailData) return '';

  return JSON.stringify({
    sceneType: detailData.sceneType || '',
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
  const [ticketQrCanvasSizeRpx] = useState(resolveTicketCodeCanvasSizeRpx);
  const [localTicketQrImages, setLocalTicketQrImages] = useState<Record<string, string>>({});
  const pageVisibleRef = useRef(true);
  const pollingRequestRef = useRef(false);
  const pollingSnapshotRef = useRef('');
  const generatedTicketQrImageKeysRef = useRef<Set<string>>(new Set());
  const ticketPollingSnapshot = useMemo(() => resolveTicketOrderPollingSnapshot(detailData), [detailData]);
  const hiddenTicketQrCanvasStyle: CSSProperties = {
    width: `${ticketQrCanvasSizeRpx}rpx`,
    height: `${ticketQrCanvasSizeRpx}rpx`,
  };

  function applyDetailData(nextData: OrderDetailData) {
    pollingSnapshotRef.current = resolveTicketOrderPollingSnapshot(nextData);
    setDetailData(nextData);
  }

  function handleCouponPress(couponNo: string) {
    navigateToMiniRoute(resolveCouponDetailRoute(couponNo));
  }

  function handleViewAftersale() {
    if (!detailData?.aftersaleEntryRoute) return;
    navigateToMiniRoute(detailData.aftersaleEntryRoute);
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
  }, [detailData?.id, ticketPollingSnapshot]);

  useEffect(() => {
    if (!detailData?.ticketInstances.length) {
      generatedTicketQrImageKeysRef.current.clear();
      setLocalTicketQrImages({});
      return undefined;
    }

    const qrPayloadItems = detailData.ticketInstances
      .map((ticket, index) => ({
        key: resolveTicketQrKey(ticket, index),
        canvasId: resolveTicketQrCanvasId(index),
        payload: ticket.qrImageSrc ? '' : ticket.qrCodePayload,
      }))
      .filter((item): item is { key: string; canvasId: string; payload: string } => Boolean(item.payload));
    const nextKeys = new Set(qrPayloadItems.map((item) => item.key));
    const qrTargets = qrPayloadItems.filter((item) => !generatedTicketQrImageKeysRef.current.has(item.key));
    Array.from(generatedTicketQrImageKeysRef.current).forEach((key) => {
      if (!nextKeys.has(key)) {
        generatedTicketQrImageKeysRef.current.delete(key);
      }
    });

    setLocalTicketQrImages((images) => {
      const nextImages: Record<string, string> = {};
      let changed = false;
      Object.entries(images).forEach(([key, imageSrc]) => {
        if (nextKeys.has(key)) {
          nextImages[key] = imageSrc;
          return;
        }
        changed = true;
      });
      return changed ? nextImages : images;
    });

    if (!qrTargets.length) return undefined;

    let cancelled = false;
    Taro.nextTick(() => {
      qrTargets.forEach((item) => {
        drawQrcode({
          width: TICKET_CODE_CANVAS_SIZE_PX,
          height: TICKET_CODE_CANVAS_SIZE_PX,
          canvasId: item.canvasId,
          text: item.payload,
          background: '#ffffff',
          foreground: '#111111',
          correctLevel: 2,
          callback: () => {
            void convertTicketQrCanvasToImage(item.canvasId)
              .then((imageSrc) => {
                if (cancelled) return;
                generatedTicketQrImageKeysRef.current.add(item.key);
                setLocalTicketQrImages((images) => ({ ...images, [item.key]: imageSrc }));
              })
              .catch(() => undefined);
          },
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [detailData?.id, detailData?.ticketInstances]);

  async function handlePrimaryAction() {
    if (!detailData) return;

    if (detailData.primaryActionType === 'pay') {
      const payment = await payBffOrder(detailData.id, 'WECHAT');
      const paymentParams = payment.prepay?.paymentParams || payment.prepay?.payParams;
      const payAmount = resolveDetailPayAmount(detailData);
      if (!paymentParams) {
        if ((payment.order?.payableAmountCent ?? Math.round(payAmount * 100)) <= 0) {
          await syncBffPaymentStatusSilently(payment.prepay?.payNo);
          await loadDetailData({ showErrorToast: false, orderId: detailData.id });
          await showWechatToast('订单已更新', 'success');
          return;
        }

        await showWechatToast('支付参数缺失，请稍后再试');
        return;
      }
      const paymentStatus = await requestWechatPayment({
        title: '继续支付',
        amount: payAmount,
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
                {detailData.ticketInstances.map((ticket, index) => {
                  const localQrImageSrc = localTicketQrImages[resolveTicketQrKey(ticket, index)];
                  const qrImageSrc = ticket.qrImageSrc || localQrImageSrc;

                  return (
                    <View className="_pg-ticket-code" key={resolveTicketQrKey(ticket, index)}>
                      <View className="_pg-ticket-code_header">
                        <Text className="_pg-ticket-code_title">{ticket.productName}</Text>
                        <Text className="_pg-ticket-code_status">{ticket.statusText}</Text>
                      </View>
                      {qrImageSrc ? (
                        <AppImage className="_pg-ticket-code_qr" src={qrImageSrc} mode="aspectFit" emptyState="error" />
                      ) : null}
                      {!ticket.qrImageSrc && ticket.qrCodePayload ? (
                        <View className="_pg-ticket-code_canvas-host" style={hiddenTicketQrCanvasStyle}>
                          <Canvas
                            canvasId={resolveTicketQrCanvasId(index)}
                            className="_pg-ticket-code_canvas"
                            style={hiddenTicketQrCanvasStyle}
                          />
                        </View>
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
                  );
                })}
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
              {detailData.refundButtonText || detailData.aftersaleEntryRoute ? (
                <View className={resolveOrderFooterActionsClassName()}>
                  {detailData.aftersaleEntryRoute ? (
                    <View
                      className={resolveOrderFooterActionClassName('ghost')}
                      onClick={handleViewAftersale}
                    >
                      {detailData.aftersaleEntryText}
                    </View>
                  ) : null}
                  {detailData.refundButtonText ? (
                    <View
                      className={resolveOrderFooterActionClassName()}
                      onClick={() => void handlePrimaryAction()}
                    >
                      {detailData.refundButtonText}
                    </View>
                  ) : null}
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
