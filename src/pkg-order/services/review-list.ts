import { resolveMockData } from '@/core/services/mock';
import { reviewData } from './mock-data';

// 获取评价列表页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchReviewListData() {
  return resolveMockData({ reviews: [reviewData] });
}
