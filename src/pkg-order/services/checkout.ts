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
  setMallCheckoutSelectedAddressId,
  validateMallCheckoutDelivery,
  type MallCheckoutDraft,
} from '@/core/services/mall-checkout-draft';
import { formatCurrency } from '@/core/utils/money';
import type { OrderCheckoutData } from './mock-data';
import { fetchAddressData, formatOrderAddress } from './address';

export type { OrderCheckoutData } from './mock-data';

interface FetchCheckoutDataOptions {
  draftId?: string;
  addressId?: string;
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

function resolvePayableAmountCent(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('商城确认单金额暂不可用，请稍后再试');
  }

  return value;
}

async function resolveCheckoutAddress(options: FetchCheckoutDataOptions) {
  const selectedAddressId = options.addressId ?? getMallCheckoutSelectedAddressId(options.draftId);
  const { addresses } = await fetchAddressData();
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  const address = selectedAddress ?? defaultAddress;
  if (!address) throw new Error('请先维护收货地址');
  return address;
}

function buildMallUnifiedOrderRequest(
  draft: MallCheckoutDraft,
  address: Awaited<ReturnType<typeof resolveCheckoutAddress>>,
): BffOrderUnifiedRequest {
  return {
    sceneType: 'MALL',
    channel: 'MINI_PROGRAM',
    paymentChannel: 'WECHAT',
    freightAmountCent: yuanToCent(validateMallCheckoutDelivery(draft, address).freightAmount),
    contactName: address.name,
    contactPhone: address.mobile,
    context: {
      addressId: address.id,
      addressText: formatOrderAddress(address),
    },
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
        skuName: item.specText,
        specName: item.specText,
        imageUrl: item.imageSrc,
        giftText: item.giftText || '',
      },
    })),
  };
}

function couponDiscountCent(coupon: BffAvailableCouponView) {
  return typeof coupon.discountAmount === 'number' ? coupon.discountAmount : coupon.discountAmountCent ?? 0;
}

function resolveCouponText(coupons: BffAvailableCouponView[], discountAmountCent = 0) {
  if (discountAmountCent <= 0) return '';
  const bestCoupon = [...coupons]
    .filter((coupon) => coupon.available !== false && coupon.status === 'AVAILABLE')
    .sort((prev, next) => couponDiscountCent(next) - couponDiscountCent(prev))[0];

  if (bestCoupon) return bestCoupon.couponName || '优惠券已自动匹配';
  return '优惠券已自动匹配';
}

function buildReadonlyCheckoutData(
  draft: MallCheckoutDraft,
  address: Awaited<ReturnType<typeof resolveCheckoutAddress>>,
  deliveryCheck: ReturnType<typeof validateMallCheckoutDelivery>,
  productsAmount: number,
): OrderCheckoutData {
  return {
    draftId: draft.id,
    address,
    paymentMethodText: '微信支付',
    products: draft.products.map((item) => ({
      id: item.id,
      title: item.title,
      specText: item.specText,
      quantity: item.quantity,
      priceText: formatCurrency(item.unitPrice),
      imageSrc: item.imageSrc,
      giftText: item.giftText,
      canRefund: item.canRefund,
      canAfterSale: item.canAfterSale,
    })),
    shippingText: deliveryCheck.shippingText,
    canSubmit: deliveryCheck.canSubmit,
    deliveryErrors: deliveryCheck.errors,
    couponText: '',
    discountText: '',
    amountFields: [
      { label: '商品金额', value: formatCurrency(productsAmount) },
      { label: '运费', value: deliveryCheck.freightAmount > 0 ? formatCurrency(deliveryCheck.freightAmount) : '¥0.00' },
    ],
    totalAmount: Number((productsAmount + deliveryCheck.freightAmount).toFixed(2)),
    discountAmount: 0,
  };
}

// 获取商城确认单真实数据，金额和优惠以统一订单确认接口为准。
export async function fetchCheckoutData(options: FetchCheckoutDataOptions = {}) {
  const draft = getMallCheckoutDraft(options.draftId);
  if (!draft) throw new Error('订单信息已失效，请重新选择商品');

  const address = await resolveCheckoutAddress(options);
  if (options.addressId) {
    setMallCheckoutSelectedAddressId(draft.id, options.addressId);
  }

  const deliveryCheck = validateMallCheckoutDelivery(draft, address);
  const productsAmount = draft.products.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const readonlyData = buildReadonlyCheckoutData(draft, address, deliveryCheck, productsAmount);
  if (!deliveryCheck.canSubmit) return readonlyData;

  const [confirmation, availableCouponsResponse] = await Promise.all([
    confirmBffOrder(buildMallUnifiedOrderRequest(draft, address)),
    fetchBffCouponAvailable({
      sceneType: 'MALL',
      orderAmountCent: yuanToCent(productsAmount + deliveryCheck.freightAmount),
      itemIds: draft.products.map((item) => item.productId),
      skuIds: draft.products.map((item) => item.id),
    }),
  ]);
  const totalAmount = centToYuan(resolvePayableAmountCent(confirmation.payableAmountCent));
  const discountAmount = centToYuan(confirmation.discountAmountCent);
  const couponText = resolveCouponText(availableCouponsResponse.coupons ?? [], confirmation.discountAmountCent);

  return {
    ...readonlyData,
    couponText,
    discountText: discountAmount > 0 ? `已优惠 ${formatCurrency(discountAmount)}` : '',
    amountFields: [
      { label: '商品金额', value: formatCurrency(centToYuan(confirmation.originalAmountCent)) },
      { label: '运费', value: (confirmation.freightAmountCent ?? 0) > 0 ? formatCurrency(centToYuan(confirmation.freightAmountCent)) : '¥0.00' },
    ],
    totalAmount,
    discountAmount,
  };
}

// 创建商城统一订单并发起真实预支付。
export async function submitOrderCheckoutOrder(data: OrderCheckoutData): Promise<MallCheckoutOrderResult | undefined> {
  const draft = getMallCheckoutDraft(data.draftId);
  if (!draft) return undefined;

  const createResult = await createBffOrder(buildMallUnifiedOrderRequest(draft, data.address));
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
