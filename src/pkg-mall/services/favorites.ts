import { resolveMockData } from '@/core/services/mock';
import { mallProducts } from './mock-data';

export type MallFavoriteItem = (typeof mallProducts)[number] & {
  invalid?: boolean;
};

export interface MallFavoritesData {
  filters: string[];
  activeFilter: string;
  items: MallFavoriteItem[];
}

// 获取我的收藏页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchFavoritesData() {
  return resolveMockData<MallFavoritesData>({
    filters: ['所有分类', '仅看有货'],
    activeFilter: '所有分类',
    items: [
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
