import { fetchBffOrderDetail, fetchBffOrders, type BffOrder } from '@/core/services/bff-order-api';
import type { HkpOrderSummary } from '@/core/types/hkp';
import type { OrderAftersaleProgressStepData } from './model';

const MALL_REFUNDING_STATUSES = new Set(['REFUNDING']);
const MALL_REFUNDED_STATUSES = new Set(['REFUNDED']);
const MALL_REFUNDABLE_STATUSES = new Set(['PAID', 'WAIT_USE', 'FULFILLING']);

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatCent(value?: number) {
  return `¥${((value || 0) / 100).toFixed(2)}`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}

function resolveOrderTitle(order: BffOrder) {
  const firstItem = order.items?.[0];
  return firstItem?.itemName
    || firstItem?.attributes?.roomTitle
    || firstItem?.attributes?.ratePlanTitle
    || order.context?.roomTitle
    || `${order.sceneType || ''}订单`;
}

function resolveOrderImage(order: BffOrder) {
  const firstItem = order.items?.[0];
  return normalizeString(
    firstItem?.attributes?.imageUrl
      || firstItem?.attributes?.imageSrc
      || firstItem?.attributes?.mainImageUrl,
  );
}

function resolveOrderSkuText(order: BffOrder) {
  const firstItem = order.items?.[0];
  return normalizeString(
    firstItem?.attributes?.specName
      || firstItem?.attributes?.skuName
      || firstItem?.skuId,
  );
}

function resolveMerchantName(order: BffOrder) {
  return normalizeString(
    order.context?.merchantName
      || order.items?.[0]?.attributes?.merchantName
      || order.items?.[0]?.attributes?.shopName,
  );
}

function parseCentFromContext(order: BffOrder, keys: string[]) {
  for (const key of keys) {
    const rawValue = order.context?.[key];
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

function resolveMallOrderStatusText(order: BffOrder) {
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();
  if (MALL_REFUNDED_STATUSES.has(normalizedStatus)) return '退款成功';
  if (MALL_REFUNDING_STATUSES.has(normalizedStatus)) return '退款处理中';
  if (MALL_REFUNDABLE_STATUSES.has(normalizedStatus)) return '待平台处理';
  if (normalizedStatus === 'FULFILLED') return '已完成';
  return order.orderStatus || '处理中';
}

function resolveMallStatusDesc(order: BffOrder) {
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();
  if (MALL_REFUNDED_STATUSES.has(normalizedStatus)) {
    return '退款结果已回写订单状态，到账时间以后端支付与退款处理结果为准。';
  }
  if (MALL_REFUNDING_STATUSES.has(normalizedStatus)) {
    return '退款申请已提交，平台会结合订单状态、支付状态和履约状态继续处理。';
  }
  if (MALL_REFUNDABLE_STATUSES.has(normalizedStatus)) {
    return '当前小程序商城只支持发起退款申请，退货/换货需由商家或客服线下协助处理。';
  }
  return '当前订单暂无可展示的商城售后处理记录。';
}

export function resolveMallAftersaleTypeText(order: BffOrder) {
  return normalizeString(
    order.context?.aftersaleTypeText
      || order.context?.afterSaleType
      || order.context?.refundTypeText,
  ) || '退款';
}

export function resolveMallAftersaleReason(order: BffOrder) {
  return normalizeString(
    order.context?.aftersaleReason
      || order.context?.afterSaleReason
      || order.context?.refundReason
      || order.remark,
  );
}

export function resolveMallAftersaleServiceNo(order: BffOrder) {
  return normalizeString(
    order.context?.aftersaleNo
      || order.context?.afterSaleNo
      || order.context?.refundNo,
  ) || order.orderNo;
}

export function resolveMallAftersaleAmountText(order: BffOrder) {
  const refundAmountCent = parseCentFromContext(order, ['refundAmountCent', 'aftersaleAmountCent']);
  return formatCent(refundAmountCent ?? order.payableAmountCent);
}

export function isMallAftersaleRecord(order: BffOrder) {
  if (order.sceneType !== 'MALL') return false;
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();
  return MALL_REFUNDING_STATUSES.has(normalizedStatus) || MALL_REFUNDED_STATUSES.has(normalizedStatus);
}

export function canApplyMallRefund(order: BffOrder) {
  if (order.sceneType !== 'MALL') return false;
  return MALL_REFUNDABLE_STATUSES.has(String(order.orderStatus || '').toUpperCase());
}

export function mapAftersaleOrderSummary(order: BffOrder): HkpOrderSummary {
  const firstItem = order.items?.[0];
  const productTitle = resolveOrderTitle(order);
  const totalQuantity = order.items?.reduce((total, item) => total + (item.quantity || 0), 0) || 0;
  const primaryQuantity = Number(firstItem?.quantity);
  const normalizedQuantity = Number.isFinite(primaryQuantity) && primaryQuantity > 0 ? primaryQuantity : 0;
  const payableAmountCent = typeof order.payableAmountCent === 'number' ? order.payableAmountCent : 0;

  return {
    id: order.orderNo,
    merchantName: resolveMerchantName(order) || '商城订单',
    statusText: resolveMallOrderStatusText(order),
    products: [{
      id: firstItem?.itemId || order.orderNo,
      title: productTitle,
      subtitle: firstItem?.attributes?.subTitle,
      image: { src: resolveOrderImage(order) },
      skuText: resolveOrderSkuText(order),
      price: normalizedQuantity > 0 ? (payableAmountCent / normalizedQuantity) / 100 : 0,
      quantity: normalizedQuantity,
    }],
    totalAmount: payableAmountCent / 100,
    countText: totalQuantity > 0 ? `共${totalQuantity}件` : '',
    primaryActionText: canApplyMallRefund(order) ? '申请退款' : '查看详情',
  };
}

export function buildMallAftersaleProgress(order: BffOrder, reasonText?: string): OrderAftersaleProgressStepData[] {
  const appliedAt = formatDateTime(order.updatedAt || order.createdAt);
  const resolvedReason = reasonText || resolveMallAftersaleReason(order);
  const steps: OrderAftersaleProgressStepData[] = [{
    id: 'submit',
    title: '提交退款申请',
    timeText: appliedAt,
    detailText: resolvedReason ? `申请原因：${resolvedReason}` : '小程序已发起退款申请，等待平台处理。',
  }];
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();

  if (MALL_REFUNDED_STATUSES.has(normalizedStatus)) {
    steps.push({
      id: 'done',
      title: '退款处理完成',
      timeText: formatDateTime(order.updatedAt || order.createdAt),
      detailText: '退款结果已回写订单状态，实际到账时间以后端支付通道为准。',
    });
  } else {
    steps.push({
      id: 'reviewing',
      title: '平台审核处理中',
      timeText: formatDateTime(order.updatedAt || order.createdAt),
      detailText: '当前商城售后仅接统一订单退款流程，退货/换货需联系商家客服协助。',
    });
  }

  return steps;
}

export async function fetchMallAftersaleOrders() {
  const orders = await fetchBffOrders('MALL');
  return orders
    .filter(isMallAftersaleRecord)
    .sort((left, right) => String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || '')));
}

export async function fetchMallAftersaleOrder(orderId?: string) {
  if (!orderId) throw new Error('缺少订单编号');
  return fetchBffOrderDetail(orderId);
}

export function resolveMallAftersaleStatusText(order: BffOrder) {
  return resolveMallOrderStatusText(order);
}

export function resolveMallAftersaleStatusDesc(order: BffOrder) {
  return resolveMallStatusDesc(order);
}

export function resolveMallAftersaleDateText(order: BffOrder) {
  return formatDateTime(order.updatedAt || order.createdAt);
}
