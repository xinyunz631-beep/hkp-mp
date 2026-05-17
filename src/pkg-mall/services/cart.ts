import Taro from '@tarojs/taro';
import { resolveMockData } from '@/core/services/mock';
import type { HkpProductSummary } from '@/core/types/hkp';
import { mallCartData, type MallCartItem } from './mock-data';

const MALL_CART_STORAGE_KEY = 'hkp_mall_cart_items';

interface AddMallCartItemOptions {
  quantity?: number;
  skuText?: string;
  merchantName?: string;
  giftText?: string;
}

function normalizeStorageItems(data: unknown): MallCartItem[] {
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is MallCartItem => Boolean(item?.id && item?.title));
}

async function readLocalCartItems() {
  try {
    const result = await Taro.getStorage<MallCartItem[]>({ key: MALL_CART_STORAGE_KEY });
    return normalizeStorageItems(result.data);
  } catch {
    return [];
  }
}

async function writeLocalCartItems(items: MallCartItem[]) {
  await Taro.setStorage({
    key: MALL_CART_STORAGE_KEY,
    data: items,
  });
}

function createCartItem(product: HkpProductSummary, options: AddMallCartItemOptions): MallCartItem {
  const skuText = options.skuText || product.subtitle || '默认规格';
  const storageId = `${product.id}:${skuText}`;

  return {
    ...product,
    id: storageId,
    checked: true,
    quantity: options.quantity ?? 1,
    skuText,
    merchantName: options.merchantName || 'Hello Kitty 官方商城',
    promotionTags: ['本地购物车'],
    giftText: options.giftText,
  };
}

// 获取购物车页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export async function fetchCartData() {
  const baseData = await resolveMockData(mallCartData);
  const localItems = await readLocalCartItems();

  if (localItems.length === 0) return baseData;

  return {
    ...baseData,
    groups: [
      {
        id: 'local-cart',
        merchantName: 'Hello Kitty 官方商城',
        promotionTags: ['本地加入', '可直接结算'],
        items: localItems,
      },
      ...baseData.groups,
    ],
  };
}

// 写入本地购物车，先形成完整体验，后续替换真实购物车接口时页面无需改动。
export async function addMallCartItem(product: HkpProductSummary, options: AddMallCartItemOptions = {}) {
  const nextItem = createCartItem(product, options);
  const currentItems = await readLocalCartItems();
  const existed = currentItems.find((item) => item.id === nextItem.id);
  const nextItems = existed
    ? currentItems.map((item) => (
      item.id === nextItem.id
        ? { ...item, quantity: item.quantity + nextItem.quantity, checked: true }
        : item
    ))
    : [nextItem, ...currentItems];

  await writeLocalCartItems(nextItems);
  return nextItem;
}
