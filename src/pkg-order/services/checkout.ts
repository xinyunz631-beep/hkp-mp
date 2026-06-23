import { confirmBffOrder } from '@/core/services/bff-order-api';
import { fetchBffCouponAvailable } from '@/core/services/bff-coupon-api';
import {
  normalizeCheckoutAmounts,
  resolveCheckoutCouponState,
  submitAndPayBffOrder,
  toCheckoutCouponSummary,
  type CheckoutSubmitResult,
} from '@/core/services/checkout-flow';
import {
  getMallCheckoutDraft,
  isMallCheckoutAddressRequired,
  updateMallCheckoutDraft,
  validateMallCheckoutDelivery,
  type MallCheckoutDraft,
} from '@/core/services/mall-checkout-draft';
import { formatCurrency } from '@/core/utils/money';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import type { OrderCheckoutData } from './model';
import {
  buildMallCheckoutOrderRequest,
  persistMallCheckoutAddress,
  resolveMallCheckoutAddress,
} from './checkout-adapter';

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

function buildDeliveryAmountField(requiresAddress: boolean, freightAmount?: number) {
  if (!requiresAddress) {
    return { label: '交付', value: '无需物流' };
  }

  if (typeof freightAmount !== 'number') return undefined;

  return {
    label: '运费',
    value: freightAmount > 0 ? formatCurrency(freightAmount) : '¥0.00',
  };
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
    products: draft.products.map((item) => ({
      id: item.id,
      title: item.title,
      specText: sanitizeMallRuntimeText(item.specText),
      quantity: item.quantity,
      priceText: formatCurrency(item.unitPrice),
      imageSrc: sanitizeMallRuntimeUrl(item.imageSrc),
      giftText: sanitizeMallRuntimeText(item.giftText) || undefined,
      canRefund: item.canRefund,
      canAfterSale: item.canAfterSale,
    })),
    shippingText: deliveryCheck.shippingText,
    canSubmit: deliveryCheck.canSubmit,
    deliveryErrors: deliveryCheck.errors,
    couponText: '',
    couponNoticeText: '',
    selectedCouponId: undefined,
    coupons: [],
    discountText: '',
    amountFields: [],
    totalAmount: 0,
    amountReady: false,
    discountAmount: 0,
  };
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
  const coupons = (availableCouponsResponse.coupons ?? [])
    .map((coupon) => toCheckoutCouponSummary(coupon, '商城优惠券'));
  const selectedCoupon = coupons.find((coupon) => coupon.id === couponState.selectedCouponId);
  const confirmedCouponId = selectedCoupon?.id || couponState.selectedCouponId;

  if (Object.prototype.hasOwnProperty.call(options, 'selectedCouponId')) {
    updateMallCheckoutDraft(draft.id, { selectedCouponId: confirmedCouponId });
  }

  const couponText = selectedCoupon
    ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
    : coupons.length > 0
      ? '请选择优惠券'
      : '';

  const amountFields = [
    amounts.hasOriginalAmount
      ? { label: '商品金额', value: formatCurrency(amounts.originalAmount) }
      : undefined,
    buildDeliveryAmountField(requiresAddress, amounts.hasFreightAmount ? amounts.freightAmount : undefined),
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return {
    ...readonlyData,
    couponText,
    couponNoticeText: couponState.couponNoticeText,
    selectedCouponId: confirmedCouponId,
    coupons,
    discountText: amounts.hasDiscountAmount && amounts.discountAmount > 0
      ? `已优惠 ${formatCurrency(amounts.discountAmount)}`
      : '',
    amountFields,
    totalAmount: amounts.payableAmount,
    amountReady: true,
    discountAmount: amounts.hasDiscountAmount ? amounts.discountAmount : 0,
  };
}

// 创建商城统一订单并申请真实预支付，页面只负责调起微信支付。
export async function submitOrderCheckoutOrder(data: OrderCheckoutData): Promise<MallCheckoutOrderResult | undefined> {
  const draft = getMallCheckoutDraft(data.draftId);
  if (!draft) return undefined;

  return submitAndPayBffOrder(buildMallCheckoutOrderRequest({
    draft,
    address: data.address,
    selectedCouponId: data.selectedCouponId,
  }), {
    sceneLabel: '商城订单',
  });
}
