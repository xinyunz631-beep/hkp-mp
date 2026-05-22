import Taro from '@tarojs/taro';
import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import { resolveMockData } from '@/core/services/mock';
import type { MallShippingRule } from '@/core/services/mall-checkout-draft';
import type { HkpProductSummary } from '@/core/types/hkp';
import { getCache, setCache } from '@/core/utils/cache';
import { mallCartData, type MallCartData, type MallCartItem, type MallCartMerchantGroup } from './mock-data';

const MALL_CART_STORAGE_KEY = 'hkp_mall_cart_items';
export const MALL_CART_COUNT_CHANGE_EVENT = 'hkp:mall-cart-count-change';
const HIDDEN_CART_TAG_KEYWORDS = ['本地', '可直接', '直接结算', '直接计算', 'mock', '测试', '开发'];

interface AddMallCartItemOptions {
  quantity?: number;
  skuText?: string;
  merchantName?: string;
  giftText?: string;
  shippingRule?: MallShippingRule;
}

export interface MallCartCountData {
  totalQuantity: number;
}

function normalizeStorageItems(data: unknown): MallCartItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .filter((item): item is MallCartItem => Boolean(item?.id && item?.title))
    .map((item) => ({
      ...item,
      promotionTags: sanitizePromotionTags(item.promotionTags),
    }));
}

function sanitizePromotionTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    .filter((tag) => !HIDDEN_CART_TAG_KEYWORDS.some((keyword) => tag.toLowerCase().includes(keyword.toLowerCase())));
}

// 归一化购物车分组快照，兼容历史缓存和异常结构。
function normalizeStorageGroups(data: unknown): MallCartMerchantGroup[] | undefined {
  if (!Array.isArray(data)) return undefined;

  return data
    .filter((group): group is MallCartMerchantGroup => Boolean(group?.id && group?.merchantName && Array.isArray(group?.items)))
    .map((group) => ({
      ...group,
      promotionTags: sanitizePromotionTags(group.promotionTags),
      items: normalizeStorageItems(group.items),
    }))
    .filter((group) => group.items.length > 0);
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

// 读取用户编辑后的购物车快照；undefined 表示还没有快照，空数组表示用户已删空。
function readCartGroupsSnapshot() {
  return normalizeStorageGroups(getCache<unknown>(MINI_STORAGE_KEYS.mallCartGroups));
}

// 保存当前购物车分组快照，避免静态默认商品在下次进入时重新出现。
function writeCartGroupsSnapshot(groups: MallCartMerchantGroup[]) {
  setCache(MINI_STORAGE_KEYS.mallCartGroups, groups.filter((group) => group.items.length > 0));
}

function countCartGroups(groups: MallCartMerchantGroup[]) {
  return groups.reduce((groupTotal, group) => (
    groupTotal + group.items.reduce((itemTotal, item) => itemTotal + item.quantity, 0)
  ), 0);
}

async function resolveMallCartGroups(baseData?: MallCartData) {
  const resolvedBaseData = baseData ?? await resolveMockData(mallCartData);
  const snapshotGroups = readCartGroupsSnapshot();
  if (snapshotGroups) return snapshotGroups;

  const localItems = await readLocalCartItems();
  if (localItems.length === 0) return resolvedBaseData.groups;

  return [
    {
      id: 'local-cart',
      merchantName: 'Hello Kitty 官方商城',
      promotionTags: [],
      items: localItems,
    },
    ...resolvedBaseData.groups,
  ];
}

async function emitMallCartCountChange() {
  const nextData = await fetchMallCartCount();
  Taro.eventCenter.trigger(MALL_CART_COUNT_CHANGE_EVENT, nextData);
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
    promotionTags: [],
    giftText: options.giftText,
    canRefund: true,
    canAfterSale: true,
    shippingRule: options.shippingRule ?? { mode: 'express', freightAmount: 0, supportedRegionKeywords: ['上海', '浙江', '江苏'] },
  };
}

// 将商品详情新加购的商品合并进当前购物车快照，已有同规格则累加数量。
function mergeItemIntoGroups(groups: MallCartMerchantGroup[], nextItem: MallCartItem) {
  let merged = false;
  const nextGroups = groups.map((group) => {
    if (group.id !== 'local-cart' && group.merchantName !== nextItem.merchantName) return group;

    const existed = group.items.some((item) => item.id === nextItem.id);
    if (existed) {
      merged = true;
      return {
        ...group,
        items: group.items.map((item) => (
          item.id === nextItem.id
            ? { ...item, quantity: item.quantity + nextItem.quantity, checked: true }
            : item
        )),
      };
    }

    if (group.id === 'local-cart') {
      merged = true;
      return {
        ...group,
        items: [nextItem, ...group.items],
      };
    }

    return group;
  });

  if (merged) return nextGroups;

  return [
    {
      id: 'local-cart',
      merchantName: nextItem.merchantName,
      promotionTags: [],
      items: [nextItem],
    },
    ...groups,
  ];
}

// 获取购物车页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export async function fetchCartData() {
  const baseData = await resolveMockData(mallCartData);
  const groups = await resolveMallCartGroups(baseData);
  return {
    ...baseData,
    groups,
    totalAmount: groups.reduce((total, group) => (
      total + group.items.reduce((itemTotal, item) => itemTotal + item.price * item.quantity, 0)
    ), 0),
  };
}

// 独立模拟购物车数量接口，商城各入口只依赖这里，后续替换真实接口时不需要改页面。
export async function fetchMallCartCount() {
  const groups = await resolveMallCartGroups();
  return resolveMockData<MallCartCountData>({
    totalQuantity: countCartGroups(groups),
  });
}

// 写入购物车，先形成完整体验，后续替换真实购物车接口时页面无需改动。
export async function addMallCartItem(product: HkpProductSummary, options: AddMallCartItemOptions = {}) {
  const nextItem = createCartItem(product, options);
  const snapshotGroups = readCartGroupsSnapshot();

  if (snapshotGroups) {
    writeCartGroupsSnapshot(mergeItemIntoGroups(snapshotGroups, nextItem));
    void emitMallCartCountChange();
    return nextItem;
  }

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
  void emitMallCartCountChange();
  return nextItem;
}

// 保存购物车页面编辑后的完整分组状态，供下次进入页面恢复。
export function replaceMallCartGroups(groups: MallCartMerchantGroup[]) {
  writeCartGroupsSnapshot(groups);
  void emitMallCartCountChange();
}
