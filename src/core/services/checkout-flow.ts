import {
  createBffOrder,
  type BffOrder,
  type BffOrderConfirmResponse,
  type BffOrderPaymentChannel,
  type BffOrderPaymentResponse,
  type BffPromotionCouponView,
  type BffPromotionDiscountLine,
  type BffOrderRejectedCoupon,
  type BffOrderUnifiedRequest,
} from '@/core/services/bff-order-api';
import {
  getBffCouponAmountCent,
  getBffCouponReason,
  getBffCouponThresholdCent,
  getBffCouponTitle,
  isBffCouponAvailable,
  type BffAvailableCouponView,
} from '@/core/services/bff-coupon-api';
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
  completeCheckout?: () => Promise<void> | void;
}

export interface CheckoutPendingOrder {
  orderNo: string;
  orderStatus?: string;
  payableAmountCent: number;
  payNo?: string;
  payExpireAt?: string;
  requestFingerprint: string;
  updatedAt: string;
}

export interface SubmitAndPayBffOrderOptions {
  sceneLabel: string;
  paymentChannel?: BffOrderPaymentChannel;
  isOrderComplete?: (order: BffOrder) => boolean;
  validateCreatedOrder?: (order: BffOrder) => void;
  onCheckoutCompleted?: (result: CheckoutSubmitResult) => Promise<void> | void;
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

function normalizeCouponNos(couponNos?: unknown) {
  if (!Array.isArray(couponNos)) return [];
  return couponNos.map((couponNo) => String(couponNo || '').trim()).filter(Boolean);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .filter((key) => typeof record[key] !== 'undefined')
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function isExpiredAt(value?: string) {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && time <= Date.now();
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

function isOrderWithCouponFacts(
  confirmation: BffOrderConfirmResponse | BffOrder | undefined,
): confirmation is BffOrder {
  return Boolean(confirmation && (
    'appliedCouponNos' in confirmation
    || 'selectedCouponNos' in confirmation
    || 'rejectedCoupons' in confirmation
  ));
}

function couponNoOf(record: BffPromotionDiscountLine | BffPromotionCouponView | undefined) {
  return typeof record?.couponNo === 'string' ? record.couponNo.trim() : '';
}

function promotionQuoteOf(confirmation: BffOrderConfirmResponse | BffOrder | undefined) {
  if (!confirmation || !('promotionQuote' in confirmation)) return undefined;
  return confirmation.promotionQuote;
}

function resolveAppliedCouponNos(confirmation: BffOrderConfirmResponse | BffOrder | undefined) {
  if (isOrderWithCouponFacts(confirmation)) {
    const orderAppliedCouponNos = normalizeCouponNos(confirmation.appliedCouponNos);
    if (orderAppliedCouponNos.length > 0) return orderAppliedCouponNos;
  }

  const appliedDiscounts = promotionQuoteOf(confirmation)?.appliedDiscounts;
  if (!Array.isArray(appliedDiscounts)) return [];

  return normalizeCouponNos(appliedDiscounts.map((discount) => couponNoOf(discount)));
}

function resolveSelectedCouponNos(confirmation: BffOrderConfirmResponse | BffOrder | undefined) {
  if (isOrderWithCouponFacts(confirmation)) {
    const orderSelectedCouponNos = normalizeCouponNos(confirmation.selectedCouponNos);
    if (orderSelectedCouponNos.length > 0) return orderSelectedCouponNos;
  }

  const availableCoupons = promotionQuoteOf(confirmation)?.availableCoupons;
  if (!Array.isArray(availableCoupons)) return [];

  return normalizeCouponNos(
    availableCoupons
      .filter((coupon) => coupon?.selected === true)
      .map((coupon) => couponNoOf(coupon)),
  );
}

function resolveRejectedCoupons(confirmation: BffOrderConfirmResponse | BffOrder | undefined) {
  if (!isOrderWithCouponFacts(confirmation) || !Array.isArray(confirmation.rejectedCoupons)) return [];
  return confirmation.rejectedCoupons;
}

// 从后端确认结果提取真实用券事实，前端不再用本地门槛推断券是否生效。
export function resolveCheckoutCouponState(
  confirmation: BffOrderConfirmResponse | BffOrder | undefined,
  requestedCouponId?: string | null,
): CheckoutCouponState {
  const normalizedRequestedCouponId = requestedCouponId || undefined;
  const appliedCouponNos = resolveAppliedCouponNos(confirmation);
  const selectedCouponNos = resolveSelectedCouponNos(confirmation);
  const rejectedCoupons = resolveRejectedCoupons(confirmation);
  const rejectedCouponNos = normalizeCouponNos(rejectedCoupons.map((coupon) => coupon.couponNo || ''));
  let selectedCouponId: string | undefined = appliedCouponNos[0];

  if (!selectedCouponId && normalizedRequestedCouponId) {
    if (rejectedCouponNos.includes(normalizedRequestedCouponId)) {
      selectedCouponId = undefined;
    }
  }

  const rejectedCoupon = normalizedRequestedCouponId
    ? rejectedCoupons.find((coupon) => coupon.couponNo === normalizedRequestedCouponId)
    : undefined;
  const warningText = confirmation && 'warnings' in confirmation ? confirmation.warnings?.find(Boolean) : undefined;
  const noticeText = rejectedCoupon?.unavailableReason || rejectedCoupon?.reason || warningText;
  const couponNoticeText = normalizedRequestedCouponId && normalizedRequestedCouponId !== selectedCouponId
    ? noticeText
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

// 过滤无效券 DTO，避免结算页展示缺少后端关键字段的优惠券。
export function isCheckoutCouponSummary(coupon: HkpCouponSummary | undefined): coupon is HkpCouponSummary {
  return Boolean(coupon);
}

// 将 BFF 可用券统一转成项目券卡片 DTO，只展示后端返回了关键展示字段的券。
export function toCheckoutCouponSummary(coupon: BffAvailableCouponView): HkpCouponSummary | undefined {
  const couponNo = typeof coupon.couponNo === 'string' ? coupon.couponNo.trim() : '';
  const couponName = getBffCouponTitle(coupon);
  const discountAmountCent = getBffCouponAmountCent(coupon);
  const hasDiscountAmount = typeof discountAmountCent === 'number' && discountAmountCent > 0;
  const percentText = formatDiscountPercent(coupon.discountPercent ?? coupon.discountRate);
  const amountText = hasDiscountAmount ? `¥${formatYuan(discountAmountCent)}` : percentText;
  const thresholdAmountCent = getBffCouponThresholdCent(coupon);
  const hasThresholdAmount = [
    coupon.thresholdAmountCent,
    coupon.thresholdAmount,
  ].some((value) => typeof parseNumberLike(value) === 'number');
  const thresholdAmount = hasThresholdAmount ? centToYuan(thresholdAmountCent) : undefined;
  const validDate = typeof coupon.validEndAt === 'string' && coupon.validEndAt.trim()
    ? coupon.validEndAt.slice(0, 10)
    : '';
  const available = isBffCouponAvailable(coupon);

  if (!couponNo || !couponName || !amountText) return undefined;

  return {
    id: couponNo,
    title: couponName,
    amountText,
    thresholdText: hasThresholdAmount
      ? thresholdAmount && thresholdAmount > 0
        ? `满¥${thresholdAmount.toFixed(2)}可用`
        : '无门槛'
      : '',
    validityText: validDate ? `有效期至 ${validDate}` : '',
    status: available ? 'available' : 'disabled',
    tag: getBffCouponReason(coupon),
    minimumAmount: thresholdAmount ?? 0,
    discountAmount: hasDiscountAmount ? centToYuan(discountAmountCent) : 0,
  };
}

// 支付链路终态成功后执行业务清理，清理失败不影响已创建订单继续查看。
function attachCheckoutCompletion(
  result: Omit<CheckoutSubmitResult, 'completeCheckout'>,
  options: SubmitAndPayBffOrderOptions,
): CheckoutSubmitResult {
  const nextResult: CheckoutSubmitResult = { ...result };
  nextResult.completeCheckout = async () => {
    try {
      await options.onCheckoutCompleted?.(nextResult);
    } catch {
      // 草稿或购物车清理失败不能影响已完成订单继续查看。
    }
  };

  return nextResult;
}

// 生成统一订单请求指纹，用于判断支付失败后本地待支付订单是否仍对应当前确认单。
export function createCheckoutRequestFingerprint(request: BffOrderUnifiedRequest) {
  return stableStringify(request);
}

// 将已创建但未支付完成的订单保存为草稿内待支付快照，后续重进结算页复用同一订单号。
export function buildCheckoutPendingOrder(
  result: CheckoutSubmitResult,
  requestFingerprint: string,
): CheckoutPendingOrder | undefined {
  const payableAmountCent = assertValidPayableAmountCent(result.payableAmountCent, '订单');
  if (!result.orderNo || payableAmountCent <= 0) return undefined;

  return {
    orderNo: result.orderNo,
    orderStatus: result.order?.orderStatus ?? result.orderStatus,
    payableAmountCent,
    payNo: result.payment?.prepay?.payNo ?? result.order?.payNo,
    payExpireAt: result.order?.payExpireAt ?? result.payment?.order?.payExpireAt,
    requestFingerprint,
    updatedAt: new Date().toISOString(),
  };
}

// 判断本地待支付订单是否还能复用；请求内容变了或支付过期时必须重新走后端确认和建单。
export function canReuseCheckoutPendingOrder(
  pendingOrder: CheckoutPendingOrder | undefined,
  requestFingerprint: string,
) {
  return Boolean(
    pendingOrder?.orderNo
      && pendingOrder.requestFingerprint === requestFingerprint
      && !isExpiredAt(pendingOrder.payExpireAt),
  );
}

// 从草稿内待支付快照恢复提交结果，页面 controller 会继续重新向 BFF 拉取最新预支付参数。
export function restoreCheckoutPendingResult(
  pendingOrder: CheckoutPendingOrder,
  options: SubmitAndPayBffOrderOptions,
): CheckoutSubmitResult {
  const payableAmountCent = assertValidPayableAmountCent(pendingOrder.payableAmountCent, options.sceneLabel);

  return attachCheckoutCompletion({
    orderNo: pendingOrder.orderNo,
    orderStatus: pendingOrder.orderStatus,
    payableAmount: centToYuan(payableAmountCent),
    payableAmountCent,
    order: {
      orderNo: pendingOrder.orderNo,
      orderStatus: pendingOrder.orderStatus,
      payableAmountCent,
      payNo: pendingOrder.payNo,
      payExpireAt: pendingOrder.payExpireAt,
    },
  }, options);
}

// 读取必须由后端返回的应付金额，缺失时阻断提交和支付。
export function assertValidPayableAmountCent(value: unknown, sceneLabel: string) {
  const amount = parseNumberLike(value);
  if (typeof amount !== 'number' || amount < 0) {
    throw new Error(`${sceneLabel}金额暂不可用，请稍后再试`);
  }

  return amount;
}

// 创建统一订单，微信预支付和原生支付调起由页面 controller 统一处理。
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
  const createdResult = attachCheckoutCompletion({
    orderNo,
    orderStatus,
    payableAmount: centToYuan(createPayableAmountCent),
    payableAmountCent: createPayableAmountCent,
    order,
  }, options);

  if (createPayableAmountCent === 0 || options.isOrderComplete?.(order)) {
    return createdResult;
  }

  return createdResult;
}
