import {
  addBffMallFavorite,
  deleteBffMallFavorite,
  fetchBffMallFavorites,
  type BffMallFavoriteItem,
} from '@/core/services/bff-mall-api';
import type { HkpProductSummary } from '@/core/types/hkp';
import { parseNumberLike } from '@/core/utils/money';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';

export type MallFavoriteItem = HkpProductSummary & {
  invalid?: boolean;
};

export interface MallFavoritesData {
  filters: string[];
  activeFilter: string;
  items: MallFavoriteItem[];
  totalCount?: number;
}

function resolveFavoriteFilters(items: MallFavoriteItem[]) {
  return items.some((item) => item.invalid) ? ['全部', '仅看有货'] : [];
}

function normalizeText(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalCount(value?: number) {
  const normalizedValue = parseNumberLike(value);
  return typeof normalizedValue === 'number' && normalizedValue >= 0
    ? normalizedValue
    : undefined;
}

function toMallFavoriteItem(item: BffMallFavoriteItem): MallFavoriteItem {
  const title = sanitizeMallRuntimeText(item.title);
  return {
    id: normalizeText(item.id),
    title,
    subtitle: sanitizeMallRuntimeText(item.subtitle),
    image: {
      src: sanitizeMallRuntimeUrl(item.image?.src),
      alt: sanitizeMallRuntimeText(item.image?.alt) || title || '收藏商品',
    },
    price: parseNumberLike(item.price) ?? 0,
    marketPrice: parseNumberLike(item.marketPrice),
    tag: sanitizeMallRuntimeText(item.tag),
    salesText: sanitizeMallRuntimeText(item.salesText),
    invalid: item.invalid,
  };
}

export async function fetchFavoritesData(): Promise<MallFavoritesData> {
  const data = await fetchBffMallFavorites();
  const items = (data.items ?? [])
    .map(toMallFavoriteItem)
    .filter((item) => item.id);
  const filters = resolveFavoriteFilters(items);

  return {
    filters,
    activeFilter: filters[0] || '',
    items,
    totalCount: normalizeOptionalCount(data.totalCount) ?? items.length,
  };
}

export async function addMallFavoriteItem(product: HkpProductSummary) {
  const result = await addBffMallFavorite({ productId: product.id });
  return result.favorited !== false;
}

export async function removeMallFavoriteItem(productId: string) {
  const result = await deleteBffMallFavorite(productId);
  return result.favorited === true;
}
