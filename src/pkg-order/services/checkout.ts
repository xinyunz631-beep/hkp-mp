import { resolveMockData } from '@/core/services/mock';
import { orderCheckoutData, type OrderCheckoutData } from './mock-data';

export type { OrderCheckoutData } from './mock-data';

// 获取确认订单页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCheckoutData() {
  return resolveMockData<OrderCheckoutData>(orderCheckoutData);
}
