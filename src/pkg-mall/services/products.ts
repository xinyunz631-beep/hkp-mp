import { fetchAllBffMallProducts } from '@/core/services/bff-mall-api';
import { isRenderableMallProduct, toMallProductSummary } from './bff-adapter';
import type { MallProductListData } from './types';

interface FetchProductsDataOptions {
  keyword?: string;
  categoryId?: string;
  recommendationId?: string;
  couponId?: string;
  sourceRefType?: string;
  sourceRefId?: string;
  sort?: 'priceAsc' | 'priceDesc';
}

const MALL_PRODUCTS_PAGE_SIZE = 100;
const MALL_PRODUCTS_MAX_PAGES = 5;

const mallProductListTabs: MallProductListData['tabs'] = [
  { key: 'comprehensive', text: '综合' },
  { key: 'price', text: '价格' },
  { key: 'filter', text: '筛选' },
];

// 获取商品列表真实数据，筛选条件直接透传 BFF。
export async function fetchProductsData(options: FetchProductsDataOptions = {}) {
  const keyword = (options.keyword || '').trim();
  const response = await fetchAllBffMallProducts({
    keyword,
    categoryId: options.categoryId,
    recommendationId: options.recommendationId,
    couponId: options.couponId,
    sourceRefType: options.sourceRefType,
    sourceRefId: options.sourceRefId,
    sort: options.sort,
  }, {
    pageSize: MALL_PRODUCTS_PAGE_SIZE,
    maxPages: MALL_PRODUCTS_MAX_PAGES,
  });

  return {
    tabs: mallProductListTabs,
    keyword,
    products: (response.list ?? []).filter(isRenderableMallProduct).map(toMallProductSummary),
  };
}
