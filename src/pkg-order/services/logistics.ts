import { resolveMockData } from '@/core/services/mock';
import { logisticsData } from './mock-data';

// 获取物流详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchLogisticsData() {
  return resolveMockData(logisticsData);
}
