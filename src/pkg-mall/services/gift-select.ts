import { resolveMockData } from '@/core/services/mock';
import { mallProducts } from './mock-data';

// 获取赠品选择页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchGiftSelectData() {
  return resolveMockData({ gifts: mallProducts.slice(1) });
}
