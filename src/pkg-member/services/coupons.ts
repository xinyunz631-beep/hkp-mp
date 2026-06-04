import { resolveMockData } from '@/core/services/mock';

export type MemberCouponStatus = 'claimed' | 'used' | 'expired';
export const MEMBER_COUPON_USE_TYPE_OFFLINE = 1;
export const MEMBER_COUPON_USE_TYPE_ONLINE = 2;
export const MEMBER_COUPON_USE_TYPE_UNKNOWN = 3;

export type MemberCouponUseType =
  | typeof MEMBER_COUPON_USE_TYPE_OFFLINE
  | typeof MEMBER_COUPON_USE_TYPE_ONLINE
  | typeof MEMBER_COUPON_USE_TYPE_UNKNOWN;

export interface MemberCouponTab {
  key: MemberCouponStatus;
  text: string;
  count?: number;
}

export interface MemberCouponItem {
  id: string;
  status: MemberCouponStatus;
  sideText: string;
  amountText: string;
  couponTypeText: string;
  currencyText: string;
  validityText: string;
  title: string;
  actionText: string;
  useType: MemberCouponUseType;
}

export interface MemberCouponsData {
  tabs: MemberCouponTab[];
  coupons: MemberCouponItem[];
  moreButtonText: string;
}

const coupons: MemberCouponItem[] = [
  {
    id: '7000000000001001',
    status: 'claimed',
    sideText: '园内时光驿站店铺领取',
    amountText: '免费',
    couponTypeText: '特价券',
    currencyText: 'RMB',
    validityText: '有效期:2026.03.03-2026.06.03',
    title: '新人礼品券',
    actionText: '立即使用',
    useType: MEMBER_COUPON_USE_TYPE_OFFLINE,
  },
  {
    id: '7000000000001002',
    status: 'claimed',
    sideText: '线上及园内消费皆可使用',
    amountText: '5',
    couponTypeText: '满减券',
    currencyText: 'RMB',
    validityText: '有效期:2026.03.03-2026.06.03',
    title: '满￥150减￥5商品抵扣券',
    actionText: '立即使用',
    useType: MEMBER_COUPON_USE_TYPE_ONLINE,
  },
  {
    id: '7000000000001003',
    status: 'claimed',
    sideText: '线上及园内消费皆可使用',
    amountText: '5',
    couponTypeText: '满减券',
    currencyText: 'RMB',
    validityText: '有效期:2026.03.03-2026.06.03',
    title: '满￥150减￥5商品抵扣券',
    actionText: '立即使用',
    useType: MEMBER_COUPON_USE_TYPE_ONLINE,
  },
  {
    id: '7000000000001004',
    status: 'claimed',
    sideText: '限园内餐饮店铺使用',
    amountText: '5',
    couponTypeText: '满减券',
    currencyText: 'RMB',
    validityText: '有效期:2026.03.03-2026.06.03',
    title: '满￥60减￥5餐饮抵扣券',
    actionText: '立即使用',
    useType: MEMBER_COUPON_USE_TYPE_OFFLINE,
  },
  {
    id: '7000000000001005',
    status: 'claimed',
    sideText: '限园内餐饮店铺使用',
    amountText: '5',
    couponTypeText: '满减券',
    currencyText: 'RMB',
    validityText: '有效期:2026.03.03-2026.06.03',
    title: '满￥60减￥5餐饮抵扣券',
    actionText: '立即使用',
    useType: MEMBER_COUPON_USE_TYPE_OFFLINE,
  },
  {
    id: '7000000000001006',
    status: 'used',
    sideText: '线上及园内消费皆可使用',
    amountText: '5',
    couponTypeText: '满减券',
    currencyText: 'RMB',
    validityText: '已使用:2026.04.18',
    title: '满￥150减￥5商品抵扣券',
    actionText: '已使用',
    useType: MEMBER_COUPON_USE_TYPE_ONLINE,
  },
  {
    id: '7000000000001007',
    status: 'expired',
    sideText: '限园内餐饮店铺使用',
    amountText: '5',
    couponTypeText: '满减券',
    currencyText: 'RMB',
    validityText: '已过期:2026.04.30',
    title: '满￥60减￥5餐饮抵扣券',
    actionText: '已过期',
    useType: MEMBER_COUPON_USE_TYPE_OFFLINE,
  },
];

const memberCouponsData: MemberCouponsData = {
  tabs: [
    { key: 'claimed', text: '已领取', count: coupons.filter((coupon) => coupon.status === 'claimed').length },
    { key: 'used', text: '已使用', count: coupons.filter((coupon) => coupon.status === 'used').length },
    { key: 'expired', text: '已过期', count: coupons.filter((coupon) => coupon.status === 'expired').length },
  ],
  coupons,
  moreButtonText: '获取更多好券',
};

// 获取优惠券页面数据，真实接口接入后在这里归一字段、状态和跳转目标。
export function fetchCouponsData() {
  return resolveMockData<MemberCouponsData>(memberCouponsData);
}
