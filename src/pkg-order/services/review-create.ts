import { resolveMockData } from '@/core/services/mock';
import { reviewData } from './mock-data';

// 获取创建评价页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchReviewCreateData() {
  return resolveMockData(reviewData);
}
