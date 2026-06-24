import { confirmBffOrder, type BffOrderConfirmResponse } from '@/core/services/bff-order-api';
import { fetchBffCouponAvailable } from '@/core/services/bff-coupon-api';
import {
  buildCheckoutPendingOrder,
  canReuseCheckoutPendingOrder,
  createCheckoutRequestFingerprint,
  isCheckoutCouponSummary,
  normalizeCheckoutAmounts,
  restoreCheckoutPendingResult,
  resolveCheckoutCouponState,
  submitAndPayBffOrder,
  toCheckoutCouponSummary,
  type CheckoutSubmitResult,
} from '@/core/services/checkout-flow';
import {
  getMallCheckoutDraft,
  isMallCheckoutAddressRequired,
  removeMallCheckoutDraft,
  updateMallCheckoutDraft,
  validateMallCheckoutDelivery,
  type MallCheckoutDraft,
} from '@/core/services/mall-checkout-draft';
import { centToYuan, formatCurrency, parseNumberLike } from '@/core/utils/money';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import type { OrderCheckoutData, OrderCheckoutDiscountDetailData, OrderCheckoutProductData } from './model';
import {
  buildMallCheckoutOrderRequest,
  persistMallCheckoutAddress,
  resolveMallCheckoutAddress,
} from './checkout-adapter';
import { deleteMallCartItems, fetchMallCartSummary } from '@/pkg-mall/services/cart';

export type { OrderCheckoutData } from './model';

interface FetchCheckoutDataOptions {
  draftId?: string;
  addressId?: string;
  selectedCouponId?: string | null;
}

export interface MallCheckoutOrderResult extends CheckoutSubmitResult {}

function resolveSelectedCouponId(options: FetchCheckoutDataOptions, draft: MallCheckoutDraft) {
  if (Object.prototype.hasOwnProperty.call(options, 'selectedCouponId')) {
    return options.selectedCouponId || undefined;
  }

  return draft.selectedCouponId;
}

// 从后端原始记录中读取可展示文案，避免把空字段和未清洗文本透出到页面。
function readRecordString(record: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => record[key]).find((item) => typeof item === 'string' && item.trim());
  return typeof value === 'string' ? sanitizeMallRuntimeText(value) : '';
}

// 从后端原始记录中读取行号、SKU 等匹配标识，兼容字符串和数字两种返回。
function readRecordToken(record: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => record[key]).find((item) => (
    (typeof item === 'string' && item.trim())
    || (typeof item === 'number' && Number.isFinite(item))
  ));
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' ? sanitizeMallRuntimeText(value) : '';
}

// 将促销服务的 appliedDiscounts 原文转成结算页可展示的优惠明细。
function buildPromotionDiscountDetails(confirmation: BffOrderConfirmResponse): OrderCheckoutDiscountDetailData[] {
  const appliedDiscounts = Array.isArray(confirmation.promotionQuote?.appliedDiscounts)
    ? confirmation.promotionQuote.appliedDiscounts
    : [];
  return appliedDiscounts
    .map((item, index): OrderCheckoutDiscountDetailData | undefined => {
      if (!item || typeof item !== 'object') return undefined;
      const record = item as Record<string, unknown>;
      const discountAmountCent = parseNumberLike(record.discountAmountCent);
      if (typeof discountAmountCent !== 'number' || discountAmountCent <= 0) return undefined;

      const title = readRecordString(record, ['discountName']);
      if (!title) return undefined;

      return {
        id: readRecordString(record, ['couponNo', 'discountCode']) || `discount-${index + 1}`,
        title,
        amountText: `- ${formatCurrency(centToYuan(discountAmountCent))}`,
      };
    })
    .filter((item): item is OrderCheckoutDiscountDetailData => Boolean(item));
}

interface PromotionItemAllocation {
  originalAmountCent: number;
  payableAmountCent: number;
}

// 建立促销分摊索引，商品行折后金额只读取后端返回的 itemAllocations。
function buildPromotionItemAllocationIndex(confirmation?: BffOrderConfirmResponse) {
  const allocations = Array.isArray(confirmation?.promotionQuote?.itemAllocations)
    ? confirmation.promotionQuote.itemAllocations
    : [];
  const byLineNo = new Map<string, PromotionItemAllocation>();
  const bySkuId = new Map<string, PromotionItemAllocation>();

  allocations.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    const originalAmountCent = parseNumberLike(record.originalAmountCent);
    const payableAmountCent = parseNumberLike(record.payableAmountCent);
    if (typeof originalAmountCent !== 'number' || typeof payableAmountCent !== 'number') return;

    const allocation = { originalAmountCent, payableAmountCent };
    const lineNo = readRecordToken(record, ['lineNo']);
    const skuId = readRecordToken(record, ['skuId']);
    if (lineNo) byLineNo.set(lineNo, allocation);
    if (skuId) bySkuId.set(skuId, allocation);
  });

  return { byLineNo, bySkuId };
}

// 生成商城确认单商品行，优惠后的实付价和划线原价以后端促销分摊为准。
function buildCheckoutProducts(
  draft: MallCheckoutDraft,
  confirmation?: BffOrderConfirmResponse,
): OrderCheckoutProductData[] {
  const allocationIndex = buildPromotionItemAllocationIndex(confirmation);

  return draft.products.map((item, index) => {
    const allocation = allocationIndex.byLineNo.get(String(index + 1)) ?? allocationIndex.bySkuId.get(item.id);
    const hasDiscount = Boolean(
      allocation
      && allocation.payableAmountCent >= 0
      && allocation.originalAmountCent > allocation.payableAmountCent,
    );

    return {
      id: item.id,
      title: item.title,
      specText: sanitizeMallRuntimeText(item.specText),
      quantity: item.quantity,
      priceText: formatCurrency(item.unitPrice),
      paidPriceText: hasDiscount ? formatCurrency(centToYuan(allocation?.payableAmountCent)) : undefined,
      originalPriceText: hasDiscount ? formatCurrency(centToYuan(allocation?.originalAmountCent)) : undefined,
      imageSrc: sanitizeMallRuntimeUrl(item.imageSrc),
      giftText: sanitizeMallRuntimeText(item.giftText) || undefined,
      canRefund: item.canRefund,
      canAfterSale: item.canAfterSale,
    };
  });
}

// 将确认单拒绝券事实合并到券列表，避免可用券接口与最终试算结果短暂不一致时仍显示已选。
function applyConfirmedCouponFacts(
  coupons: NonNullable<ReturnType<typeof toCheckoutCouponSummary>>[],
  couponState: ReturnType<typeof resolveCheckoutCouponState>,
) {
  const rejectedCouponMap = new Map(couponState.rejectedCoupons.map((coupon) => [
    coupon.couponNo,
    coupon.unavailableReason || coupon.reason || '该优惠券暂不可用',
  ]));

  return coupons.map((coupon) => {
    const rejectedReason = rejectedCouponMap.get(coupon.id);
    if (!rejectedReason) return coupon;

    return {
      ...coupon,
      status: 'disabled' as const,
      tag: sanitizeMallRuntimeText(rejectedReason) || coupon.tag,
    };
  });
}

function buildReadonlyCheckoutData(
  draft: MallCheckoutDraft,
  address: Awaited<ReturnType<typeof resolveMallCheckoutAddress>>,
  deliveryCheck: ReturnType<typeof validateMallCheckoutDelivery>,
  requiresAddress: boolean,
): OrderCheckoutData {
  const merchantNames = Array.from(new Set(
    draft.products
      .map((item) => sanitizeMallRuntimeText(item.merchantName))
      .filter((item): item is string => Boolean(item)),
  ));
  const merchantName = merchantNames.length > 1
    ? `${merchantNames.slice(0, 2).join(' / ')}${merchantNames.length > 2 ? ' 等' : ''}`
    : merchantNames[0];

  return {
    draftId: draft.id,
    merchantName,
    address,
    requiresAddress,
    paymentMethodText: '微信支付',
    products: buildCheckoutProducts(draft),
    shippingText: deliveryCheck.shippingText,
    canSubmit: deliveryCheck.canSubmit,
    deliveryErrors: deliveryCheck.errors,
    couponText: '',
    couponNoticeText: '',
    selectedCouponId: undefined,
    coupons: [],
    discountText: '',
    discountDetails: [],
    productAmount: undefined,
    freightAmount: deliveryCheck.freightAmount,
    totalAmount: 0,
    amountReady: false,
    discountAmount: 0,
  };
}

// 删除商城订单来源的购物车项，失败不影响已创建订单继续支付或查看。
async function removeMallCheckoutSourceCartItems(draft: MallCheckoutDraft) {
  const cartItemIds = Array.from(new Set(
    draft.products
      .map((product) => product.sourceCartItemId)
      .filter((itemId): itemId is string => Boolean(itemId)),
  ));
  if (cartItemIds.length === 0) return;

  try {
    await deleteMallCartItems(cartItemIds);
  } catch {
    // 购物车清理失败不能影响订单创建结果；局部删除成功时主动刷新汇总，避免角标旧值滞留。
    await fetchMallCartSummary().catch(() => undefined);
  }
}

// 商城订单创建成功后只清当前商城草稿、当前地址选择和该草稿来源购物车项。
async function cleanupMallCheckoutAfterOrderCreated(draft: MallCheckoutDraft) {
  removeMallCheckoutDraft(draft.id);
  await removeMallCheckoutSourceCartItems(draft);
}

// 获取商城确认单真实数据，金额和用券事实以统一订单确认接口为准。
export async function fetchCheckoutData(options: FetchCheckoutDataOptions = {}) {
  const draft = getMallCheckoutDraft(options.draftId);
  if (!draft) throw new Error('订单信息已失效，请重新选择商品');

  const requiresAddress = isMallCheckoutAddressRequired(draft);
  const address = await resolveMallCheckoutAddress(options, requiresAddress);
  persistMallCheckoutAddress(draft.id, address);

  const deliveryCheck = validateMallCheckoutDelivery(draft, address);
  const readonlyData = buildReadonlyCheckoutData(draft, address, deliveryCheck, requiresAddress);
  if (!deliveryCheck.canSubmit) return readonlyData;

  const selectedCouponId = resolveSelectedCouponId(options, draft);
  const confirmation = await confirmBffOrder(buildMallCheckoutOrderRequest({
    draft,
    address,
    selectedCouponId,
    freightAmount: deliveryCheck.freightAmount,
  }));
  const amounts = normalizeCheckoutAmounts(confirmation, {}, {
    sceneLabel: '商城确认单',
    requirePayableAmount: true,
  });
  const availableCouponsResponse = await fetchBffCouponAvailable({
    sceneType: 'MALL',
    orderAmountCent: amounts.hasOriginalAmount ? amounts.originalAmountCent : undefined,
    itemIds: draft.products.map((item) => item.productId),
    skuIds: draft.products.map((item) => item.id),
  });
  const couponState = resolveCheckoutCouponState(confirmation, selectedCouponId);
  const coupons = applyConfirmedCouponFacts(
    (availableCouponsResponse.coupons ?? [])
      .map((coupon) => toCheckoutCouponSummary(coupon))
      .filter(isCheckoutCouponSummary),
    couponState,
  );
  const selectedCoupon = coupons.find((coupon) => coupon.id === couponState.selectedCouponId && coupon.status === 'available');
  const confirmedCouponId = selectedCoupon?.id;

  if (Object.prototype.hasOwnProperty.call(options, 'selectedCouponId')) {
    updateMallCheckoutDraft(draft.id, { selectedCouponId: confirmedCouponId });
  }

  const couponText = selectedCoupon
    ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
    : coupons.length > 0
      ? '请选择优惠券'
      : '';

  return {
    ...readonlyData,
    couponText,
    couponNoticeText: couponState.couponNoticeText,
    selectedCouponId: confirmedCouponId,
    coupons,
    products: buildCheckoutProducts(draft, confirmation),
    discountText: amounts.hasDiscountAmount && amounts.discountAmount > 0
      ? `已优惠 ${formatCurrency(amounts.discountAmount)}`
      : '',
    discountDetails: buildPromotionDiscountDetails(confirmation),
    productAmount: amounts.hasOriginalAmount ? amounts.originalAmount : undefined,
    freightAmount: amounts.hasFreightAmount ? amounts.freightAmount : deliveryCheck.freightAmount,
    totalAmount: amounts.payableAmount,
    amountReady: true,
    discountAmount: amounts.hasDiscountAmount ? amounts.discountAmount : 0,
  };
}

// 创建商城统一订单并申请真实预支付，页面只负责调起微信支付。
export async function submitOrderCheckoutOrder(data: OrderCheckoutData, remark?: string): Promise<MallCheckoutOrderResult | undefined> {
  const draft = getMallCheckoutDraft(data.draftId);
  if (!draft) return undefined;

  const request = buildMallCheckoutOrderRequest({
    draft,
    address: data.address,
    selectedCouponId: data.selectedCouponId,
    freightAmount: data.freightAmount,
    remark,
  });
  const requestFingerprint = createCheckoutRequestFingerprint(request);
  const submitOptions = {
    sceneLabel: '商城订单',
    onCheckoutCompleted: () => cleanupMallCheckoutAfterOrderCreated(draft),
  };

  if (canReuseCheckoutPendingOrder(draft.pendingOrder, requestFingerprint)) {
    return restoreCheckoutPendingResult(draft.pendingOrder!, submitOptions);
  }

  if (draft.pendingOrder) {
    updateMallCheckoutDraft(draft.id, { pendingOrder: undefined });
  }

  const result = await submitAndPayBffOrder(request, submitOptions);
  const pendingOrder = buildCheckoutPendingOrder(result, requestFingerprint);
  if (pendingOrder) {
    updateMallCheckoutDraft(draft.id, { pendingOrder });
  }

  return result;
}

// 支付预下单成功后回写同一商城草稿的待支付快照，便于失败后继续支付同一订单。
export function persistMallCheckoutPendingOrder(data: OrderCheckoutData, result: CheckoutSubmitResult, remark?: string) {
  const draft = getMallCheckoutDraft(data.draftId);
  if (!draft) return;

  const request = buildMallCheckoutOrderRequest({
    draft,
    address: data.address,
    selectedCouponId: data.selectedCouponId,
    freightAmount: data.freightAmount,
    remark,
  });
  const pendingOrder = buildCheckoutPendingOrder(result, createCheckoutRequestFingerprint(request));
  if (pendingOrder) {
    updateMallCheckoutDraft(draft.id, { pendingOrder });
  }
}
