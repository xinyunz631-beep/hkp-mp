import type { HkpCouponSummary, HkpDateOption, HkpProductSummary } from '@/core/types/hkp';

export interface TicketParkSchedule {
  dateRange: string;
  daysLabel: string;
  openHours: string;
}

export interface TicketParkPolicy {
  label: string;
  value: string;
}

export interface TicketParkInfoItem {
  label: string;
  value: string;
}

export interface TicketParkData {
  name: string;
  heroImages: string[];
  intro: string;
  openTime: string;
  hotline: string;
  address: string;
  notice: string;
  schedules: TicketParkSchedule[];
  policies: TicketParkPolicy[];
  otherInfo: TicketParkInfoItem[];
}

export interface TicketParkGuideData {
  title: string;
  imageSrc: string;
  sections: string[];
}

export const ticketParkData: TicketParkData = {
  name: 'Hello Kitty Park',
  heroImages: [''],
  intro:
    '杭州 Hello Kitty 乐园位于浙江安吉，以 Sanrio 经典角色为主题，集合乐园游乐、亲子互动、主题演艺与假日度假体验。',
  openTime: '10:00~17:00',
  hotline: '4009778899',
  address: '浙江安吉县昌硕街道天使大道1号',
  notice: '详细节目单，欢迎戳一戳～',
  schedules: [
    {
      dateRange: '07月01日-08月31日',
      daysLabel: '周一至周日',
      openHours: '10:00-21:00',
    },
    {
      dateRange: '09月01日-次年06月30日',
      daysLabel: '周一至周日',
      openHours: '10:00-17:00',
    },
  ],
  policies: [
    {
      label: '儿童',
      value: '身高1米以下免票',
    },
    {
      label: '老年人',
      value: '70周岁以上凭身份证享受优惠',
    },
  ],
  otherInfo: [
    {
      label: '客服热线',
      value: '4009778899',
    },
    {
      label: '园区地址',
      value: '浙江安吉县昌硕街道天使大道1号',
    },
    {
      label: '节目单',
      value: '详细节目单，欢迎戳一戳～',
    },
  ],
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

export interface TicketCheckoutTicketItem {
  title: string;
  quantity: number;
  travelDate: string;
  tagText: string;
  price: number;
}

export interface TicketCheckoutAddonItem {
  merchantTitle: string;
  productTitle: string;
  noteText: string;
  quantity: number;
  price: number;
}

export interface TicketCheckoutContactInfo {
  name: string;
  mobile: string;
  idCard: string;
  mobilePlaceholder: string;
  idCardPlaceholder: string;
  helperText: string;
  errorText: string;
}

export interface TicketCheckoutData {
  parkName: string;
  ticketItem: TicketCheckoutTicketItem;
  addonItem: TicketCheckoutAddonItem;
  contact: TicketCheckoutContactInfo;
  discountText: string;
  couponText: string;
  discountAmount: number;
  payButtonText: string;
}

export const ticketCheckoutData: TicketCheckoutData = {
  parkName: '杭州 Hello Kitty 乐园',
  ticketItem: {
    title: '杭州Hello Kitty 乐园平日成人票',
    quantity: 1,
    travelDate: ticketDates[0].date,
    tagText: '预定须知',
    price: 299,
  },
  addonItem: {
    merchantTitle: '小恐龙餐厅',
    productTitle: '美食送温情精选套餐A 午餐',
    noteText: '免预约',
    quantity: 1,
    price: 99,
  },
  contact: {
    name: 'Chris J',
    mobile: '',
    idCard: '',
    mobilePlaceholder: '请输入手机号',
    idCardPlaceholder: '请填写证件号码',
    helperText: '身份证件用于入园核验，请确保与实际出行人一致',
    errorText: '请补全身份证信息',
  },
  discountText: '无可用',
  couponText: '满¥300减¥50',
  discountAmount: 50,
  payButtonText: '去支付',
};

export const parkGuideData: TicketParkGuideData = {
  title: '乐园导览',
  imageSrc: '',
  sections: ['吃', '住', '行', '游', '购', '娱', '商', '学', '情'],
};
