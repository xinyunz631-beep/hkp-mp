import {
  addBffMallFavorite,
  deleteBffMallFavorite,
  fetchBffMallFavorites,
  type BffMallFavoriteItem,
} from '@/core/services/bff-mall-api';
import type { HkpProductSummary } from '@/core/types/hkp';

export type MallFavoriteItem = HkpProductSummary & {
  invalid?: boolean;
};

export interface MallFavoritesData {
  filters: string[];
  activeFilter: string;
  items: MallFavoriteItem[];
  totalCount?: number;
}

function normalizeOptionalCount(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function toMallFavoriteItem(item: BffMallFavoriteItem): MallFavoriteItem {
  return {
    id: item.id || '',
    title: item.title || item.id || '商品',
    subtitle: item.subtitle || '',
    image: {
      src: item.image?.src || '',
      alt: item.image?.alt || item.title || item.id || '商品',
    },
    price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : 0,
    marketPrice: typeof item.marketPrice === 'number' && Number.isFinite(item.marketPrice) ? item.marketPrice : undefined,
    tag: item.tag || '',
    salesText: item.salesText || '',
    invalid: item.invalid,
  };
}

export async function fetchFavoritesData(): Promise<MallFavoritesData> {
  const data = await fetchBffMallFavorites();
  const items = (data.items ?? [])
    .map(toMallFavoriteItem)
    .filter((item) => item.id);

  return {
    filters: items.some((item) => item.invalid) ? ['全部', '仅看有货'] : [],
    activeFilter: '',
    items,
    totalCount: normalizeOptionalCount(data.totalCount) ?? items.length,
  };
}

export async function addMallFavoriteItem(product: HkpProductSummary) {
  await addBffMallFavorite({ productId: product.id });
}

export async function removeMallFavoriteItem(productId: string) {
  await deleteBffMallFavorite(productId);
}
