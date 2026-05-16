import { resolveMockData } from '@/core/services/mock';
import { mallHomeData } from './mock-data';

// 获取商城分类页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCategoryData() {
  return resolveMockData({ categories: mallHomeData.categories });
}
