import { resolveMockData } from '@/core/services/mock';
import { cancelData, type OrderCancelData } from './mock-data';

export type { OrderCancelData } from './mock-data';

// 获取取消订单页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCancelData() {
  return resolveMockData<OrderCancelData>(cancelData);
}
