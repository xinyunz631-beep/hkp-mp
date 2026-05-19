import { resolveMockData } from '@/core/services/mock';
import { mallProductListData } from './mock-data';
import { filterMallProductsByKeyword } from './search';

interface FetchProductsDataOptions {
  keyword?: string;
}

// 获取商品列表页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchProductsData(options: FetchProductsDataOptions = {}) {
  const keyword = (options.keyword || '').trim();
  const products = filterMallProductsByKeyword(mallProductListData.products, keyword);

  return resolveMockData({
    ...mallProductListData,
    keyword,
    products,
  });
}
