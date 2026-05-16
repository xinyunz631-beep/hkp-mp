import type { HkpCouponSummary, HkpDateOption, HkpProductSummary } from '@/core/types/hkp';

export interface TicketParkData {
  name: string;
  heroImages: string[];
  openTime: string;
  hotline: string;
  address: string;
  notice: string;
}

export const ticketParkData: TicketParkData = {
  name: 'Hello Kitty Park',
  heroImages: [''],
  openTime: '10:00~17:00',
  hotline: '4009778899',
  address: '浙江安吉县昌硕街道天使大道1号',
  notice: '详细节目单，欢迎戳一戳～',
};

export const ticketProducts: HkpProductSummary[] = [
  {
    id: 'adult-ticket',
    title: '成人票',
    subtitle: '指定游玩日当天有效',
    image: { src: '' },
    price: 299,
    tag: '门票',
  },
  {
    id: 'anniversary-card',
    title: '十周年限定单人年卡',
    subtitle: '限1名身高1.0米（含）以上人员使用',
    image: { src: '' },
    price: 999,
    tag: '年卡',
  },
];

export const ticketDates: HkpDateOption[] = [
  { date: '2026-05-16', title: '今天', subtitle: '可订' },
  { date: '2026-05-17', title: '明天', subtitle: '可订' },
  { date: '2026-05-18', title: '周一', subtitle: '可订' },
];

export const ticketCoupons: HkpCouponSummary[] = [
  {
    id: 'ticket-30-off',
    title: '门票优惠券',
    amountText: '¥30',
    thresholdText: '满 299 可用',
    validityText: '有效期至 2026-06-30',
    status: 'available',
  },
];

export const ticketCheckoutData = {
  park: ticketParkData,
  products: ticketProducts.slice(0, 1),
  travelDate: ticketDates[0].date,
  coupons: ticketCoupons,
  totalAmount: ticketProducts[0].price,
};

export const parkGuideData = {
  title: '乐园导览',
  imageSrc: '',
  sections: ['吃', '住', '行', '游', '购', '娱', '商', '学', '情'],
};
