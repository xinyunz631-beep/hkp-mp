import {
  createBffOrder,
  payBffOrder,
  type BffOrder,
  type BffOrderConfirmResponse,
  type BffOrderPaymentChannel,
  type BffOrderPaymentResponse,
  type BffOrderRejectedCoupon,
  type BffOrderUnifiedRequest,
} from '@/core/services/bff-order-api';
import type { BffAvailableCouponView } from '@/core/services/bff-coupon-api';
import type { HkpCouponSummary } from '@/core/types/hkp';
import { centToYuan, parseNumberLike } from '@/core/utils/money';

export type CheckoutSceneType = 'MALL' | 'HOTEL' | 'TICKET';

export interface CheckoutAmountFallback {
  originalAmountCent?: number;
  freightAmountCent?: number;
  discountAmountCent?: number;
  payableAmountCent?: number;
}

export interface CheckoutAmountState {
  originalAmountCent: number;
  freightAmountCent: number;
  discountAmountCent: number;
  payableAmountCent: number;
  hasOriginalAmount: boolean;
  hasFreightAmount: boolean;
  hasDiscountAmount: boolean;
  hasPayableAmount: boolean;
  originalAmount: number;
  freightAmount: number;
  discountAmount: number;
  payableAmount: number;
}

export interface NormalizeCheckoutAmountOptions {
  sceneLabel?: string;
  requirePayableAmount?: boolean;
}

export interface CheckoutCouponState {
  requestedCouponId?: string;
  selectedCouponId?: string;
  selectedCouponNos: string[];
  appliedCouponNos: string[];
  rejectedCouponNos: string[];
  rejectedCoupons: BffOrderRejectedCoupon[];
  couponNoticeText?: string;
}

export interface CheckoutSubmitResult {
  orderNo: string;
  orderStatus?: string;
  payableAmount: number;
  payableAmountCent: number;
  order?: BffOrder;
  payment?: BffOrderPaymentResponse;
}

export interface SubmitAndPayBffOrderOptions {
  sceneLabel: string;
  paymentChannel?: BffOrderPaymentChannel;
  isOrderComplete?: (order: BffOrder) => boolean;
  validateCreatedOrder?: (order: BffOrder) => void;
  onOrderCreated?: (result: CheckoutSubmitResult) => Promise<void> | void;
}

function normalizeCent(value: unknown, fallback = 0) {
  const amount = parseNumberLike(value);
  return typeof amount === 'number' && amount >= 0 ? amount : fallback;
}

function normalizeOptionalCent(value: unknown, fallback?: unknown) {
  const amount = parseNumberLike(value);
  if (typeof amount === 'number' && amount >= 0) {
    return {
      value: amount,
      exists: true,
    };
  }

  const fallbackAmount = parseNumberLike(fallback);
  if (typeof fallbackAmount === 'number' && fallbackAmount >= 0) {
    return {
      value: fallbackAmount,
      exists: true,
    };
  }

  return {
    value: 0,
    exists: false,
  };
}

function normalizeCouponNos(couponNos?: string[]) {
  return (couponNos ?? []).map((couponNo) => String(couponNo || '').trim()).filter(Boolean);
}

function formatYuan(amountCent: unknown = 0) {
  const amount = centToYuan(amountCent);
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number | string) {
  const normalizedDiscountPercent = parseNumberLike(discountPercent);
  if (typeof normalizedDiscountPercent !== 'number' || normalizedDiscountPercent <= 0) return '';
  const discount = normalizedDiscountPercent > 10 ? normalizedDiscountPercent / 10 : normalizedDiscountPercent;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

// 统一归一化确认单金额，所有页面只读取这里转换后的分/元金额。
export function normalizeCheckoutAmounts(
  confirmation: BffOrderConfirmResponse | BffOrder | undefined,
  fallback: CheckoutAmountFallback = {},
  options: NormalizeCheckoutAmountOptions = {},
): CheckoutAmountState {
  const originalAmount = normalizeOptionalCent(confirmation?.originalAmountCent, fallback.originalAmountCent);
  const freightAmount = normalizeOptionalCent(confirmation?.freightAmountCent, fallback.freightAmountCent);
  const discountAmount = normalizeOptionalCent(confirmation?.discountAmountCent, fallback.discountAmountCent);
  const confirmedPayableAmountCent = parseNumberLike(confirmation?.payableAmountCent);
  const fallbackPayableAmountCent = parseNumberLike(fallback.payableAmountCent);
  const requirePayableAmount = options.requirePayableAmount ?? true;

  if (
    requirePayableAmount
    && (typeof confirmedPayableAmountCent !== 'number' || confirmedPayableAmountCent < 0)
    && (typeof fallbackPayableAmountCent !== 'number' || fallbackPayableAmountCent < 0)
  ) {
    throw new Error(`${options.sceneLabel || '订单确认'}金额暂不可用，请稍后再试`);
  }

  const payableAmountCent = typeof confirmedPayableAmountCent === 'number' && confirmedPayableAmountCent >= 0
    ? confirmedPayableAmountCent
    : normalizeCent(fallbackPayableAmountCent, 0);

  return {
    originalAmountCent: originalAmount.value,
    freightAmountCent: freightAmount.value,
    discountAmountCent: discountAmount.value,
    payableAmountCent,
    hasOriginalAmount: originalAmount.exists,
    hasFreightAmount: freightAmount.exists,
    hasDiscountAmount: discountAmount.exists,
    hasPayableAmount: typeof confirmedPayableAmountCent === 'number' && confirmedPayableAmountCent >= 0
      || typeof fallbackPayableAmountCent === 'number' && fallbackPayableAmountCent >= 0,
    originalAmount: centToYuan(originalAmount.value),
    freightAmount: centToYuan(freightAmount.value),
    discountAmount: centToYuan(discountAmount.value),
    payableAmount: centToYuan(payableAmountCent),
  };
}

// 将前端当前选券意图转成统一订单 selectedCouponNos，空数组表示本次不使用券。
export function buildSelectedCouponNos(selectedCouponId?: string | null) {
  return selectedCouponId ? [selectedCouponId] : [];
}

// 从后端确认结果提取真实用券事实，前端不再用本地门槛推断券是否生效。
export function resolveCheckoutCouponState(
  confirmation: BffOrderConfirmResponse | BffOrder | undefined,
  requestedCouponId?: string | null,
): CheckoutCouponState {
  const normalizedRequestedCouponId = requestedCouponId || undefined;
  const appliedCouponNos = normalizeCouponNos(confirmation?.appliedCouponNos);
  const selectedCouponNos = normalizeCouponNos(confirmation?.selectedCouponNos);
  const rejectedCoupons = confirmation?.rejectedCoupons ?? [];
  const rejectedCouponNos = normalizeCouponNos(rejectedCoupons.map((coupon) => coupon.couponNo || ''));
  const discountAmountCent = normalizeCent(confirmation?.discountAmountCent);
  let selectedCouponId: string | undefined = appliedCouponNos[0];

  if (!selectedCouponId && normalizedRequestedCouponId) {
    if (rejectedCouponNos.includes(normalizedRequestedCouponId)) {
      selectedCouponId = undefined;
    } else if (Array.isArray(confirmation?.appliedCouponNos)) {
      selectedCouponId = undefined;
    } else if (selectedCouponNos.includes(normalizedRequestedCouponId) && discountAmountCent > 0) {
      selectedCouponId = normalizedRequestedCouponId;
    }
  }

  const rejectedCoupon = normalizedRequestedCouponId
    ? rejectedCoupons.find((coupon) => coupon.couponNo === normalizedRequestedCouponId)
    : undefined;
  const warningText = confirmation && 'warnings' in confirmation ? confirmation.warnings?.find(Boolean) : undefined;
  const couponNoticeText = normalizedRequestedCouponId && normalizedRequestedCouponId !== selectedCouponId
    ? rejectedCoupon?.unavailableReason
      || rejectedCoupon?.reason
      || warningText
      || '该优惠券暂不可用，已重新计算订单金额'
    : undefined;

  return {
    requestedCouponId: normalizedRequestedCouponId,
    selectedCouponId,
    selectedCouponNos,
    appliedCouponNos,
    rejectedCouponNos,
    rejectedCoupons,
    couponNoticeText,
  };
}

// 将 BFF 可用券统一转成项目券卡片 DTO，优先使用分字段，兼容历史 discountAmount 字段。
export function toCheckoutCouponSummary(coupon: BffAvailableCouponView, fallbackTitle: string): HkpCouponSummary {
  const thresholdAmount = centToYuan(coupon.thresholdAmountCent);
  const discountAmountCent = parseNumberLike(coupon.discountAmountCent) ?? parseNumberLike(coupon.discountAmount);
  const discountAmount = centToYuan(discountAmountCent);
  const validDate = coupon.validEndAt ? coupon.validEndAt.slice(0, 10) : '';
  const available = coupon.available !== false && coupon.status === 'AVAILABLE';

  return {
    id: coupon.couponNo,
    title: coupon.couponName || coupon.couponNo || fallbackTitle,
    amountText: discountAmount > 0 ? `¥${formatYuan(discountAmountCent)}` : (formatDiscountPercent(coupon.discountPercent) || '优惠券'),
    thresholdText: thresholdAmount > 0 ? `满¥${thresholdAmount.toFixed(2)}可用` : '无门槛',
    validityText: validDate ? `有效期至 ${validDate}` : '按券规则生效',
    status: available ? 'available' : 'disabled',
    tag: available ? (coupon.reason || '可用') : (coupon.unavailableReason || coupon.reason || '暂不可用'),
    minimumAmount: thresholdAmount,
    discountAmount,
  };
}

// 订单创建成功后执行业务清理，清理失败不影响已创建订单继续支付或查看。
async function notifyOrderCreated(options: SubmitAndPayBffOrderOptions, result: CheckoutSubmitResult) {
  try {
    await options.onOrderCreated?.(result);
  } catch {
    // 草稿或购物车清理失败不能让已创建订单进入失败态。
  }
}

// 读取必须由后端返回的应付金额，缺失时阻断提交和支付。
export function assertValidPayableAmountCent(value: unknown, sceneLabel: string) {
  const amount = parseNumberLike(value);
  if (typeof amount !== 'number' || amount < 0) {
    throw new Error(`${sceneLabel}金额暂不可用，请稍后再试`);
  }

  return amount;
}

// 创建统一订单并申请预支付，微信支付能力由页面 controller 统一唤起。
export async function submitAndPayBffOrder(
  request: BffOrderUnifiedRequest,
  options: SubmitAndPayBffOrderOptions,
): Promise<CheckoutSubmitResult> {
  const createResult = await createBffOrder(request);
  const order = createResult.order;
  const orderNo = order?.orderNo;
  if (!orderNo) {
    throw new Error('订单创建失败：缺少订单编号');
  }

  options.validateCreatedOrder?.(order);
  const createPayableAmountCent = assertValidPayableAmountCent(order.payableAmountCent, options.sceneLabel);
  const orderStatus = order.orderStatus;
  const createdResult = {
    orderNo,
    orderStatus,
    payableAmount: centToYuan(createPayableAmountCent),
    payableAmountCent: createPayableAmountCent,
    order,
  };
  await notifyOrderCreated(options, createdResult);

  if (createPayableAmountCent === 0 || options.isOrderComplete?.(order)) {
    return createdResult;
  }

  let payment: BffOrderPaymentResponse;
  try {
    payment = await payBffOrder(orderNo, options.paymentChannel || 'WECHAT');
  } catch {
    // 订单已创建时预支付失败不能把用户留在失效确认单；页面会引导到订单详情继续待支付。
    return createdResult;
  }
  const payableAmountCent = assertValidPayableAmountCent(payment.order?.payableAmountCent ?? createPayableAmountCent, options.sceneLabel);

  return {
    orderNo,
    orderStatus: payment.order?.orderStatus ?? orderStatus,
    payableAmount: centToYuan(payableAmountCent),
    payableAmountCent,
    order: payment.order ?? order,
    payment,
  };
}
