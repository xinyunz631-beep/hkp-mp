import { resolveMockData } from '@/core/services/mock';
import { diningMerchantData } from './mock-data';

// 获取商家详情页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchMerchantDetailData() {
  return resolveMockData(diningMerchantData);
}
