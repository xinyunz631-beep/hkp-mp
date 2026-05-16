import { resolveMockData } from '@/core/services/mock';
import { ticketCoupons, ticketDates, ticketParkData, ticketProducts, type TicketParkData } from './mock-data';

export interface TicketParkDetailData {
  park: TicketParkData;
  dates: typeof ticketDates;
  coupons: typeof ticketCoupons;
  products: typeof ticketProducts;
}

// 获取乐园详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchParkDetailData() {
  return resolveMockData<TicketParkDetailData>({
    park: ticketParkData,
    dates: ticketDates,
    coupons: ticketCoupons,
    products: ticketProducts,
  });
}
