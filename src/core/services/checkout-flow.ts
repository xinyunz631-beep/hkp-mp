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
  originalAmount: number;
  freightAmount: number;
  discountAmount: number;
  payableAmount: number;
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
}

function normalizeCent(value: unknown, fallback = 0) {
  const amount = parseNumberLike(value);
  return typeof amount === 'number' && amount >= 0 ? amount : fallback;
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
): CheckoutAmountState {
  const originalAmountCent = normalizeCent(confirmation?.originalAmountCent, fallback.originalAmountCent ?? fallback.payableAmountCent ?? 0);
  const freightAmountCent = normalizeCent(confirmation?.freightAmountCent, fallback.freightAmountCent ?? 0);
  const discountAmountCent = normalizeCent(confirmation?.discountAmountCent, fallback.discountAmountCent ?? 0);
  const payableAmountCent = normalizeCent(confirmation?.payableAmountCent, fallback.payableAmountCent ?? Math.max(0, originalAmountCent + freightAmountCent - discountAmountCent));

  return {
    originalAmountCent,
    freightAmountCent,
    discountAmountCent,
    payableAmountCent,
    originalAmount: centToYuan(originalAmountCent),
    freightAmount: centToYuan(freightAmountCent),
    discountAmount: centToYuan(discountAmountCent),
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

// 将 BFF 可用券统一转成项目券卡片 DTO，金额单位只接受 discountAmountCent。
export function toCheckoutCouponSummary(coupon: BffAvailableCouponView, fallbackTitle: string): HkpCouponSummary {
  const thresholdAmount = centToYuan(coupon.thresholdAmountCent);
  const discountAmountCent = parseNumberLike(coupon.discountAmountCent);
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
  if (createPayableAmountCent === 0 || options.isOrderComplete?.(order)) {
    return {
      orderNo,
      orderStatus,
      payableAmount: centToYuan(createPayableAmountCent),
      payableAmountCent: createPayableAmountCent,
      order,
    };
  }

  const payment = await payBffOrder(orderNo, options.paymentChannel || 'WECHAT');
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
