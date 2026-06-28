import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { RichText, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import drawQrcode from 'weapp-qrcode';
import { AppBottomSheet } from '@/core/components/AppBottomSheet';
import { PageRoot, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { requestWechatPayment, showWechatConfirm, showWechatToast } from '@/core/utils/wechat-actions';
import { centToYuan, parseNumberLike } from '@/core/utils/money';
import { syncBffPaymentStatusSilently } from '@/core/services/bff-api';
import { markTicketBookingRefreshNeeded } from '@/core/services/ticket-booking-refresh-signal';
import {
  confirmReceiveBffOrder,
  payBffOrder,
  refundBffOrder,
} from '@/core/services/bff-order-api';
import { fetchDetailData, type OrderDetailData } from '@/pkg-order/services/detail';
import { OrderDetailSceneView } from './components/OrderDetailSceneView';
import type { OrderTicketDetailPopupData } from './components/order-detail-scene-types';
import './index.scss';

const TICKET_ORDER_DETAIL_POLL_INTERVAL_MS = 3000;
const TICKET_CODE_CANVAS_ID_PREFIX = 'ticket-order-code-canvas';
const TICKET_CODE_CANVAS_SIZE_PX = 300;
const WEAPP_DESIGN_WIDTH = 750;
const TICKET_ORDER_DETAIL_POLLING_STATUSES = [
  'PENDING',
  'PENDING_PAYMENT',
  'UNPAID',
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
const TICKET_ORDER_DETAIL_PRE_VOUCHER_POLLING_STATUSES = [
  'PENDING',
  'PENDING_PAYMENT',
  'UNPAID',
  'PAYING',
  'PAID',
  'WAIT_USE',
  'FULFILLING',
  'PART_USED',
  'PARTIALLY_USED',
  'PARTIALLYUSED',
];
const TICKET_ORDER_DETAIL_PAYMENT_SYNC_STATUSES = [
  'PENDING',
  'PENDING_PAYMENT',
  'UNPAID',
  'PAYING',
];
const PAYMENT_SETTLING_DETAIL_REFRESH_INTERVAL_MS = 2000;
const PAYMENT_SETTLING_DETAIL_REFRESH_MAX_ATTEMPTS = 3;

function markTicketBookingRefreshAfterPayment(detailData?: OrderDetailData) {
  if (String(detailData?.sceneType || '').toUpperCase() !== 'TICKET') return;
  markTicketBookingRefreshNeeded({ orderNo: detailData?.id });
}
const TICKET_ORDER_DETAIL_TERMINAL_TICKET_STATUS_KEYS = [
  'USED',
  'FULFILLED',
  'COMPLETED',
  'SUCCESS',
  'VOIDED',
  'CANCELED',
  'CANCELLED',
  'REFUNDED',
  'EXPIRED',
];
const TICKET_ORDER_DETAIL_TERMINAL_TICKET_STATUS_TEXTS = ['已核销', '已作废', '已退款', '已过期'];

function resolveCouponDetailRoute(couponNo: string) {
  return `${MINI_PACKAGE_ROUTES.memberCouponDetail}?id=${encodeURIComponent(couponNo)}`;
}

function TicketDetailRootPopup({ detail, onClose }: {
  detail?: OrderTicketDetailPopupData;
  onClose: () => void;
}) {
  return (
    <AppBottomSheet
      visible={Boolean(detail)}
      title={detail?.title || '详情'}
      className="_pg-ticket-detail-sheet"
      bodyMaxHeight="56vh"
      showFooter={false}
      onClose={onClose}
    >
      {detail?.content ? (
        detail.rich ? (
          <RichText className="_pg-ticket-detail-sheet_rich" nodes={detail.content} />
        ) : (
          <Text className="_pg-ticket-detail-sheet_text">{detail.content}</Text>
        )
      ) : null}
    </AppBottomSheet>
  );
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
  return `${ticket.id || ticket.ticketNo || 'ticket'}-${ticket.qrCodePayload || ticket.qrImageSrc || 'code'}-${index}`;
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

function isTerminalTicketInstance(ticket: OrderDetailData['ticketInstances'][number]) {
  const normalizedStatusKey = String(ticket.statusKey || '').toUpperCase();
  return TICKET_ORDER_DETAIL_TERMINAL_TICKET_STATUS_KEYS.includes(normalizedStatusKey)
    || TICKET_ORDER_DETAIL_TERMINAL_TICKET_STATUS_TEXTS.includes(ticket.statusText);
}

// 判断详情是否仍停留在待支付链路，支付成功回跳和静默查单都复用同一状态集。
function isPendingPaymentDetail(detailData?: OrderDetailData) {
  return TICKET_ORDER_DETAIL_PAYMENT_SYNC_STATUSES.includes(String(detailData?.orderStatus || '').toUpperCase());
}

// 识别从微信支付成功回调跳转来的订单详情，避免和普通待支付入口混淆。
function isPaymentSettlingRoute() {
  return Taro.getCurrentInstance().router?.params?.paymentSettling === '1';
}

// 支付成功回跳但后端尚未落库时，订单元信息也展示为确认中。
function mapPaymentSettlingOrderFields(fields: OrderDetailData['orderFields']) {
  return fields.map((field) => (
    field.label === '支付状态'
      ? { ...field, value: '确认中' }
      : field
  ));
}

// 支付成功跳转来的待支付快照只展示确认中，避免用户误点继续支付。
function resolveDisplayDetailData(
  detailData: OrderDetailData,
  paymentSettling: boolean,
): OrderDetailData {
  const shouldShowPaymentSettling = paymentSettling && isPendingPaymentDetail(detailData);

  if (!shouldShowPaymentSettling) return detailData;

  return {
    ...detailData,
    statusText: '支付结果确认中',
    primaryActionType: 'none',
    payExpireAt: undefined,
    refundButtonText: '',
    orderFields: mapPaymentSettlingOrderFields(detailData.orderFields),
  };
}

function shouldPollOrderDetail(detailData: OrderDetailData, paymentSettling: boolean) {
  if (paymentSettling && String(detailData.sceneType || '').toUpperCase() !== 'TICKET') return false;
  return shouldPollTicketOrderDetail(detailData);
}

// 酒店/商城支付回跳只做有限次状态同步刷新，不需要像票务凭证一样持续轮询。
function shouldRefreshPaymentSettlingDetail(detailData: OrderDetailData, paymentSettling: boolean) {
  return paymentSettling
    && String(detailData.sceneType || '').toUpperCase() !== 'TICKET'
    && isPendingPaymentDetail(detailData);
}

function waitPaymentSettlingRefreshInterval() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, PAYMENT_SETTLING_DETAIL_REFRESH_INTERVAL_MS);
  });
}

// 判断票务凭证页是否需要继续静默刷新，覆盖异步出票和停留券码页被外部核销的场景。
function shouldPollTicketOrderDetail(detailData?: OrderDetailData) {
  if (!detailData) return false;
  if (detailData.sceneType !== 'TICKET') return false;

  const normalizedStatus = String(detailData.orderStatus || '').toUpperCase();

  if (!detailData.ticketInstances.length) {
    return TICKET_ORDER_DETAIL_PRE_VOUCHER_POLLING_STATUSES.includes(normalizedStatus);
  }

  if (!TICKET_ORDER_DETAIL_POLLING_STATUSES.includes(normalizedStatus)) {
    return detailData.ticketInstances.some((ticket) => !isTerminalTicketInstance(ticket));
  }

  return detailData.ticketInstances.some((ticket) => !isTerminalTicketInstance(ticket));
}

function resolveTicketInstancePollingItems(detailData: OrderDetailData) {
  return detailData.ticketInstances
    .map((ticket) => ({
      id: ticket.id || '',
      ticketCode: ticket.ticketNo || '',
      voucherCode: ticket.copyValue || '',
      qrCodePayload: ticket.qrCodePayload || '',
      qrImageSrc: ticket.qrImageSrc || '',
      status: ticket.statusKey || ticket.statusText || '',
      statusText: ticket.statusText || '',
      usedNum: ticket.usedNum ?? 0,
      totalNum: ticket.totalNum ?? 0,
      fields: ticket.fields.map((field) => `${field.label}:${field.value}`),
      entryFields: ticket.entryFields?.map((field) => `${field.label}:${field.value}`) || [],
    }))
    .sort((left, right) => (
      `${left.id}:${left.ticketCode}:${left.voucherCode}:${left.qrCodePayload}`
        .localeCompare(`${right.id}:${right.ticketCode}:${right.voucherCode}:${right.qrCodePayload}`)
    ));
}

// 多张票时逐组记录 Swiper 面板状态，避免只核销单张票时漏刷新。
function resolveTicketGroupPollingItems(detailData: OrderDetailData) {
  return detailData.ticketGroups
    .map((group) => ({
      id: group.id,
      title: group.title,
      statusText: group.statusText || '',
      quantityText: group.quantityText || '',
      entryFields: group.entryFields.map((field) => `${field.label}:${field.value}`),
      voucherIds: group.vouchers.map((ticket) => ticket.id).sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function resolveOrderPollingSnapshot(detailData?: OrderDetailData) {
  if (!detailData) return '';

  if (detailData.sceneType !== 'TICKET' && detailData.statusVersion) return `version:${detailData.statusVersion}`;

  return JSON.stringify({
    sceneType: detailData.sceneType || '',
    orderStatus: detailData.orderStatus || '',
    updatedAt: detailData.updatedAt || '',
    payNo: detailData.payNo || '',
    paymentStatus: detailData.paymentStatus || '',
    statusText: detailData.statusText || '',
    primaryActionType: detailData.primaryActionType || '',
    refundButtonText: detailData.refundButtonText || '',
    productFields: detailData.productFields.map((field) => `${field.label}:${field.value}`),
    fulfillmentFields: detailData.fulfillmentFields.map((field) => `${field.label}:${field.value}`),
    couponFields: detailData.couponFields.map((field) => ({
      label: field.label,
      value: field.value,
      couponNos: field.couponLinks?.map((link) => `${link.couponNo}:${link.detailText || ''}`),
    })),
    ticketGroups: resolveTicketGroupPollingItems(detailData),
    ticketInstances: resolveTicketInstancePollingItems(detailData),
  });
}

const DetailPage = observer(function DetailPage() {
  const [detailData, setDetailData] = useState<OrderDetailData>();
  const [ticketDetailPopup, setTicketDetailPopup] = useState<OrderTicketDetailPopupData | undefined>();
  const [ticketQrCanvasSizeRpx] = useState(resolveTicketCodeCanvasSizeRpx);
  const [localTicketQrImages, setLocalTicketQrImages] = useState<Record<string, string>>({});
  const pageVisibleRef = useRef(true);
  const pollingRequestRef = useRef(false);
  const pollingSnapshotRef = useRef('');
  const paymentSettlingRef = useRef(isPaymentSettlingRoute());
  const paymentSettlingRefreshOrderIdsRef = useRef<Set<string>>(new Set());
  const generatedTicketQrImageKeysRef = useRef<Set<string>>(new Set());
  const orderPollingSnapshot = useMemo(() => resolveOrderPollingSnapshot(detailData), [detailData]);
  const hiddenTicketQrCanvasStyle: CSSProperties = {
    width: `${ticketQrCanvasSizeRpx}rpx`,
    height: `${ticketQrCanvasSizeRpx}rpx`,
  };

  function applyDetailData(nextData: OrderDetailData) {
    pollingSnapshotRef.current = resolveOrderPollingSnapshot(nextData);
    setDetailData(nextData);
  }

  function handleCouponPress(couponNo: string) {
    navigateToMiniRoute(resolveCouponDetailRoute(couponNo));
  }

  function handleViewAftersale() {
    if (!detailData?.aftersaleEntryRoute) return;
    navigateToMiniRoute(detailData.aftersaleEntryRoute);
  }

  // 详情页确认商城订单收货，成功后重读详情，失败时展示后端返回原因。
  async function confirmReceiveOrder(orderId: string) {
    const confirmed = await showWechatConfirm({
      title: '确认收货',
      content: '确认已收到商品？确认后订单将进入待评价状态。',
      confirmText: '确认收货',
      cancelText: '再看看',
    });

    if (!confirmed) return;

    try {
      await confirmReceiveBffOrder(orderId, { remark: '会员确认收货' }, { showErrorToast: false });
      await loadDetailData({ showErrorToast: false, orderId });
      await showWechatToast('已确认收货', 'success');
    } catch (error) {
      await showWechatToast(resolveErrorMessage(error, '确认收货失败，请稍后再试'));
    }
  }

  // 处理业态动作，确认收货使用接口动作，其余动作仍走路由跳转。
  function handleSceneAction(action: OrderDetailData['sceneActions'][number]) {
    if (action.actionType === 'confirmReceive' && detailData?.id) {
      void confirmReceiveOrder(detailData.id);
      return;
    }

    if (action.route) {
      navigateToMiniRoute(action.route);
    }
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

  async function pollOrderDetailSilently(orderId: string) {
    if (isPendingPaymentDetail(detailData)) {
      await syncBffPaymentStatusSilently(detailData?.payNo);
    }

    const nextData = await fetchDetailData(orderId, { showErrorToast: false });
    if (!pageVisibleRef.current) return;

    const nextSnapshot = resolveOrderPollingSnapshot(nextData);

    if (nextSnapshot !== pollingSnapshotRef.current) {
      applyDetailData(nextData);
    }
  }

  async function refreshPaymentSettlingDetail(orderId: string, payNo?: string) {
    if (payNo) {
      await syncBffPaymentStatusSilently(payNo);
    }

    const nextData = await fetchDetailData(orderId, { showErrorToast: false });
    if (!pageVisibleRef.current) return;
    applyDetailData(nextData);
    return nextData;
  }

  async function refreshPaymentSettlingDetailWithRetries(orderId: string, initialPayNo?: string) {
    let payNo = initialPayNo;

    for (let attempt = 0; attempt < PAYMENT_SETTLING_DETAIL_REFRESH_MAX_ATTEMPTS; attempt += 1) {
      if (attempt > 0) {
        await waitPaymentSettlingRefreshInterval();
      }
      if (!pageVisibleRef.current) return;

      const nextData = await refreshPaymentSettlingDetail(orderId, payNo);
      if (!nextData || !isPendingPaymentDetail(nextData)) return;
      payNo = nextData.payNo;
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
    if (!detailData || !shouldPollOrderDetail(detailData, paymentSettlingRef.current)) return undefined;

    const pollingOrderId = detailData.id;
    const timer = setInterval(() => {
      if (!pageVisibleRef.current || pollingRequestRef.current) return;

      pollingRequestRef.current = true;
      pollOrderDetailSilently(pollingOrderId)
        .catch(() => undefined)
        .finally(() => {
          pollingRequestRef.current = false;
        });
    }, TICKET_ORDER_DETAIL_POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [detailData?.id, orderPollingSnapshot]);

  useEffect(() => {
    if (!detailData || !shouldRefreshPaymentSettlingDetail(detailData, paymentSettlingRef.current)) return;
    if (paymentSettlingRefreshOrderIdsRef.current.has(detailData.id)) return;

    paymentSettlingRefreshOrderIdsRef.current.add(detailData.id);
    refreshPaymentSettlingDetailWithRetries(detailData.id, detailData.payNo).catch(() => undefined);
  }, [detailData?.id, orderPollingSnapshot]);

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
      const payableAmountCent = parseNumberLike(payment.order?.payableAmountCent);
      if (!paymentParams) {
        if (typeof payableAmountCent === 'number' && payableAmountCent <= 0) {
          await syncBffPaymentStatusSilently(payment.prepay?.payNo);
          await loadDetailData({ showErrorToast: false, orderId: detailData.id });
          markTicketBookingRefreshAfterPayment(detailData);
          await showWechatToast('订单已更新', 'success');
          return;
        }

        await showWechatToast('支付参数缺失，请稍后再试');
        return;
      }
      if (typeof payableAmountCent !== 'number' || payableAmountCent < 0) {
        await showWechatToast('支付金额缺失，请稍后再试');
        return;
      }
      const paymentStatus = await requestWechatPayment({
        title: '继续支付',
        amount: centToYuan(payableAmountCent),
        paymentParams: paymentParams as unknown as Parameters<typeof Taro.requestPayment>[0],
      });

      if (paymentStatus !== 'success') {
        return;
      }

      await syncBffPaymentStatusSilently(payment.prepay?.payNo ?? payment.order?.payNo);
      const nextData = await fetchDetailData(detailData.id);
      applyDetailData(nextData);
      markTicketBookingRefreshAfterPayment(nextData);
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

  return pageRuntime.renderPage(() => {
    if (!detailData) return null;
    const displayDetailData = resolveDisplayDetailData(detailData, paymentSettlingRef.current);

    return (
      <View className="_pg">
        <PageShell title="订单详情" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <OrderDetailSceneView
              detailData={displayDetailData}
              ticketQr={{
                canvasStyle: hiddenTicketQrCanvasStyle,
                getCanvasId: resolveTicketQrCanvasId,
                getLocalImageSrc: (ticket, index) => localTicketQrImages[resolveTicketQrKey(ticket, index)],
                getQrKey: resolveTicketQrKey,
              }}
              onCouponPress={handleCouponPress}
              onPrimaryAction={() => void handlePrimaryAction()}
              onSceneAction={handleSceneAction}
              onTicketDetailPress={setTicketDetailPopup}
              onViewAftersale={handleViewAftersale}
            />
          </View>
          <PageRoot>
            <TicketDetailRootPopup
              detail={ticketDetailPopup}
              onClose={() => setTicketDetailPopup(undefined)}
            />
          </PageRoot>
        </PageShell>
      </View>
    );
  });
});

export default DetailPage;
