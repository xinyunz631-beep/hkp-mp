import type { HkpCouponSummary, HkpFilterTab } from '@/core/types/hkp';

export interface MemberHomeShortcut {
  key: string;
  title: string;
  value: string;
  action: 'memberCode' | 'coupons' | 'orders' | 'address' | 'comingSoon';
  disabled?: boolean;
}

export interface MemberHomeSectionItem {
  key: string;
  title: string;
  desc: string;
  action: 'comingSoon' | 'coupons' | 'orders';
  disabled?: boolean;
}

export interface MemberHomeData {
  points: number;
  growthText: string;
  couponCount: number;
  couponHintText: string;
  shortcuts: MemberHomeShortcut[];
  sections: {
    title: string;
    items: MemberHomeSectionItem[];
  }[];
}

export interface MemberCouponsData {
  tabs: HkpFilterTab[];
  coupons: HkpCouponSummary[];
}

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
  {
    id: 'member-expired',
    title: '酒店早餐抵扣券',
    amountText: '¥30',
    thresholdText: '满 299 可用',
    validityText: '已过期 2026-04-30',
    status: 'expired',
    tag: '酒店权益',
  },
];

export const memberHomeData: MemberHomeData = {
  points: 1280,
  growthText: '再获得 220 积分即可升级银卡会员',
  couponCount: memberCoupons.filter((coupon) => coupon.status === 'available').length,
  couponHintText: '本月新增 2 张会员专享券',
  shortcuts: [
    {
      key: 'member-code',
      title: '会员码',
      value: '快速核销',
      action: 'memberCode',
    },
    {
      key: 'coupons',
      title: '优惠券',
      value: `${memberCoupons.filter((coupon) => coupon.status === 'available').length} 张可用`,
      action: 'coupons',
    },
    {
      key: 'orders',
      title: '我的订单',
      value: '票务 / 商城 / 酒店',
      action: 'orders',
    },
    {
      key: 'address',
      title: '地址管理',
      value: '常用收货信息',
      action: 'address',
    },
  ],
  sections: [
    {
      title: '会员权益',
      items: [
        {
          key: 'birthday',
          title: '生日礼遇',
          desc: '生日月可领取限定券包，后续开放',
          action: 'comingSoon',
          disabled: true,
        },
        {
          key: 'parking',
          title: '停车权益',
          desc: '酒店住客与年卡会员可享受停车优惠',
          action: 'comingSoon',
          disabled: true,
        },
      ],
    },
    {
      title: '更多服务',
      items: [
        {
          key: 'share',
          title: '分享收益',
          desc: '邀请好友下单后可查看专属奖励',
          action: 'comingSoon',
          disabled: true,
        },
        {
          key: 'withdraw',
          title: '提现服务',
          desc: '奖励到账后可在这里发起提现',
          action: 'comingSoon',
          disabled: true,
        },
      ],
    },
  ],
};

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
