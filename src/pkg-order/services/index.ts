import { fetchBffOrders, type BffOrder, type BffOrderSceneType } from '@/core/services/bff-order-api';
import type { OrderHomeActionData, OrderHomeData, OrderHomeItemData, OrderHomeSectionData } from './model';

export type { OrderHomeData } from './model';

const ORDER_TABS = [
  { key: 'all', text: '全部' },
  { key: 'pendingPay', text: '待付款' },
  { key: 'pendingReceive', text: '待使用' },
  { key: 'pendingReview', text: '待评价' },
  { key: 'aftersale', text: '退款/售后' },
];

const ORDER_SCENES: BffOrderSceneType[] = ['TICKET', 'MALL', 'HOTEL'];

function formatCent(value?: number) {
  return `¥${((value || 0) / 100).toFixed(2)}`;
}

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatDate(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

function resolveStatusText(status?: string, sceneType?: string) {
  const normalizedStatus = String(status || '').toUpperCase();
  if (['PENDING_PAYMENT', 'PAYING'].includes(normalizedStatus)) return '待付款';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) return sceneType === 'HOTEL' ? '待入住' : '待使用';
  if (['PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus)) return '部分使用';
  if (['FULFILLED', 'USED', 'COMPLETED'].includes(normalizedStatus)) return '已完成';
  if (['CANCELED', 'CANCELLED'].includes(normalizedStatus)) return '已取消';
  if (['REFUNDING', 'REFUNDED'].includes(normalizedStatus)) return '退款中';
  return status || '处理中';
}

function resolveTabKey(status?: string) {
  const normalizedStatus = String(status || '').toUpperCase();
  if (['PENDING_PAYMENT', 'PAYING'].includes(normalizedStatus)) return 'pendingPay';
  if (['REFUNDING', 'REFUNDED'].includes(normalizedStatus)) return 'aftersale';
  if (['FULFILLED', 'USED', 'COMPLETED'].includes(normalizedStatus)) return 'pendingReview';
  return 'pendingReceive';
}

function resolveItemTitle(order: BffOrder) {
  const firstItem = order.items?.[0];
  return firstItem?.itemName
    || firstItem?.attributes?.roomTitle
    || firstItem?.attributes?.ratePlanTitle
    || order.context?.roomTitle
    || `${order.sceneType || ''}订单`;
}

function resolveMerchantName(order: BffOrder) {
  return normalizeString(
    order.context?.merchantName
      || order.items?.[0]?.attributes?.merchantName
      || order.items?.[0]?.attributes?.shopName,
  );
}

function resolveItemImage(order: BffOrder) {
  const firstItem = order.items?.[0];
  return normalizeString(
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
    return normalizeString(
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

function resolveOrderActions(order: BffOrder): OrderHomeActionData[] {
  if (['PENDING_PAYMENT', 'PAYING'].includes(order.orderStatus || '')) {
    return [
      { text: '取消订单', tone: 'default' },
      { text: '继续支付', tone: 'primary' },
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

function mapOrderItem(order: BffOrder): OrderHomeItemData {
  const merchantName = resolveMerchantName(order);
  return {
    id: order.orderNo,
    orderId: order.orderNo,
    title: resolveItemTitle(order),
    subtitle: resolveItemSubtitle(order),
    extraText: order.sceneType === 'MALL' && merchantName ? merchantName : undefined,
    imageSrc: resolveItemImage(order),
    quantity: resolveItemQuantity(order),
    priceText: formatCent(order.payableAmountCent),
    actionText: '查看详情',
    actions: resolveOrderActions(order),
  };
}

function mapOrderSection(order: BffOrder): OrderHomeSectionData {
  return {
    id: order.orderNo,
    tabKey: resolveTabKey(order.orderStatus),
    dateText: formatDate(order.createdAt) || '-',
    statusText: resolveStatusText(order.orderStatus, order.sceneType),
    totalText: `合计:${formatCent(order.payableAmountCent)}`,
    items: [mapOrderItem(order)],
  };
}

// 获取真实订单列表，当前 BFF 按业态查询，因此前端合并票务、商城和酒店订单。
export async function fetchOrderHomeData(): Promise<OrderHomeData> {
  const orders = (await Promise.all(ORDER_SCENES.map((scene) => fetchBffOrders(scene)))).flat();
  const sections = orders
    .slice()
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map(mapOrderSection);

  return {
    tabs: ORDER_TABS,
    sections,
  };
}
