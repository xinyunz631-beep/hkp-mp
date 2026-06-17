import { resolveMockData } from '@/core/services/mock';
import { aftersaleListData, type OrderAftersaleListData } from './mock-data';

export type { OrderAftersaleListData } from './mock-data';

// 获取售后列表页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchAftersaleListData() {
  return resolveMockData<OrderAftersaleListData>(aftersaleListData);
}
