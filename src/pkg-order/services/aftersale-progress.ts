import type { OrderAftersaleProgressData } from './model';
import {
  buildMallAftersaleProgress,
  fetchMallAftersaleOrder,
  mapAftersaleOrderSummary,
  resolveMallAftersaleAmountText,
  resolveMallAftersaleDateText,
  resolveMallAftersaleReason,
  resolveMallAftersaleServiceNo,
  resolveMallAftersaleStatusDesc,
  resolveMallAftersaleStatusText,
  resolveMallAftersaleTypeText,
} from './aftersale-context';

export type { OrderAftersaleProgressData } from './model';

interface FetchAftersaleProgressOptions {
  orderId?: string;
  typeText?: string;
  reasonText?: string;
}

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function fetchAftersaleProgressData(
  options: FetchAftersaleProgressOptions = {},
): Promise<OrderAftersaleProgressData> {
  const order = await fetchMallAftersaleOrder(options.orderId);
  const context = order.context || {};
  const reasonText = options.reasonText || resolveMallAftersaleReason(order) || '用户在小程序提交退款申请';
  const trackingNumber = normalizeString(context.trackingNumber || context.waybillNo || context.logisticsNo || context.deliveryNo);
  const shippingAddress = normalizeString(context.addressText || context.deliveryAddress || context.shippingAddress);

  return {
    order: mapAftersaleOrderSummary(order),
    serviceNo: resolveMallAftersaleServiceNo(order),
    typeText: options.typeText || resolveMallAftersaleTypeText(order),
    statusText: resolveMallAftersaleStatusText(order),
    statusDesc: resolveMallAftersaleStatusDesc(order),
    refundAmountText: resolveMallAftersaleAmountText(order),
    reasonText,
    fields: [
      { label: '订单编号', value: order.orderNo },
      { label: '申请时间', value: resolveMallAftersaleDateText(order) },
      { label: '物流单号', value: trackingNumber },
      { label: '收货地址', value: shippingAddress },
    ].filter((field) => Boolean(field.value && field.value !== '-')),
    progress: buildMallAftersaleProgress(order, reasonText),
    primaryButtonText: '查看售后列表',
  };
}
