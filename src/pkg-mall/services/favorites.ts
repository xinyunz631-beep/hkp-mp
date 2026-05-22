import { resolveMockData } from '@/core/services/mock';
import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import type { HkpProductSummary } from '@/core/types/hkp';
import { getCache, setCache } from '@/core/utils/cache';
import { mallProducts } from './mock-data';

export type MallFavoriteItem = (typeof mallProducts)[number] & {
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

// 获取我的收藏页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchFavoritesData() {
  const localFavorites = readLocalFavorites();

  return resolveMockData<MallFavoritesData>({
    filters: ['所有分类', '仅看有货'],
    activeFilter: '所有分类',
    items: [
      ...localFavorites,
      {
        ...mallProducts[0],
        price: 189.9,
      },
      {
        ...mallProducts[2],
        invalid: true,
      },
      {
        ...mallProducts[0],
        id: 'favorite-third',
        price: 189.9,
      },
    ],
  });
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
