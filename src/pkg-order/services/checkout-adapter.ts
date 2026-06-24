import type { BffOrderUnifiedRequest } from '@/core/services/bff-order-api';
import { buildSelectedCouponNos } from '@/core/services/checkout-flow';
import {
  getMallCheckoutSelectedAddressId,
  setMallCheckoutSelectedAddressId,
  type MallCheckoutDraft,
} from '@/core/services/mall-checkout-draft';
import { parseNumberLike } from '@/core/utils/money';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import { fetchAddressData, formatOrderAddress } from './address';

export interface FetchMallCheckoutContextOptions {
  draftId?: string;
  addressId?: string;
}

export interface MallCheckoutRequestContext {
  draft: MallCheckoutDraft;
  address?: Awaited<ReturnType<typeof resolveMallCheckoutAddress>>;
  selectedCouponId?: string | null;
  freightAmount?: number;
  remark?: string;
}

// 解析商城确认单地址，实物订单优先使用路由地址，其次使用草稿缓存和默认地址。
export async function resolveMallCheckoutAddress(options: FetchMallCheckoutContextOptions, required: boolean) {
  if (!required) return undefined;
  const selectedAddressId = options.addressId ?? getMallCheckoutSelectedAddressId(options.draftId);
  const { addresses } = await fetchAddressData();
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const defaultAddress = addresses.find((address) => address.isDefault) ?? addresses[0];
  return selectedAddress ?? defaultAddress;
}

// 缓存商城确认单本次选中的地址，便于从地址页返回后恢复。
export function persistMallCheckoutAddress(draftId: string, address?: Awaited<ReturnType<typeof resolveMallCheckoutAddress>>) {
  if (address?.id) setMallCheckoutSelectedAddressId(draftId, address.id);
}

// 将商城草稿内的元单位运费转成统一订单接口需要的分单位。
function toAmountCent(amount: unknown) {
  const normalizedAmount = parseNumberLike(amount);
  return typeof normalizedAmount === 'number' && normalizedAmount > 0
    ? Math.round(normalizedAmount * 100)
    : 0;
}

// 生成商城统一订单请求，前端提交商品、地址、券号和配送模板运费，商品金额由 BFF 统一计算。
export function buildMallCheckoutOrderRequest({
  draft,
  address,
  selectedCouponId,
  freightAmount,
  remark,
}: MallCheckoutRequestContext): BffOrderUnifiedRequest {
  return {
    sceneType: 'MALL',
    channel: 'MINI_PROGRAM',
    paymentChannel: 'WECHAT',
    freightAmountCent: toAmountCent(freightAmount),
    selectedCouponNos: buildSelectedCouponNos(selectedCouponId),
    contactName: address?.name,
    contactPhone: address?.mobile,
    context: address
      ? {
        addressId: address.id,
        addressText: formatOrderAddress(address),
      }
      : undefined,
    remark,
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
