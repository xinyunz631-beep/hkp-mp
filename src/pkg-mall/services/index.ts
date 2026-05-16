import { resolveMockData } from '@/core/services/mock';
import { mallHomeData } from './mock-data';

// 获取商城首页数据，后续接真实接口时在这里做字段归一和失败兜底。
export function fetchMallHomeData() {
  return resolveMockData(mallHomeData);
}
