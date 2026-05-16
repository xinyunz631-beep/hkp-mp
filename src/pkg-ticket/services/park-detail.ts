import { resolveMockData } from '@/core/services/mock';
import { ticketCoupons, ticketDates, ticketParkData, ticketProducts } from './mock-data';

// 获取乐园详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchParkDetailData() {
  return resolveMockData({
    park: ticketParkData,
    dates: ticketDates,
    coupons: ticketCoupons,
    products: ticketProducts,
  });
}
