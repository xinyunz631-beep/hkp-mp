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
import {
  confirmReceiveBffOrder,
  fetchBffOrderStatusSnapshot,
  payBffOrder,
  refundBffOrder,
  type BffOrderStatusSnapshot,
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
const TICKET_ORDER_DETAIL_PRE_VOUCHER_POLLING_STATUSES = [
  'PENDING_PAYMENT',
  'PAYING',
  'PAID',
  'FULFILLING',
];
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
      confirmText="我已知晓"
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
      ticketCode: ticket.ticketNo || '',
      voucherCode: ticket.copyValue || '',
      status: ticket.statusKey || ticket.statusText || '',
      usedNum: ticket.usedNum ?? 0,
      totalNum: ticket.totalNum ?? 0,
    }))
    .sort((left, right) => `${left.ticketCode}:${left.voucherCode}`.localeCompare(`${right.ticketCode}:${right.voucherCode}`));
}

function resolveSnapshotTicketVoucherItems(snapshot: BffOrderStatusSnapshot) {
  return (snapshot.ticketVouchersSummary || [])
    .map((ticket) => ({
      ticketCode: ticket.ticketCode || '',
      voucherCode: ticket.voucherCode || '',
      status: String(ticket.ticketStatus || '').toUpperCase(),
      usedNum: ticket.usedNum ?? 0,
      totalNum: ticket.totalNum ?? 0,
    }))
    .sort((left, right) => `${left.ticketCode}:${left.voucherCode}`.localeCompare(`${right.ticketCode}:${right.voucherCode}`));
}

function resolveTicketOrderPollingSnapshot(detailData?: OrderDetailData) {
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
    couponFields: detailData.couponFields.map((field) => ({
      label: field.label,
      value: field.value,
      couponNos: field.couponLinks?.map((link) => `${link.couponNo}:${link.detailText || ''}`),
    })),
    ticketVouchersSummary: resolveTicketInstancePollingItems(detailData),
  });
}

// 归一轻量状态快照，尽量与详情接口的 updatedAt 基线保持一致，避免无变化时反复刷新详情。
function resolveStatusSnapshotPollingSnapshot(snapshot?: BffOrderStatusSnapshot) {
  if (!snapshot) return '';

  if (String(snapshot.sceneType || '').toUpperCase() === 'TICKET') {
    return JSON.stringify({
      sceneType: snapshot.sceneType || '',
      orderStatus: snapshot.orderStatus || '',
      paymentStatus: snapshot.paymentStatus || '',
      payNo: snapshot.payNo || '',
      ticketVoucherVersion: snapshot.ticketVoucherVersion || 0,
      ticketVouchersSummary: resolveSnapshotTicketVoucherItems(snapshot),
    });
  }

  const updatedAt = Date.parse(snapshot.updatedAt || '');
  if (Number.isFinite(updatedAt)) return `version:${updatedAt}`;

  if (typeof snapshot.version === 'number' && Number.isFinite(snapshot.version)) {
    return `version:${snapshot.version}`;
  }

  return JSON.stringify({
    sceneType: snapshot.sceneType || '',
    orderStatus: snapshot.orderStatus || '',
    paymentStatus: snapshot.paymentStatus || '',
    fulfillmentStatus: snapshot.fulfillmentStatus || '',
    refundStatus: snapshot.refundStatus || '',
    aftersaleStatus: snapshot.aftersaleStatus || '',
    logisticsStatus: snapshot.logisticsStatus || '',
    reviewStatus: snapshot.reviewStatus || '',
    payNo: snapshot.payNo || '',
    ticketVoucherVersion: snapshot.ticketVoucherVersion || 0,
    ticketVouchersSummary: snapshot.ticketVouchersSummary || [],
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

  async function pollTicketOrderDetailSilently(orderId: string) {
    if (String(detailData?.orderStatus || '').toUpperCase() === 'PAYING') {
      await syncBffPaymentStatusSilently(detailData?.payNo);
    }

    const statusSnapshot = await fetchBffOrderStatusSnapshot(orderId, { showErrorToast: false });
    if (!pageVisibleRef.current) return;

    const nextSnapshot = resolveStatusSnapshotPollingSnapshot(statusSnapshot);

    if (nextSnapshot !== pollingSnapshotRef.current) {
      await loadDetailData({ showErrorToast: false, orderId, skipApplyWhenHidden: true });
      pollingSnapshotRef.current = nextSnapshot;
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
      const payableAmountCent = parseNumberLike(payment.order?.payableAmountCent);
      if (!paymentParams) {
        if (typeof payableAmountCent === 'number' && payableAmountCent <= 0) {
          await syncBffPaymentStatusSilently(payment.prepay?.payNo);
          await loadDetailData({ showErrorToast: false, orderId: detailData.id });
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

    return (
      <View className="_pg">
        <PageShell title="订单详情" className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <OrderDetailSceneView
              detailData={detailData}
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
