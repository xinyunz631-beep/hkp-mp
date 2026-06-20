import { fetchAllBffMallProducts, fetchAllBffMallRecommendations } from '@/core/services/bff-mall-api';
import type { HkpFilterTab, HkpProductSummary } from '@/core/types/hkp';
import { isRenderableMallProduct, isRenderableMallRecommendation, toMallProductSummary } from './bff-adapter';

export type MallRecommendProduct = HkpProductSummary & {
  labels: string[];
};

export interface MallRecommendData {
  query: string;
  recommendationId?: string;
  tabs: HkpFilterTab[];
  products: MallRecommendProduct[];
}

interface FetchRecommendDataOptions {
  sort?: 'priceAsc' | 'priceDesc';
}

const MALL_RECOMMEND_PRODUCTS_PAGE_SIZE = 100;
const MALL_RECOMMEND_PRODUCTS_MAX_PAGES = 5;
const MALL_RECOMMEND_POOL_PAGE_SIZE = 20;
const MALL_RECOMMEND_POOL_MAX_PAGES = 5;

// 热销推荐页优先读取后台推荐位，再按推荐位关联商品加载真实商品卡片。
export async function fetchRecommendData(options: FetchRecommendDataOptions = {}) {
  const recommendationResponse = await fetchAllBffMallRecommendations({
    placement: 'mallHomeHot',
  }, {
    pageSize: MALL_RECOMMEND_POOL_PAGE_SIZE,
    maxPages: MALL_RECOMMEND_POOL_MAX_PAGES,
  });
  const recommendation = (recommendationResponse.list ?? []).filter(isRenderableMallRecommendation)[0];
  const recommendationId = recommendation?.poolId?.trim() || '';
  const productResponse = recommendationId
    ? await fetchAllBffMallProducts({
      recommendationId,
      sort: options.sort,
    }, {
      pageSize: MALL_RECOMMEND_PRODUCTS_PAGE_SIZE,
      maxPages: MALL_RECOMMEND_PRODUCTS_MAX_PAGES,
    })
    : { list: [] };
  const products = (productResponse.list ?? []).filter(isRenderableMallProduct);

  return {
    query: recommendation?.title?.trim() || '',
    recommendationId,
    tabs: [
      { key: 'comprehensive', text: '综合' },
      { key: 'price', text: '价格' },
      { key: 'filter', text: '筛选' },
    ],
    products: products.map((product) => ({
      ...toMallProductSummary(product),
      labels: product.tags ?? [],
    })),
  };
}
