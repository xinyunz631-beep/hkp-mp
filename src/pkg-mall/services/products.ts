import { fetchBffMallProducts } from '@/core/services/bff-mall-api';
import { toMallProductSummary } from './bff-adapter';
import type { MallProductListData } from './mock-data';

interface FetchProductsDataOptions {
  keyword?: string;
  categoryId?: string;
  couponId?: string;
}

const mallProductListTabs: MallProductListData['tabs'] = [
  { key: 'comprehensive', text: '综合' },
  { key: 'sales', text: '销量' },
  { key: 'price', text: '价格' },
  { key: 'filter', text: '筛选' },
];

// 获取商品列表真实数据，筛选条件直接透传 BFF。
export async function fetchProductsData(options: FetchProductsDataOptions = {}) {
  const keyword = (options.keyword || '').trim();
  const response = await fetchBffMallProducts({
    keyword,
    categoryId: options.categoryId,
    couponId: options.couponId,
    page: 1,
    size: 100,
  });

  return {
    tabs: mallProductListTabs,
    keyword,
    products: (response.list ?? []).map(toMallProductSummary),
    discountText: '',
    discountAmount: 0,
    previewAmount: 0,
  };
}
