import { resolveMockData } from '@/core/services/mock';
import { mallProducts } from './mock-data';

export interface MallSearchData {
  query: string;
  hotKeywords: string[];
  products: typeof mallProducts;
}

// 获取商品搜索页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchSearchData() {
  return resolveMockData<MallSearchData>({
    query: 'hello kitty公仔',
    hotKeywords: ['公仔', '鸡蛋', '食用油', '玩具', '情人节', '服装'],
    products: mallProducts,
  });
}
