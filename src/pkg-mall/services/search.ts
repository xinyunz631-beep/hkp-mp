import { resolveMockData } from '@/core/services/mock';
import { mallProducts } from './mock-data';

// 获取商品搜索页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchSearchData() {
  return resolveMockData({
    keywords: ['冰箱贴', '毛绒', '甜点', '十周年'],
    products: mallProducts,
  });
}
