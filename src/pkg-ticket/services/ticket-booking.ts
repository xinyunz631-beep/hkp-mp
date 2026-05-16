import { resolveMockData } from '@/core/services/mock';
import { ticketDates } from './mock-data';

export interface TicketBookingParkInfo {
  openTime: string;
  hotline: string;
  notice: string;
  address: string;
  travelDate: string;
  imageCount: number;
}

export interface TicketProduct {
  id: string;
  category: 'ticket' | 'annualCard';
  title: string;
  description: string;
  priceLabel: string;
  price: number;
  noticeText: string;
}

export interface TicketBookingData {
  parkInfo: TicketBookingParkInfo;
  dates: typeof ticketDates;
  products: TicketProduct[];
}

const ticketBookingData: TicketBookingData = {
  parkInfo: {
    openTime: '10:00~17:00',
    hotline: '4009778899',
    notice: '详细节目单，欢迎戳一戳～',
    address: '浙江安吉县昌硕街道天使大道1号',
    travelDate: ticketDates[0].date,
    imageCount: 1,
  },
  dates: ticketDates,
  products: [
    {
      id: 'adult-ticket',
      category: 'ticket',
      title: '杭州 Hello Kitty 乐园平日成人票',
      description: '指定游玩日当天有效，凭身份证入园',
      priceLabel: '网购价',
      price: 299,
      noticeText: '预定须知',
    },
    {
      id: 'anniversary-single-card',
      category: 'annualCard',
      title: '十周年限定单人年卡',
      description: '限1名身高1.0米（含）以上的人员使用',
      priceLabel: '网购价',
      price: 999,
      noticeText: '预定须知',
    },
  ],
};

// 获取门票预定页面数据，接真实接口时保留这里做字段归一和失败兜底。
export function fetchTicketBookingData() {
  return resolveMockData<TicketBookingData>(ticketBookingData);
}
