import { fetchBffCrmProfile } from '@/core/services/bff-crm-api';
import type { HkpProductSummary } from '@/core/types/hkp';

export const MALL_FAVORITES_UNAVAILABLE_MESSAGE = '当前暂不支持查看和管理收藏商品';

export type MallFavoriteItem = HkpProductSummary & {
  invalid?: boolean;
};

export interface MallFavoritesData {
  filters: string[];
  activeFilter: string;
  items: MallFavoriteItem[];
  totalCount?: number;
  unavailableReason?: string;
}

function normalizeOptionalCount(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

// 收藏列表当前只读取真实会员收藏数；收藏列表与增删接口待后端补齐后再开放。
export async function fetchFavoritesData(): Promise<MallFavoritesData> {
  const profile = await fetchBffCrmProfile();

  return {
    filters: [],
    activeFilter: '',
    items: [],
    totalCount: normalizeOptionalCount(profile.favoriteCount),
    unavailableReason: MALL_FAVORITES_UNAVAILABLE_MESSAGE,
  };
}

export function addMallFavoriteItem(_product: HkpProductSummary) {
  throw new Error(MALL_FAVORITES_UNAVAILABLE_MESSAGE);
}
