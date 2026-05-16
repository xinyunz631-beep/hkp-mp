import { resolveMockData } from '@/core/services/mock';
import { orderDetailData, type OrderDetailData } from './mock-data';

export type { OrderDetailData } from './mock-data';

// 获取订单详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchDetailData() {
  return resolveMockData<OrderDetailData>(orderDetailData);
}
