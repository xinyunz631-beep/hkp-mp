import {
  confirmBffOrder,
  createBffOrder,
  payBffOrder,
  type BffOrderPaymentResponse,
  type BffOrderUnifiedRequest,
} from '@/core/services/bff-order-api';
import { fetchBffCouponAvailable, type BffAvailableCouponView } from '@/core/services/bff-coupon-api';
import {
  getMallCheckoutDraft,
  getMallCheckoutSelectedAddressId,
  isMallCheckoutAddressRequired,
  setMallCheckoutSelectedAddressId,
  validateMallCheckoutDelivery,
  type MallCheckoutDraft,
} from '@/core/services/mall-checkout-draft';
import { formatCurrency } from '@/core/utils/money';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import type { OrderCheckoutData } from './model';
import { fetchAddressData, formatOrderAddress } from './address';

export type { OrderCheckoutData } from './model';

interface FetchCheckoutDataOptions {
  draftId?: string;
  addressId?: string;
  selectedCouponId?: string;
}

export interface MallCheckoutOrderResult {
  orderNo: string;
  payableAmount: number;
  payment?: BffOrderPaymentResponse;
}

function yuanToCent(value: number) {
  return Math.round(value * 100);
}

function centToYuan(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Number((value / 100).toFixed(2));
}

function formatYuan(amountCent = 0) {
  const amount = amountCent / 100;
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number) {
  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent) || discountPercent <= 0) return '';
  const discount = discountPercent > 10 ? discountPercent / 10 : discountPercent;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

function resolvePayableAmountCent(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('商城确认单金额暂不可用，请稍后再试');
  }

  return value;
}

async function resolveCheckoutAddress(options: FetchCheckoutDataOptions, required: boolean) {
  if (!required) return undefined;
  const selectedAddressId = options.addressId ?? getMallCheckoutSelectedAddressId(options.draftId);
  const { addresses } = await fetchAddressData();
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  return selectedAddress ?? defaultAddress;
}

function buildMallUnifiedOrderRequest(
  draft: MallCheckoutDraft,
  address: Awaited<ReturnType<typeof resolveCheckoutAddress>>,
  selectedCouponId?: string,
): BffOrderUnifiedRequest {
  return {
    sceneType: 'MALL',
    channel: 'MINI_PROGRAM',
    paymentChannel: 'WECHAT',
    freightAmountCent: yuanToCent(validateMallCheckoutDelivery(draft, address).freightAmount),
    selectedCouponNos: selectedCouponId ? [selectedCouponId] : undefined,
    contactName: address?.name,
    contactPhone: address?.mobile,
    context: address
      ? {
        addressId: address.id,
        addressText: formatOrderAddress(address),
      }
      : undefined,
    items: draft.products.map((item, index) => ({
      lineNo: String(index + 1),
      itemId: item.productId,
      skuId: item.id,
      itemType: 'SKU',
      quantity: item.quantity,
      attributes: {
        productId: item.productId,
        spuId: item.productId,
        skuId: item.id,
        merchantName: sanitizeMallRuntimeText(item.merchantName),
        skuName: sanitizeMallRuntimeText(item.specText),
        specName: sanitizeMallRuntimeText(item.specText),
        imageUrl: sanitizeMallRuntimeUrl(item.imageSrc),
        giftText: sanitizeMallRuntimeText(item.giftText) || '',
      },
    })),
  };
}

function couponDiscountCent(coupon: BffAvailableCouponView) {
  return typeof coupon.discountAmount === 'number' ? coupon.discountAmount : coupon.discountAmountCent ?? 0;
}

function toMallCoupon(coupon: BffAvailableCouponView) {
  const thresholdAmount = centToYuan(coupon.thresholdAmountCent);
  const discountAmountCent = couponDiscountCent(coupon);
  const discountAmount = centToYuan(discountAmountCent);
  const validDate = coupon.validEndAt ? coupon.validEndAt.slice(0, 10) : '';
  const available = coupon.available !== false && coupon.status === 'AVAILABLE';

  return {
    id: coupon.couponNo,
    title: coupon.couponName || coupon.couponNo || '优惠券',
    amountText: discountAmount > 0 ? `¥${formatYuan(discountAmountCent)}` : (formatDiscountPercent(coupon.discountPercent) || '优惠券'),
    thresholdText: thresholdAmount > 0 ? `满¥${thresholdAmount.toFixed(2)}可用` : '无门槛',
    validityText: validDate ? `有效期至 ${validDate}` : '按券规则生效',
    status: available ? 'available' as const : 'disabled' as const,
    tag: available ? (coupon.reason || '可用') : (coupon.unavailableReason || coupon.reason || '暂不可用'),
  };
}

function buildDeliveryAmountField(requiresAddress: boolean, freightAmount = 0) {
  if (!requiresAddress) {
    return { label: '交付', value: '无需物流' };
  }

  return {
    label: '运费',
    value: freightAmount > 0 ? formatCurrency(freightAmount) : '¥0.00',
  };
}

function buildReadonlyCheckoutData(
  draft: MallCheckoutDraft,
  address: Awaited<ReturnType<typeof resolveCheckoutAddress>>,
  deliveryCheck: ReturnType<typeof validateMallCheckoutDelivery>,
  productsAmount: number,
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
    selectedCouponId: undefined,
    coupons: [],
    discountText: '',
    amountFields: [
      { label: '商品金额', value: formatCurrency(productsAmount) },
      buildDeliveryAmountField(requiresAddress, deliveryCheck.freightAmount),
    ],
    totalAmount: Number((productsAmount + deliveryCheck.freightAmount).toFixed(2)),
    discountAmount: 0,
  };
}

// 获取商城确认单真实数据，金额和优惠以统一订单确认接口为准。
export async function fetchCheckoutData(options: FetchCheckoutDataOptions = {}) {
  const draft = getMallCheckoutDraft(options.draftId);
  if (!draft) throw new Error('订单信息已失效，请重新选择商品');

  const requiresAddress = isMallCheckoutAddressRequired(draft);
  const address = await resolveCheckoutAddress(options, requiresAddress);
  if (requiresAddress && address?.id) {
    setMallCheckoutSelectedAddressId(draft.id, address.id);
  }

  const deliveryCheck = validateMallCheckoutDelivery(draft, address);
  const productsAmount = draft.products.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const readonlyData = buildReadonlyCheckoutData(draft, address, deliveryCheck, productsAmount, requiresAddress);
  if (!deliveryCheck.canSubmit) return readonlyData;

  const [confirmation, availableCouponsResponse] = await Promise.all([
    confirmBffOrder(buildMallUnifiedOrderRequest(draft, address, options.selectedCouponId)),
    fetchBffCouponAvailable({
      sceneType: 'MALL',
      orderAmountCent: yuanToCent(productsAmount + deliveryCheck.freightAmount),
      itemIds: draft.products.map((item) => item.productId),
      skuIds: draft.products.map((item) => item.id),
    }),
  ]);
  const totalAmount = centToYuan(resolvePayableAmountCent(confirmation.payableAmountCent));
  const discountAmount = centToYuan(confirmation.discountAmountCent);
  const coupons = (availableCouponsResponse.coupons ?? []).map(toMallCoupon);
  const selectedCoupon = coupons.find((coupon) => coupon.id === options.selectedCouponId);
  const couponText = selectedCoupon
    ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}`
    : coupons.length > 0
      ? '请选择优惠券'
      : '';

  return {
    ...readonlyData,
    couponText,
    selectedCouponId: selectedCoupon?.id,
    coupons,
    discountText: discountAmount > 0 ? `已优惠 ${formatCurrency(discountAmount)}` : '',
    amountFields: [
      { label: '商品金额', value: formatCurrency(centToYuan(confirmation.originalAmountCent)) },
      buildDeliveryAmountField(requiresAddress, centToYuan(confirmation.freightAmountCent)),
    ],
    totalAmount,
    discountAmount,
  };
}

// 创建商城统一订单并发起真实预支付。
export async function submitOrderCheckoutOrder(data: OrderCheckoutData): Promise<MallCheckoutOrderResult | undefined> {
  const draft = getMallCheckoutDraft(data.draftId);
  if (!draft) return undefined;

  const createResult = await createBffOrder(buildMallUnifiedOrderRequest(draft, data.address, data.selectedCouponId));
  const orderNo = createResult.order?.orderNo;
  if (!orderNo) {
    throw new Error('订单创建失败：缺少订单编号');
  }

  const createPayableAmountCent = resolvePayableAmountCent(createResult.order?.payableAmountCent);
  if (createPayableAmountCent === 0) {
    return {
      orderNo,
      payableAmount: 0,
    };
  }

  const payment = await payBffOrder(orderNo, 'WECHAT');
  const payableAmountCent = payment.order?.payableAmountCent ?? createPayableAmountCent;
  const payableAmount = centToYuan(resolvePayableAmountCent(payableAmountCent));

  return {
    orderNo,
    payableAmount,
    payment,
  };
}
