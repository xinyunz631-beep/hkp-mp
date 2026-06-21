import Taro, { useDidHide, useDidShow } from '@tarojs/taro';
import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import drawQrcode from 'weapp-qrcode';
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
import { OrderDetailSceneView } from './components/OrderDetailSceneView';
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

  function handleSceneAction(route: string) {
    navigateToMiniRoute(route);
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
              onViewAftersale={handleViewAftersale}
            />
          </View>
        </PageShell>
      </View>
    );
  });
});

export default DetailPage;
