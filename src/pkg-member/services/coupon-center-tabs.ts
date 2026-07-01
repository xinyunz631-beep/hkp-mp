export type MemberCouponCenterTabKey = 'recommend' | 'exchangeCode';

export interface MemberCouponCenterTab {
  key: MemberCouponCenterTabKey;
  title: string;
}

export const MEMBER_COUPON_CENTER_TABS: MemberCouponCenterTab[] = [
  { key: 'recommend', title: '好券推荐' },
  { key: 'exchangeCode', title: '兑换码' },
];
