import {
  fetchBffOrderAftersaleProgress,
  fetchBffOrderDetail,
} from '@/core/services/bff-order-api';
import {
  mergeOrderSummaryWithDetail,
  normalizeText,
  toAftersaleField,
  toAftersaleProgressStep,
  toOrderSummary,
} from './bff-adapter';
import { mapOrderCouponFields } from './coupon-facts';
import type { OrderAftersaleProgressData } from './model';

export type { OrderAftersaleProgressData } from './model';

interface FetchAftersaleProgressOptions {
  orderId?: string;
  typeText?: string;
  reasonText?: string;
}

export async function fetchAftersaleProgressData(
  options: FetchAftersaleProgressOptions = {},
): Promise<OrderAftersaleProgressData> {
  if (!options.orderId) throw new Error('缺少订单编号');

  const [progressResult, orderDetailResult] = await Promise.allSettled([
    fetchBffOrderAftersaleProgress(options.orderId, {
      typeText: options.typeText,
      reasonText: options.reasonText,
    }),
    // 售后进度本身不能因为订单详情附加读取失败而阻断，券事实只做增强展示。
    fetchBffOrderDetail(options.orderId, {
      showErrorToast: false,
    }),
  ]);

  if (progressResult.status !== 'fulfilled') throw progressResult.reason;

  const data = progressResult.value;
  const orderSummary = toOrderSummary(data.order);
  const orderDetail = orderDetailResult.status === 'fulfilled' ? orderDetailResult.value : undefined;

  return {
    order: mergeOrderSummaryWithDetail(orderSummary, orderDetail),
    serviceNo: normalizeText(data.serviceNo),
    typeText: normalizeText(data.typeText),
    statusText: normalizeText(data.statusText),
    statusDesc: normalizeText(data.statusDesc),
    refundAmountText: normalizeText(data.refundAmountText),
    reasonText: normalizeText(data.reasonText),
    couponFields: orderDetailResult.status === 'fulfilled'
      ? mapOrderCouponFields(orderDetailResult.value)
      : [],
    fields: (data.fields || []).map(toAftersaleField).filter((field) => field.label && field.value),
    progress: (data.progress || []).map(toAftersaleProgressStep).filter((step) => step.id && step.title),
    primaryButtonText: normalizeText(data.primaryButtonText),
    unavailableReason: normalizeText(data.unavailableReason) || undefined,
  };
}
