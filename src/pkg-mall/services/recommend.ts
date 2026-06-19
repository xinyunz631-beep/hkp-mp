import { fetchBffMallProducts } from '@/core/services/bff-mall-api';
import type { HkpFilterTab, HkpProductSummary } from '@/core/types/hkp';
import { toMallProductSummary } from './bff-adapter';

export type MallRecommendProduct = HkpProductSummary & {
  labels: string[];
};

export interface MallRecommendData {
  query: string;
  tabs: HkpFilterTab[];
  products: MallRecommendProduct[];
}

// 获取推荐商品真实数据。
export async function fetchRecommendData() {
  const response = await fetchBffMallProducts({ page: 1, size: 100, sort: 'recommend' });
  const query = (response.list ?? []).find((item) => item.title)?.title || '搜索商品';
  return {
    query,
    tabs: [
      { key: 'comprehensive', text: '综合' },
      { key: 'sales', text: '销量' },
      { key: 'price', text: '价格' },
      { key: 'filter', text: '筛选' },
    ],
    products: (response.list ?? []).map((product) => ({
      ...toMallProductSummary(product),
      labels: product.tags ?? [],
    })),
  };
}
