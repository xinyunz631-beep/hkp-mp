import Taro from '@tarojs/taro';
import {
  addBffMallCartItem,
  deleteBffMallCartItem,
  fetchBffMallCart,
  fetchBffMallCartCount,
  updateBffMallCartItem,
  type BffMallCartData,
  type BffMallCartItem,
} from '@/core/services/bff-mall-api';
import type { MallShippingRule } from '@/core/services/mall-checkout-draft';
import type { HkpProductSummary } from '@/core/types/hkp';
import type { MallCartData, MallCartItem, MallCartMerchantGroup } from './mock-data';
import { toMallProductSummary } from './bff-adapter';

export const MALL_CART_COUNT_CHANGE_EVENT = 'hkp:mall-cart-count-change';
const HIDDEN_CART_TAG_KEYWORDS = ['本地', '可直接', '直接结算', '直接计算', 'mock', '测试', '开发'];

interface AddMallCartItemOptions {
  quantity?: number;
  skuId?: string;
  skuText?: string;
  merchantName?: string;
  giftText?: string;
  shippingRule?: MallShippingRule;
}

export interface MallCartCountData {
  totalQuantity: number;
}

function centToYuan(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Number((value / 100).toFixed(2));
}

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizePromotionTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    .filter((tag) => !HIDDEN_CART_TAG_KEYWORDS.some((keyword) => tag.toLowerCase().includes(keyword.toLowerCase())));
}

function normalizeShippingRule(rule?: BffMallCartItem['shippingRule']): MallShippingRule {
  const shippingMode = String(rule?.shippingMode || 'express');
  if (shippingMode === 'pickup') {
    return {
      mode: 'pickupOnly',
      reasonText: rule?.reasonText || '该商品仅支持乐园门店自提',
    };
  }
  if (shippingMode === 'none') {
    return {
      mode: 'unsupported',
      reasonText: rule?.reasonText || '该商品暂不支持配送',
    };
  }
  return {
    mode: 'express',
    freightAmount: centToYuan(rule?.freightAmount),
    supportedRegionKeywords: rule?.supportedRegionKeywords,
    unsupportedRegionKeywords: rule?.unsupportedRegionKeywords,
    reasonText: rule?.reasonText,
  };
}

function imageSrcOf(item: BffMallCartItem) {
  return normalizeString(item.image?.src) || normalizeString(item.image?.url);
}

function priceOf(item: BffMallCartItem) {
  if (typeof item.priceCent === 'number') return centToYuan(item.priceCent);
  return typeof item.price === 'number' ? item.price : 0;
}

function marketPriceOf(item: BffMallCartItem) {
  if (typeof item.marketPriceCent === 'number') return centToYuan(item.marketPriceCent);
  return typeof item.marketPrice === 'number' ? item.marketPrice : undefined;
}

function toMallCartItem(item: BffMallCartItem): MallCartItem {
  const productId = normalizeString(item.productId) || item.id;
  const skuId = normalizeString(item.skuId);
  return {
    id: item.id,
    productId,
    skuId,
    title: normalizeString(item.title) || '乐园商品',
    subtitle: normalizeString(item.subtitle),
    image: {
      src: imageSrcOf(item),
      alt: normalizeString(item.image?.alt),
    },
    price: priceOf(item),
    marketPrice: marketPriceOf(item),
    tag: normalizeString(item.tag),
    salesText: normalizeString(item.salesText),
    quantity: Math.max(1, Number(item.quantity) || 1),
    checked: item.checked !== false,
    skuText: normalizeString(item.skuText) || '默认规格',
    merchantName: normalizeString(item.merchantName) || 'Hello Kitty 官方商城',
    promotionTags: sanitizePromotionTags(item.promotionTags),
    giftText: normalizeString(item.giftText),
    canRefund: item.canRefund !== false,
    canAfterSale: item.canAfterSale !== false,
    shippingRule: normalizeShippingRule(item.shippingRule),
  };
}

function toMallCartData(data: BffMallCartData): MallCartData {
  const sourceGroups = data.groups && data.groups.length > 0
    ? data.groups
    : data.items && data.items.length > 0
      ? [{
        id: 'default',
        merchantName: 'Hello Kitty 官方商城',
        promotionTags: [],
        items: data.items,
      }]
      : [];
  const groups: MallCartMerchantGroup[] = sourceGroups
    .map((group) => ({
      id: group.id,
      merchantName: normalizeString(group.merchantName) || 'Hello Kitty 官方商城',
      promotionTags: sanitizePromotionTags(group.promotionTags),
      items: (group.items ?? []).map(toMallCartItem),
    }))
    .filter((group) => group.items.length > 0);
  const recommendProducts = (data.recommendProducts ?? []).map(toMallProductSummary);
  const totalAmountCent = typeof data.summary?.totalAmountCent === 'number' ? data.summary.totalAmountCent : data.totalAmountCent;
  const totalAmount = typeof totalAmountCent === 'number'
    ? centToYuan(totalAmountCent)
    : typeof data.totalAmount === 'number' ? data.totalAmount : 0;

  return {
    groups,
    recommendProducts,
    totalAmount,
  };
}

function countCartGroups(groups: MallCartMerchantGroup[]) {
  return groups.reduce((groupTotal, group) => (
    groupTotal + group.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0)
  ), 0);
}

function emitMallCartCountChange(data: MallCartData) {
  Taro.eventCenter.trigger(MALL_CART_COUNT_CHANGE_EVENT, {
    totalQuantity: countCartGroups(data.groups),
  } satisfies MallCartCountData);
}

// 获取当前登录用户真实购物车数据，不再注入本地默认商品或缓存草稿。
export async function fetchCartData() {
  const data = toMallCartData(await fetchBffMallCart());
  emitMallCartCountChange(data);
  return data;
}

// 获取当前登录用户真实购物车数量。
export async function fetchMallCartCount() {
  const data = await fetchBffMallCartCount();
  return {
    totalQuantity: Math.max(0, Number(data.totalQuantity) || 0),
  };
}

// 加入后端真实购物车，前端只提交商品、SKU、数量等业务字段。
export async function addMallCartItem(product: HkpProductSummary, options: AddMallCartItemOptions = {}) {
  const skuText = options.skuText || product.subtitle || '默认规格';
  const data = toMallCartData(await addBffMallCartItem({
    productId: product.id,
    spuId: product.id,
    skuId: options.skuId,
    skuText,
    quantity: options.quantity ?? 1,
    checked: true,
  }));
  emitMallCartCountChange(data);
  return data;
}

// 更新后端购物车项数量或勾选态，并返回最新购物车。
export async function updateMallCartItem(itemId: string, payload: { quantity?: number; checked?: boolean }) {
  const data = toMallCartData(await updateBffMallCartItem(itemId, payload));
  emitMallCartCountChange(data);
  return data;
}

// 删除后端购物车项，并返回最新购物车。
export async function deleteMallCartItem(itemId: string) {
  const data = toMallCartData(await deleteBffMallCartItem(itemId));
  emitMallCartCountChange(data);
  return data;
}

// 批量同步购物车勾选态，供全选交互使用。
export async function updateMallCartCheckedItems(items: MallCartItem[], checked: boolean) {
  await Promise.all(items.map((item) => updateBffMallCartItem(item.id, { checked })));
  const data = toMallCartData(await fetchBffMallCart());
  emitMallCartCountChange(data);
  return data;
}

// 批量删除后端购物车项，返回最新购物车。
export async function deleteMallCartItems(itemIds: string[]) {
  await Promise.all(itemIds.map((itemId) => deleteBffMallCartItem(itemId)));
  const data = toMallCartData(await fetchBffMallCart());
  emitMallCartCountChange(data);
  return data;
}
