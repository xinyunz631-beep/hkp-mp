import { resolveMockData } from '@/core/services/mock';
import { mallCartData } from './mock-data';

// 获取购物车页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCartData() {
  return resolveMockData(mallCartData);
}
