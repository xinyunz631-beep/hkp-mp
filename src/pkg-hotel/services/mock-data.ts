import type { HkpDateOption, HkpProductSummary } from '@/core/types/hkp';

export const hotelRooms: HkpProductSummary[] = [
  {
    id: 'kitty-family-room',
    title: 'Hello Kitty 主题家庭房',
    subtitle: '含双早，可住 2 大 1 小',
    image: { src: '' },
    price: 1299,
    tag: '推荐',
  },
  {
    id: 'castle-room',
    title: '城堡景观双床房',
    subtitle: '近乐园入口',
    image: { src: '' },
    price: 999,
  },
];

export const hotelDates: HkpDateOption[] = [
  { date: '2026-05-16', title: '入住', subtitle: '今天' },
  { date: '2026-05-17', title: '离店', subtitle: '明天' },
];

export const hotelDetailData = {
  name: 'Hello Kitty Park 城堡酒店',
  heroImages: [''],
  address: '浙江安吉县昌硕街道天使大道1号',
  rooms: hotelRooms,
};

export const hotelCheckoutData = {
  hotel: hotelDetailData,
  room: hotelRooms[0],
  dates: hotelDates,
  guestText: '2 成人 1 儿童',
  totalAmount: hotelRooms[0].price,
};
