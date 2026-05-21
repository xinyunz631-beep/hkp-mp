import { HKP_PARK_LOCATION } from '@/core/constants/park-location';
import { resolveMockData } from '@/core/services/mock';
import { ticketCoupons, ticketDates } from './mock-data';
import type { HkpCouponSummary } from '@/core/types/hkp';

export interface TicketBookingMapLocation {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

export interface TicketCoupon extends HkpCouponSummary {
  minimumAmount: number;
  discountAmount: number;
}

export interface TicketBookingParkInfo {
  name: string;
  subtitle: string;
  openTime: string;
  hotline: string;
  notice: string;
  address: string;
  travelDate: string;
  imageCount: number;
  heroImages: string[];
  sellingPoints: string[];
  bookingTips: string[];
  warmTips: string[];
  rules: string[];
  mapLocation: TicketBookingMapLocation;
}

export interface TicketProduct {
  id: string;
  category: 'ticket' | 'annualCard';
  title: string;
  description: string;
  priceLabel: string;
  price: number;
  noticeText: string;
  tags: string[];
  validityText: string;
  stockText: string;
  limitText: string;
  defaultQuantity?: number;
}

export interface TicketPackageProduct {
  id: string;
  title: string;
  soldText: string;
  priceText: string;
  imageSrc: string;
}

export type TicketBookingSectionKey = string;
export type TicketBookingSectionType = 'ticket' | 'annualCard' | 'package';

export interface TicketBookingSectionBadge {
  text: string;
  color?: string;
}

export interface TicketBookingSection {
  key: TicketBookingSectionKey;
  type: TicketBookingSectionType;
  title: string;
  badge?: TicketBookingSectionBadge;
  productIds?: string[];
  packageIds?: string[];
}

export interface TicketBookingData {
  parkInfo: TicketBookingParkInfo;
  sections: TicketBookingSection[];
  dates: typeof ticketDates;
  products: TicketProduct[];
  packages: TicketPackageProduct[];
  coupons: TicketCoupon[];
}

export interface FetchTicketBookingDataOptions {
  travelDate?: string;
}

const ticketBookingData: TicketBookingData = {
  parkInfo: {
    name: '杭州 Hello Kitty 乐园',
    subtitle: '官方直营 · 主题乐园门票',
    openTime: '10:00~17:00',
    hotline: '4009778899',
    notice: '详细节目单，欢迎戳一戳～',
    address: '浙江安吉县昌硕街道天使大道1号',
    travelDate: ticketDates[0].date,
    imageCount: 1,
    heroImages: [''],
    sellingPoints: ['官方出票', '未使用可退', '身份证入园', '当日可订'],
    bookingTips: [
      '同一订单内票种统一使用同一个游玩日期。',
      '下单后请在确认订单页补全出行人手机号与证件信息。',
      '如需改期，请在未核销前重新选择日期并提交订单。',
    ],
    warmTips: [
      '乐园开放时间：10:00--17:00；',
      '如当日需二次入园，请在出园前至检票口办理二次入园手续，否则将无法再次入园；',
      '所有活动票、特价票不退不改签；',
      '如遇雨、雪、雷电、大风等恶劣天气，户外设备停开，请在购票前查询天气预报，以免造成不必要的损失；',
      '乐园设备进入年检期，开放详情请咨询游客服务中心，或可咨询4009-778899',
    ],
    rules: [
      '门票仅限所选游玩日期当天使用，入园时需出示购票人身份证件。',
      '未使用门票支持随时退，已核销或超过有效期后不可退。',
      '园区营业时间可能因天气、活动或设备维护调整，请以当日公告为准。',
      '优惠券以提交订单时可用状态为准，不可与线下活动重复叠加。',
    ],
    mapLocation: {
      ...HKP_PARK_LOCATION,
    },
  },
  dates: ticketDates,
  sections: [],
  coupons: ticketCoupons.map((coupon) => ({
    ...coupon,
    minimumAmount: 230,
    discountAmount: 30,
  })),
  products: [
    {
      id: 'adult-ticket',
      category: 'ticket',
      title: '当日成人票',
      description: '1.4米（含1.4米）以上儿童及成人',
      priceLabel: '网购价',
      price: 230,
      noticeText: '预定须知',
      tags: [],
      validityText: '所选游玩日当天有效',
      stockText: '今日库存充足',
      limitText: '每单最多购买 6 张',
    },
    {
      id: 'discount-ticket',
      category: 'ticket',
      title: '当日优惠票',
      description: '70周岁以上长者及符合园区优待政策游客',
      priceLabel: '网购价',
      price: 140,
      noticeText: '预定须知',
      tags: [],
      validityText: '所选游玩日当天有效',
      stockText: '今日库存充足',
      limitText: '入园需出示有效证件',
    },
    {
      id: 'child-ticket',
      category: 'ticket',
      title: '当日儿童票',
      description: '1米（含1米）-1.4米（不含1.4米）儿童',
      priceLabel: '网购价',
      price: 140,
      noticeText: '预定须知',
      tags: [],
      validityText: '所选游玩日当天有效',
      stockText: '今日库存充足',
      limitText: '入园需成人陪同',
    },
    {
      id: 'adult-annual-card',
      category: 'annualCard',
      title: '成人年卡',
      description: '1.4米以上儿童以及成人',
      priceLabel: '网购价',
      price: 660,
      noticeText: '预定须知',
      tags: [],
      validityText: '激活后 365 天内有效',
      stockText: '限量发售中',
      limitText: '每个身份证限购 1 张',
    },
    {
      id: 'child-annual-card',
      category: 'annualCard',
      title: '儿童年卡',
      description: '1-1.4米（不含1.4米）以上儿童',
      priceLabel: '网购价',
      price: 660,
      noticeText: '预定须知',
      tags: [],
      validityText: '激活后 365 天内有效',
      stockText: '限量发售中',
      limitText: '实名年卡，入园需核验证件',
    },
    {
      id: 'family-annual-card-a',
      category: 'annualCard',
      title: '家庭年卡A',
      description: '2名成人携带1名身高1米（含1米）-1.4米的儿童或2名成人携带1名优待者',
      priceLabel: '网购价',
      price: 1380,
      noticeText: '预定须知',
      tags: [],
      validityText: '激活后 365 天内有效',
      stockText: '限量发售中',
      limitText: '每单最多购买 1 套',
    },
    {
      id: 'family-annual-card-b',
      category: 'annualCard',
      title: '家庭年卡B',
      description: '2名成人携带2名身高1米（含1米）-1.4米的儿童或2名成人携带2名优待者',
      priceLabel: '网购价',
      price: 1580,
      noticeText: '预定须知',
      tags: [],
      validityText: '激活后 365 天内有效',
      stockText: '限量发售中',
      limitText: '每单最多购买 1 套',
    },
    {
      id: 'family-annual-card-c',
      category: 'annualCard',
      title: '家庭年卡C',
      description: '1名成人携带1名身高1米（含1米）-1.4米的儿童或1名成人携带1名优待者',
      priceLabel: '网购价',
      price: 980,
      noticeText: '预定须知',
      tags: [],
      validityText: '激活后 365 天内有效',
      stockText: '限量发售中',
      limitText: '每单最多购买 1 套',
    },
    {
      id: 'parent-child-ticket',
      category: 'ticket',
      title: '亲子畅玩票',
      description: '1名成人携带1名1米-1.4米儿童',
      priceLabel: '网购价',
      price: 330,
      noticeText: '预定须知',
      tags: [],
      validityText: '所选游玩日当天有效',
      stockText: '亲子专享',
      limitText: '每单最多购买 3 套',
    },
    {
      id: 'afternoon-ticket',
      category: 'ticket',
      title: '午后入园票',
      description: '14:00后入园，适合半日轻游玩',
      priceLabel: '网购价',
      price: 168,
      noticeText: '预定须知',
      tags: [],
      validityText: '所选游玩日当天有效',
      stockText: '限时发售',
      limitText: '每单最多购买 6 张',
    },
    {
      id: 'limited-adult-ticket',
      category: 'ticket',
      title: '限时成人特惠票',
      description: '指定日期限量发售，售完即止',
      priceLabel: '网购价',
      price: 199,
      noticeText: '预定须知',
      tags: [],
      validityText: '所选游玩日当天有效',
      stockText: '限量库存',
      limitText: '每单最多购买 4 张',
    },
  ],
  packages: [
    {
      id: 'single-ticket-dining',
      title: '任意日单人票+日料餐厅抵用券',
      soldText: '已售200',
      priceText: '¥110起',
      imageSrc: '',
    },
    {
      id: 'child-ticket-dino-dining',
      title: '儿童票及优待票+小恐龙餐厅抵用券',
      soldText: '已售200',
      priceText: '¥188起',
      imageSrc: '',
    },
    {
      id: 'family-ticket-dining',
      title: '家庭票+园区餐饮抵用券',
      soldText: '已售126',
      priceText: '¥299起',
      imageSrc: '',
    },
    {
      id: 'annual-card-gift',
      title: '年卡+限定周边礼包',
      soldText: '已售86',
      priceText: '¥660起',
      imageSrc: '',
    },
  ],
};

const ticketSectionCatalog: TicketBookingSection[] = [
  {
    key: 'ticket',
    type: 'ticket',
    title: '门票',
    productIds: ['adult-ticket', 'discount-ticket', 'child-ticket'],
  },
  {
    key: 'annual-card',
    type: 'annualCard',
    title: '年卡',
    badge: { text: 'hot', color: 'red' },
    productIds: ['adult-annual-card', 'child-annual-card'],
  },
  {
    key: 'family-card',
    type: 'annualCard',
    title: '家庭年卡',
    badge: { text: 'hot', color: 'red' },
    productIds: ['family-annual-card-a', 'family-annual-card-b', 'family-annual-card-c'],
  },
  {
    key: 'parent-child',
    type: 'ticket',
    title: '亲子票',
    badge: { text: '亲子', color: 'red' },
    productIds: ['parent-child-ticket'],
  },
  {
    key: 'package',
    type: 'package',
    title: '门票套餐',
    packageIds: ['single-ticket-dining', 'child-ticket-dino-dining'],
  },
  {
    key: 'limited-ticket',
    type: 'ticket',
    title: '限时特惠',
    badge: { text: '限时', color: 'red' },
    productIds: ['afternoon-ticket', 'limited-adult-ticket'],
  },
];

const packageBasePrices: Record<string, number> = {
  'single-ticket-dining': 110,
  'child-ticket-dino-dining': 188,
  'family-ticket-dining': 299,
  'annual-card-gift': 660,
};

function getTravelDateSeed(travelDate?: string) {
  const dateText = travelDate || ticketBookingData.parkInfo.travelDate;
  const day = Number(dateText.slice(-2));

  if (Number.isFinite(day) && day > 0) return day;

  return Array.from(dateText).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function buildSectionsForDate(travelDate?: string) {
  const seed = getTravelDateSeed(travelDate);
  const sectionCounts = [2, 4, 5, 6];
  const count = sectionCounts[seed % sectionCounts.length];
  const startIndex = seed % ticketSectionCatalog.length;
  const rotatedSections = [
    ...ticketSectionCatalog.slice(startIndex),
    ...ticketSectionCatalog.slice(0, startIndex),
  ];

  return rotatedSections.slice(0, count);
}

function buildProductsForDate(sections: TicketBookingSection[], travelDate?: string) {
  const seed = getTravelDateSeed(travelDate);
  const ticketOffset = (seed % 4) * 5;
  const annualCardOffset = (seed % 3) * 20;

  return ticketBookingData.products.map((product) => ({
    ...product,
    price: product.price + (product.category === 'annualCard' ? annualCardOffset : ticketOffset),
  }));
}

function buildPackagesForDate(travelDate?: string) {
  const seed = getTravelDateSeed(travelDate);
  const packageOffset = (seed % 3) * 10;

  return ticketBookingData.packages.map((product) => ({
    ...product,
    priceText: `¥${(packageBasePrices[product.id] ?? 100) + packageOffset}起`,
  }));
}

function buildTicketBookingData(options: FetchTicketBookingDataOptions = {}): TicketBookingData {
  const travelDate = options.travelDate || ticketBookingData.parkInfo.travelDate;
  const sections = buildSectionsForDate(travelDate);

  return {
    ...ticketBookingData,
    parkInfo: {
      ...ticketBookingData.parkInfo,
      travelDate,
    },
    sections,
    products: buildProductsForDate(sections, travelDate),
    packages: buildPackagesForDate(travelDate),
  };
}

// 获取门票预定页面数据，接真实接口时保留这里做字段归一和失败兜底。
export function fetchTicketBookingData(options: FetchTicketBookingDataOptions = {}) {
  return resolveMockData<TicketBookingData>(buildTicketBookingData(options));
}
