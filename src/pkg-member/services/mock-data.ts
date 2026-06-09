import type { HkpCouponSummary, HkpFilterTab } from '@/core/types/hkp';

export interface MemberCouponsData {
  tabs: HkpFilterTab[];
  coupons: HkpCouponSummary[];
}

export const memberCoupons: HkpCouponSummary[] = [
  {
    id: '7000000000002001',
    title: '乐园门票优惠券',
    amountText: '¥50',
    thresholdText: '满 399 可用',
    validityText: '有效期至 2026-06-30',
    status: 'available',
    tag: '会员专享',
  },
  {
    id: '7000000000002002',
    title: '商城优惠券',
    amountText: '¥20',
    thresholdText: '满 199 可用',
    validityText: '已使用',
    status: 'used',
  },
  {
    id: '7000000000002003',
    title: '酒店早餐抵扣券',
    amountText: '¥30',
    thresholdText: '满 299 可用',
    validityText: '已过期 2026-04-30',
    status: 'expired',
    tag: '酒店权益',
  },
];

export const memberCouponsData: MemberCouponsData = {
  tabs: [
    { key: 'available', text: '可用', count: memberCoupons.filter((coupon) => coupon.status === 'available').length },
    { key: 'used', text: '已使用', count: memberCoupons.filter((coupon) => coupon.status === 'used').length },
    { key: 'expired', text: '已过期', count: memberCoupons.filter((coupon) => coupon.status === 'expired').length },
  ],
  coupons: memberCoupons,
};

export const shareSummaryData = {
  totalIncome: 128.8,
  availableIncome: 88.8,
  inviteCount: 12,
  rules: ['好友购票成功后可获得奖励', '收益审核通过后可申请提现'],
};

export const incomeRecords = [
  {
    id: '7000000000003001',
    title: '门票分享奖励',
    amount: 18.8,
    time: '2026-05-16 10:00',
    statusText: '已入账',
  },
];

export const inviteRecords = [
  {
    id: '7000000000004001',
    nickname: '微信用户',
    time: '2026-05-16 09:30',
    statusText: '已消费',
  },
];

export const withdrawRecords = [
  {
    id: '7000000000005001',
    amount: 50,
    time: '2026-05-16 11:00',
    statusText: '处理中',
  },
];
