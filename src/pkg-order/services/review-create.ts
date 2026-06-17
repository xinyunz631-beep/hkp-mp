import { resolveMockData } from '@/core/services/mock';
import { reviewCreateData, type OrderReviewCreateData } from './mock-data';

export type { OrderReviewCreateData } from './mock-data';

// 获取创建评价页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchReviewCreateData() {
  return resolveMockData<OrderReviewCreateData>(reviewCreateData);
}
