import { resolveMockData } from '@/core/services/mock';
import { memberCoupons } from './mock-data';

// 获取优惠券页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCouponsData() {
  return resolveMockData({ coupons: memberCoupons });
}
