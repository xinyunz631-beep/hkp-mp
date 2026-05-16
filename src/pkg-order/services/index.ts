import { resolveMockData } from '@/core/services/mock';
import { orderHomeData, type OrderHomeData } from './mock-data';

export type { OrderHomeData } from './mock-data';

// 获取订单首页数据，后续接真实接口时在这里统一处理字段归一和失败兜底。
export function fetchOrderHomeData() {
  return resolveMockData<OrderHomeData>(orderHomeData);
}
