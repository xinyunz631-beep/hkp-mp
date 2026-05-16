import { resolveMockData } from '@/core/services/mock';
import { aftersaleData } from './mock-data';

// 获取售后进度页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchAftersaleProgressData() {
  return resolveMockData(aftersaleData);
}
