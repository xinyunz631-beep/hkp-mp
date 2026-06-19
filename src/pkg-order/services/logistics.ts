import { fetchBffOrderDetail, type BffOrder } from '@/core/services/bff-order-api';
import type { OrderLogisticsData, OrderLogisticsTraceItem } from './model';

export type { OrderLogisticsData } from './model';

const LOGISTICS_COMPANY_KEYS = ['deliveryCompany', 'logisticsCompany', 'expressCompany', 'courierCompany'];
const LOGISTICS_NUMBER_KEYS = ['trackingNumber', 'waybillNo', 'logisticsNo', 'deliveryNo', 'expressNo'];
const LOGISTICS_PHONE_KEYS = ['servicePhone', 'hotline', 'merchantPhone', 'merchantServicePhone'];
const LOGISTICS_STATUS_KEYS = ['logisticsStatusText', 'deliveryStatusText', 'shipmentStatusText', 'trackingStatusText'];
const LOGISTICS_TRACE_KEYS = ['logisticsTraces', 'deliveryTraces', 'shipmentTraces', 'trackingTraces'];

function formatCent(value?: number) {
  return `¥${((value || 0) / 100).toFixed(2)}`;
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function pickFirstString(sources: Array<Record<string, unknown> | undefined>, keys: string[]) {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = normalizeString(source[key]);
      if (value) return value;
    }
  }
  return '';
}

function resolveImageSrc(order: BffOrder) {
  const firstItem = order.items?.[0];
  return normalizeString(firstItem?.attributes?.imageUrl)
    || normalizeString(firstItem?.attributes?.imageSrc)
    || normalizeString(firstItem?.attributes?.mainImageUrl)
    || '';
}

function resolveQuantityText(order: BffOrder) {
  const count = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  return count > 0 ? `共${count}件` : '';
}

function resolveStatusText(order: BffOrder) {
  const explicitStatus = pickFirstString([order.context, order.items?.[0]?.attributes], LOGISTICS_STATUS_KEYS);
  if (explicitStatus) return explicitStatus;

  const normalizedStatus = String(order.orderStatus || '').toUpperCase();
  if (['FULFILLED', 'COMPLETED'].includes(normalizedStatus)) return '已签收';
  if (['CANCELED', 'CANCELLED'].includes(normalizedStatus)) return '订单已取消';
  if (['REFUNDING', 'REFUNDED'].includes(normalizedStatus)) return '退款处理中';
  if (['PAID', 'WAIT_USE', 'FULFILLING', 'PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus)) {
    return '运输中';
  }
  if (['PENDING_PAYMENT', 'PAYING'].includes(normalizedStatus)) return '待支付';
  return '暂无物流信息';
}

function parseTraceItem(trace: unknown, index: number): OrderLogisticsTraceItem | undefined {
  if (!trace || typeof trace !== 'object') return undefined;
  const source = trace as Record<string, unknown>;
  const timeText = normalizeString(source.timeText)
    || normalizeString(source.time)
    || normalizeString(source.occurredAt)
    || normalizeString(source.createdAt);
  const detailText = normalizeString(source.detailText)
    || normalizeString(source.content)
    || normalizeString(source.description)
    || normalizeString(source.statusText);

  if (!timeText && !detailText) return undefined;

  return {
    id: normalizeString(source.id) || `trace-${index}`,
    timeText: timeText || '-',
    detailText: detailText || '物流状态已更新',
  };
}

function parseTraces(rawValue: unknown) {
  const rawList = typeof rawValue === 'string'
    ? (() => {
        try {
          const parsed = JSON.parse(rawValue) as unknown;
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })()
    : Array.isArray(rawValue) ? rawValue : [];

  return rawList
    .map((item, index) => parseTraceItem(item, index))
    .filter((item): item is OrderLogisticsTraceItem => Boolean(item));
}

function resolveTraces(order: BffOrder) {
  for (const key of LOGISTICS_TRACE_KEYS) {
    const traces = parseTraces(order.context?.[key] ?? order.items?.[0]?.attributes?.[key]);
    if (traces.length > 0) return traces;
  }
  return [];
}

// 物流详情优先读取真实订单详情里的物流上下文；后端未补齐字段时只展示真实空态，不回退 mock。
export async function fetchLogisticsData(orderId?: string): Promise<OrderLogisticsData> {
  if (!orderId) throw new Error('缺少订单编号');

  const order = await fetchBffOrderDetail(orderId);
  const sources = [order.context, order.items?.[0]?.attributes];

  return {
    productImageSrc: resolveImageSrc(order),
    statusText: resolveStatusText(order),
    companyText: pickFirstString(sources, LOGISTICS_COMPANY_KEYS) || '-',
    trackingNumberText: pickFirstString(sources, LOGISTICS_NUMBER_KEYS) || '-',
    hotlineText: pickFirstString(sources, LOGISTICS_PHONE_KEYS),
    quantityText: resolveQuantityText(order),
    totalAmountText: formatCent(order.payableAmountCent),
    confirmButtonText: undefined,
    traces: resolveTraces(order),
  };
}
