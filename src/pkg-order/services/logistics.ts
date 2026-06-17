import { resolveMockData } from '@/core/services/mock';
import { logisticsData, type OrderLogisticsData } from './mock-data';

export type { OrderLogisticsData } from './mock-data';

// 获取物流详情页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchLogisticsData() {
  return resolveMockData<OrderLogisticsData>(logisticsData);
}
