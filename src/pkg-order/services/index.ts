import {
  fetchMergedBffOrderPage,
  sortBffOrdersByCreatedAt,
  type BffOrder,
  type BffOrderSceneType,
  type BffOrderTabCount,
} from '@/core/services/bff-order-api';
import { fetchBffMallMyReviews, type BffMallMemberReviewsData } from '@/core/services/bff-mall-api';
import { formatCentCurrency } from '@/core/utils/money';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import type {
  OrderHomeActionData,
  OrderHomeData,
  OrderHomeItemData,
  OrderHomeSectionData,
} from './model';

export type { OrderHomeData } from './model';

const ORDER_TABS = [
  { key: 'all', text: '全部' },
  { key: 'pendingPay', text: '待付款' },
  { key: 'pendingReceive', text: '待使用' },
  { key: 'pendingReview', text: '待评价' },
  { key: 'aftersale', text: '退款/售后' },
];

const ORDER_SCENES: BffOrderSceneType[] = ['TICKET', 'MALL', 'HOTEL'];
const ORDER_HOME_PAGE_SIZE = 10;

interface FetchOrderHomeDataOptions {
  page?: number;
  pageSize?: number;
  tabKey?: string;
  existingSections?: OrderHomeSectionData[];
}

function formatCent(value?: number | string) {
  return formatCentCurrency(value);
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : fallback;
}

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeCount(value: unknown) {
  const numberValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.max(0, Math.floor(numberValue)) : undefined;
}

function formatDate(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

function normalizeStatus(value?: string) {
  return String(value || '').trim().toUpperCase();
}

function hasMallLogisticsContext(order: BffOrder) {
  if (order.sceneType !== 'MALL') return false;
  return Boolean(normalizeString(
    order.context?.trackingNumber
      || order.context?.waybillNo
      || order.context?.logisticsNo
      || order.context?.deliveryNo
      || order.items?.[0]?.attributes?.trackingNumber
      || order.items?.[0]?.attributes?.waybillNo,
  ));
}

// 判断订单是否仍处于待支付阶段，和详情页保持同一套支付入口口径。
function isPendingPaymentStatus(status?: string) {
  return ['PENDING', 'PENDING_PAYMENT', 'UNPAID', 'PAYING'].includes(normalizeStatus(status));
}

// 判断订单是否已经关闭，避免超时关单继续归入待使用列表。
function isClosedStatus(status?: string) {
  return ['CLOSED', 'EXPIRED', 'TIMEOUT', 'TIMEOUT_CLOSED', 'AUTO_CLOSED'].includes(normalizeStatus(status));
}

// 判断订单是否属于已完成终态，商城评价入口只在该类状态下出现。
function isCompletedStatus(status?: string) {
  return ['FULFILLED', 'USED', 'COMPLETED', 'SUCCESS'].includes(normalizeStatus(status));
}

// 判断订单是否处于退款售后阶段，统一放入退款/售后标签。
function isRefundStatus(status?: string) {
  return ['REFUNDING', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED'].includes(normalizeStatus(status));
}

function resolveStatusText(order: BffOrder) {
  const normalizedStatus = normalizeStatus(order.orderStatus);
  if (isPendingPaymentStatus(normalizedStatus)) return '待付款';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) {
    if (order.sceneType === 'HOTEL') return '待入住';
    if (order.sceneType === 'MALL') {
      return normalizedStatus === 'FULFILLING' || hasMallLogisticsContext(order) ? '待收货' : '待发货';
    }
    return '待使用';
  }
  if (['PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus)) return '部分使用';
  if (isCompletedStatus(normalizedStatus)) return '已完成';
  if (['CANCELED', 'CANCELLED'].includes(normalizedStatus)) return '已取消';
  if (isClosedStatus(normalizedStatus)) return '已关闭';
  if (['REFUNDING', 'REFUND_PENDING', 'REFUND_PROCESSING'].includes(normalizedStatus)) return '退款中';
  if (normalizedStatus === 'REFUNDED') return '已退款';
  return order.orderStatus || '处理中';
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
  if (['PAID', 'WAIT_USE', 'FULFILLING', 'PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus)) return 'pendingReceive';
  return 'pendingReceive';
}

function resolveItemTitle(order: BffOrder) {
  const firstItem = order.items?.[0];
  if (order.sceneType === 'MALL') {
    return sanitizeMallRuntimeText(firstItem?.itemName)
      || normalizeString(firstItem?.itemId || firstItem?.lineNo || order.orderNo);
  }
  return firstItem?.itemName
    || firstItem?.attributes?.roomTitle
    || firstItem?.attributes?.ratePlanTitle
    || order.context?.roomTitle
    || normalizeString(firstItem?.itemId || firstItem?.lineNo || order.orderNo);
}

function resolveMerchantName(order: BffOrder) {
  return sanitizeMallRuntimeText(
    order.context?.merchantName
      || order.items?.[0]?.attributes?.merchantName
      || order.items?.[0]?.attributes?.shopName,
  );
}

function resolveItemImage(order: BffOrder) {
  const firstItem = order.items?.[0];
  return sanitizeMallRuntimeUrl(
    firstItem?.attributes?.imageUrl
      || firstItem?.attributes?.imageSrc
      || firstItem?.attributes?.mainImageUrl,
  );
}

function resolveItemSubtitle(order: BffOrder) {
  const firstItem = order.items?.[0];
  if (order.sceneType === 'HOTEL') {
    return `${order.context?.checkInDate || ''} - ${order.context?.checkOutDate || ''}`;
  }
  if (order.sceneType === 'MALL') {
    return sanitizeMallRuntimeText(
      firstItem?.attributes?.specName
        || firstItem?.attributes?.skuName
        || firstItem?.skuId,
    );
  }
  return normalizeString(firstItem?.attributes?.visitDate || order.context?.visitDate);
}

function resolveItemQuantity(order: BffOrder) {
  const quantity = Number(order.items?.[0]?.quantity);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
}

function resolveOrderActions(order: BffOrder, reviewedMallItems: Set<string>, reviewLookupReady: boolean): OrderHomeActionData[] {
  const normalizedStatus = normalizeStatus(order.orderStatus);
  if (isPendingPaymentStatus(normalizedStatus)) {
    return [
      { text: '取消订单', tone: 'default' },
      { text: '继续支付', tone: 'primary' },
    ];
  }
  if (order.sceneType === 'MALL' && isCompletedStatus(normalizedStatus) && reviewLookupReady && !hasReviewedMallOrder(order, reviewedMallItems)) {
    if (hasMallLogisticsContext(order)) {
      return [
        { text: '查看物流', tone: 'default' },
        { text: '去评价', tone: 'primary' },
      ];
    }
    return [
      { text: '查看详情', tone: 'default' },
      { text: '去评价', tone: 'primary' },
    ];
  }
  if (hasMallLogisticsContext(order)) {
    return [
      { text: '查看物流', tone: 'default' },
      { text: '查看详情', tone: 'default' },
    ];
  }
  return [{ text: '查看详情', tone: 'default' }];
}

function mapOrderItem(order: BffOrder, reviewedMallItems: Set<string>, reviewLookupReady: boolean): OrderHomeItemData {
  const merchantName = resolveMerchantName(order);
  const firstItem = order.items?.[0];
  return {
    id: order.orderNo,
    orderId: order.orderNo,
    itemId: firstItem?.itemId || firstItem?.lineNo,
    title: resolveItemTitle(order),
    subtitle: resolveItemSubtitle(order),
    extraText: order.sceneType === 'MALL' && merchantName ? merchantName : undefined,
    imageSrc: resolveItemImage(order),
    quantity: resolveItemQuantity(order),
    priceText: formatCent(order.payableAmountCent),
    actionText: '查看详情',
    actions: resolveOrderActions(order, reviewedMallItems, reviewLookupReady),
  };
}

function mapOrderSection(order: BffOrder, reviewedMallItems: Set<string>, reviewLookupReady: boolean): OrderHomeSectionData {
  return {
    id: order.orderNo,
    tabKey: resolveTabKey(order, reviewedMallItems, reviewLookupReady),
    dateText: formatDate(order.createdAt) || '-',
    statusText: resolveStatusText(order),
    totalText: `合计:${formatCent(order.payableAmountCent)}`,
    items: [mapOrderItem(order, reviewedMallItems, reviewLookupReady)],
  };
}

function mergeOrderSections(
  existingSections: OrderHomeSectionData[],
  nextSections: OrderHomeSectionData[],
) {
  const seenSectionIds = new Set<string>();
  return [...existingSections, ...nextSections].filter((section) => {
    if (seenSectionIds.has(section.id)) return false;
    seenSectionIds.add(section.id);
    return true;
  });
}

// 归一后端订单 Tab 计数，保证旧后端降级时仍保留稳定的本地 Tab 顺序。
function normalizeOrderTabs(serverTabs?: BffOrderTabCount[]) {
  const serverTabMap = new Map((serverTabs || [])
    .filter((tab) => tab.key)
    .map((tab) => [String(tab.key), tab]));

  return ORDER_TABS.map((tab) => {
    const serverTab = serverTabMap.get(tab.key);
    return {
      ...tab,
      text: normalizeString(serverTab?.text) || tab.text,
      count: normalizeCount(serverTab?.count),
    };
  });
}

// 获取真实订单列表分页，优先使用全类型聚合，未发布时再由前端合并当前已开放业态。
export async function fetchOrderHomeData(options: FetchOrderHomeDataOptions = {}): Promise<OrderHomeData> {
  const page = normalizePositiveInteger(options.page, 1);
  const pageSize = normalizePositiveInteger(options.pageSize, ORDER_HOME_PAGE_SIZE);
  const tabKey = normalizeString(options.tabKey || 'all');
  const existingSections = options.existingSections || [];
  const [orders, mallReviews] = await Promise.all([
    fetchMergedBffOrderPage({
      page,
      pageSize,
      scenes: ORDER_SCENES,
      status: tabKey === 'all' ? undefined : tabKey,
    }),
    fetchBffMallMyReviews().catch(() => undefined),
  ]);
  const reviewLookupReady = Boolean(mallReviews);
  const reviewedMallItems = buildReviewedMallItemSet(mallReviews);
  const nextSections = sortBffOrdersByCreatedAt(orders.orders)
    .map((order) => mapOrderSection(order, reviewedMallItems, reviewLookupReady));
  const sections = mergeOrderSections(existingSections, nextSections);
  const hasNewSections = sections.length > existingSections.length;

  return {
    tabs: normalizeOrderTabs(orders.tabs),
    sections,
    page: orders.page,
    pageSize: orders.pageSize,
    hasMore: orders.hasMore && hasNewSections,
  };
}
