import { resolveMockData } from '@/core/services/mock';
import { diningCheckoutData } from './mock-data';

// 获取餐饮确认订单页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchCheckoutData() {
  return resolveMockData(diningCheckoutData);
}
