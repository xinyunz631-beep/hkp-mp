import { resolveMockData } from '@/core/services/mock';
import { aftersaleTypeData, type OrderAftersaleTypeData } from './mock-data';

export type { OrderAftersaleTypeData } from './mock-data';

// 获取售后类型页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchAftersaleTypeData() {
  return resolveMockData<OrderAftersaleTypeData>(aftersaleTypeData);
}
