import type { HkpCouponSummary } from '@/core/types/hkp';

export const memberCoupons: HkpCouponSummary[] = [
  {
    id: 'member-park-50',
    title: '乐园门票优惠券',
    amountText: '¥50',
    thresholdText: '满 399 可用',
    validityText: '有效期至 2026-06-30',
    status: 'available',
    tag: '会员专享',
  },
  {
    id: 'member-used',
    title: '商城优惠券',
    amountText: '¥20',
    thresholdText: '满 199 可用',
    validityText: '已使用',
    status: 'used',
  },
];

export const shareSummaryData = {
  totalIncome: 128.8,
  availableIncome: 88.8,
  inviteCount: 12,
  rules: ['好友购票成功后可获得奖励', '收益审核通过后可申请提现'],
};

export const incomeRecords = [
  {
    id: 'income-001',
    title: '门票分享奖励',
    amount: 18.8,
    time: '2026-05-16 10:00',
    statusText: '已入账',
  },
];

export const inviteRecords = [
  {
    id: 'invite-001',
    nickname: '微信用户',
    time: '2026-05-16 09:30',
    statusText: '已消费',
  },
];

export const withdrawRecords = [
  {
    id: 'withdraw-001',
    amount: 50,
    time: '2026-05-16 11:00',
    statusText: '处理中',
  },
];
