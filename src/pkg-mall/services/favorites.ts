import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import type { HkpProductSummary } from '@/core/types/hkp';
import { getCache, setCache } from '@/core/utils/cache';

export type MallFavoriteItem = HkpProductSummary & {
  invalid?: boolean;
};

export interface MallFavoritesData {
  filters: string[];
  activeFilter: string;
  items: MallFavoriteItem[];
}

function normalizeFavoriteItems(data: unknown): MallFavoriteItem[] {
  if (!Array.isArray(data)) return [];
  return data.filter((item): item is MallFavoriteItem => Boolean(item?.id && item?.title));
}

function readLocalFavorites() {
  return normalizeFavoriteItems(getCache<unknown>(MINI_STORAGE_KEYS.mallFavorites));
}

function writeLocalFavorites(items: MallFavoriteItem[]) {
  setCache(MINI_STORAGE_KEYS.mallFavorites, items.slice(0, 50));
}

// 获取我的收藏页面数据。后端未提供收藏 BFF 前只展示本地收藏，不注入默认商品。
export function fetchFavoritesData() {
  const localFavorites = readLocalFavorites();

  return {
    filters: ['所有分类', '仅看有货'],
    activeFilter: '所有分类',
    items: localFavorites,
  };
}

export function addMallFavoriteItem(product: HkpProductSummary) {
  const currentFavorites = readLocalFavorites();
  const nextItem: MallFavoriteItem = {
    ...product,
    invalid: false,
  };
  const nextFavorites = [
    nextItem,
    ...currentFavorites.filter((item) => item.id !== product.id),
  ];

  writeLocalFavorites(nextFavorites);
  return nextItem;
}
