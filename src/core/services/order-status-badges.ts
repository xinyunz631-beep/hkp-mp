import {
  fetchBffOrderStatusCounts,
  fetchMergedBffOrderPage,
  type BffOrder,
  type BffOrderStatusCounts,
  type BffOrderSceneType,
} from './bff-order-api';
import { fetchBffMallMyReviews, type BffMallMemberReviewsData } from './bff-mall-api';

export interface OrderStatusBadgeCounts {
  pendingPay: number;
  pendingReceive: number;
  pendingReview: number;
  aftersale: number;
}

const ORDER_SCENES: BffOrderSceneType[] = ['TICKET', 'MALL', 'HOTEL'];
const ORDER_BADGE_PAGE_SIZE = 100;
const ORDER_BADGE_MAX_PAGES = 20;
const SERVER_COUNT_KEYS = [
  'pendingPay',
  'pendingPayment',
  'unpaid',
  'pendingReceive',
  'pendingUse',
  'pendingFulfillment',
  'pendingReview',
  'reviewPending',
  'toReview',
  'unreviewed',
  'aftersale',
  'afterSale',
  'refunding',
  'refund',
];

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeStatus(value?: string) {
  return String(value || '').trim().toUpperCase();
}

function isPendingPaymentStatus(status?: string) {
  return ['PENDING', 'PENDING_PAYMENT', 'UNPAID', 'PAYING'].includes(normalizeStatus(status));
}

function isClosedStatus(status?: string) {
  return ['CLOSED', 'EXPIRED', 'TIMEOUT', 'TIMEOUT_CLOSED', 'AUTO_CLOSED'].includes(normalizeStatus(status));
}

function isCompletedStatus(status?: string) {
  return ['FULFILLED', 'USED', 'COMPLETED', 'SUCCESS'].includes(normalizeStatus(status));
}

function isRefundStatus(status?: string) {
  return ['REFUNDING', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED'].includes(normalizeStatus(status));
}

function reviewLookupKey(orderNo?: string, itemId?: string) {
  return `${orderNo || ''}::${itemId || ''}`;
}

function buildReviewedMallItemSet(data?: BffMallMemberReviewsData) {
  return new Set((data?.items || [])
    .map((item) => reviewLookupKey(item.orderNo, item.itemId))
    .filter((value) => value !== '::'));
}

function hasReviewedMallOrder(order: BffOrder, reviewedMallItems: Set<string>) {
  if (order.sceneType !== 'MALL') return true;
  const reviewableItemIds = (order.items || [])
    .map((item) => item.itemId || item.lineNo)
    .filter((itemId): itemId is string => Boolean(itemId));
  if (!reviewableItemIds.length) return false;
  return reviewableItemIds.every((itemId) => reviewedMallItems.has(reviewLookupKey(order.orderNo, itemId)));
}

function resolveTabKey(order: BffOrder, reviewedMallItems: Set<string>, reviewLookupReady: boolean) {
  const normalizedStatus = normalizeStatus(order.orderStatus);
  if (isPendingPaymentStatus(normalizedStatus)) return 'pendingPay';
  if (isRefundStatus(normalizedStatus)) return 'aftersale';
  if (isCompletedStatus(normalizedStatus)) {
    if (order.sceneType === 'MALL' && reviewLookupReady) {
      return hasReviewedMallOrder(order, reviewedMallItems) ? 'all' : 'pendingReview';
    }
    return 'all';
  }
  if (isClosedStatus(normalizedStatus) || ['CANCELED', 'CANCELLED'].includes(normalizedStatus)) return 'all';
  if (['PAID', 'WAIT_USE', 'FULFILLING', 'PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus)) {
    return 'pendingReceive';
  }
  return 'pendingReceive';
}

function emptyBadgeCounts(): OrderStatusBadgeCounts {
  return {
    pendingPay: 0,
    pendingReceive: 0,
    pendingReview: 0,
    aftersale: 0,
  };
}

function incrementBadgeCount(counts: OrderStatusBadgeCounts, tabKey: string) {
  if (tabKey === 'pendingPay') counts.pendingPay += 1;
  if (tabKey === 'pendingReceive') counts.pendingReceive += 1;
  if (tabKey === 'pendingReview') counts.pendingReview += 1;
  if (tabKey === 'aftersale') counts.aftersale += 1;
}

function resolveServerCountsPayload(payload?: BffOrderStatusCounts) {
  if (!payload) return undefined;
  const candidates = [
    payload.tabCounts,
    payload.counts,
    payload.statusCounts,
    payload,
  ];
  return candidates.find((candidate): candidate is BffOrderStatusCounts => (
    isObjectRecord(candidate) && hasServerCountSignal(candidate as BffOrderStatusCounts)
  ));
}

function readServerCountOptional(payload: BffOrderStatusCounts | undefined, keys: string[]) {
  if (!payload) return undefined;
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.floor(value));
    if (typeof value === 'string' && value.trim()) {
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) return Math.max(0, Math.floor(numberValue));
    }
  }
  return undefined;
}

function readServerTabCount(payload: BffOrderStatusCounts | undefined, tabKey: string) {
  const matchedTab = payload?.tabs?.find((tab) => tab.key === tabKey);
  const numberValue = typeof matchedTab?.count === 'number' ? matchedTab.count : Number(matchedTab?.count);
  return Number.isFinite(numberValue) ? Math.max(0, Math.floor(numberValue)) : 0;
}

function hasServerCountSignal(payload?: BffOrderStatusCounts) {
  if (!payload) return false;
  return SERVER_COUNT_KEYS.some((key) => typeof payload[key] !== 'undefined');
}

function hasServerTabSignal(payload?: BffOrderStatusCounts) {
  return Boolean(payload?.tabs?.some((tab) => tab.key && typeof tab.count !== 'undefined'));
}

function normalizeServerBadgeCounts(payload?: BffOrderStatusCounts): OrderStatusBadgeCounts | undefined {
  const countsPayload = resolveServerCountsPayload(payload);
  if (!hasServerCountSignal(countsPayload) && !hasServerTabSignal(payload)) return undefined;

  return {
    pendingPay: readServerCountOptional(countsPayload, ['pendingPay', 'pendingPayment', 'unpaid']) ?? readServerTabCount(payload, 'pendingPay'),
    pendingReceive: readServerCountOptional(countsPayload, ['pendingReceive', 'pendingUse', 'pendingFulfillment']) ?? readServerTabCount(payload, 'pendingReceive'),
    pendingReview: readServerCountOptional(countsPayload, ['pendingReview', 'reviewPending', 'toReview', 'unreviewed']) ?? readServerTabCount(payload, 'pendingReview'),
    aftersale: readServerCountOptional(countsPayload, ['aftersale', 'afterSale', 'refunding', 'refund']) ?? readServerTabCount(payload, 'aftersale'),
  };
}

// 会员页订单红点优先读取后端轻量计数，未发布时再用真实订单和真实评价记录静默聚合。
export async function fetchOrderStatusBadgeCounts(): Promise<OrderStatusBadgeCounts> {
  const serverCounts = normalizeServerBadgeCounts(
    await fetchBffOrderStatusCounts('ALL', { showErrorToast: false }).catch(() => undefined),
  );
  if (serverCounts) return serverCounts;

  const mallReviews = await fetchBffMallMyReviews().catch(() => undefined);
  const reviewLookupReady = Boolean(mallReviews);
  const reviewedMallItems = buildReviewedMallItemSet(mallReviews);
  const counts = emptyBadgeCounts();
  const seenOrderNos = new Set<string>();
  let page = 1;
  let hasMore = true;
  let fetchedPages = 0;

  while (hasMore && fetchedPages < ORDER_BADGE_MAX_PAGES) {
    const orderPage = await fetchMergedBffOrderPage({
      page,
      pageSize: ORDER_BADGE_PAGE_SIZE,
      scenes: ORDER_SCENES,
      showErrorToast: false,
    });
    let newOrderCount = 0;

    orderPage.orders.forEach((order) => {
      const orderNo = normalizeString(order.orderNo);
      if (!orderNo || seenOrderNos.has(orderNo)) return;

      seenOrderNos.add(orderNo);
      newOrderCount += 1;
      incrementBadgeCount(counts, resolveTabKey(order, reviewedMallItems, reviewLookupReady));
    });

    fetchedPages += 1;
    page = orderPage.page + 1;
    hasMore = orderPage.hasMore && newOrderCount > 0;
  }

  return counts;
}
