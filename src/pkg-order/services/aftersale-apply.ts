import { resolveMockData } from '@/core/services/mock';
import { aftersaleApplyData, type OrderAftersaleApplyData } from './mock-data';

export type { OrderAftersaleApplyData } from './mock-data';

// 获取售后申请页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchAftersaleApplyData() {
  return resolveMockData<OrderAftersaleApplyData>(aftersaleApplyData);
}
