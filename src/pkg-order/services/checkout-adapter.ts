import type { BffOrderUnifiedRequest } from '@/core/services/bff-order-api';
import { buildSelectedCouponNos } from '@/core/services/checkout-flow';
import {
  getMallCheckoutSelectedAddressId,
  setMallCheckoutSelectedAddressId,
  type MallCheckoutDraft,
} from '@/core/services/mall-checkout-draft';
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

// 生成商城统一订单请求，前端只提交商品、地址和券号；金额、运费由 BFF 统一计算。
export function buildMallCheckoutOrderRequest({
  draft,
  address,
  selectedCouponId,
}: MallCheckoutRequestContext): BffOrderUnifiedRequest {
  return {
    sceneType: 'MALL',
    channel: 'MINI_PROGRAM',
    paymentChannel: 'WECHAT',
    selectedCouponNos: buildSelectedCouponNos(selectedCouponId),
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
