import { fetchBffCrmCenter } from '@/core/services/bff-crm-api';

export interface MemberHomeShortcut {
  key: string;
  title: string;
  value: string;
  action: 'memberCode' | 'cards' | 'coupons' | 'orders' | 'address' | 'comingSoon';
  disabled?: boolean;
}

export interface MemberHomeSectionItem {
  key: string;
  title: string;
  desc: string;
  action: 'memberGrowth' | 'coupons' | 'orders' | 'parkGuide' | 'ticketBooking' | 'shareDeferred' | 'withdrawDeferred';
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

const MEMBER_HOME_SHORTCUTS: MemberHomeShortcut[] = [
  {
    key: 'member-code',
    title: '会员码',
    value: '快速核销',
    action: 'memberCode',
  },
  {
    key: 'cards',
    title: '我的卡包',
    value: '年卡状态',
    action: 'cards',
  },
  {
    key: 'coupons',
    title: '优惠券',
    value: '0 张可用',
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
];

const MEMBER_HOME_MORE_SERVICE_SECTION = {
  title: '更多服务',
  items: [
    {
      key: 'share',
      title: '分享收益',
      desc: '邀请好友下单后可查看专属奖励',
      action: 'shareDeferred' as const,
      disabled: true,
    },
    {
      key: 'withdraw',
      title: '提现服务',
      desc: '奖励到账后可在这里发起提现',
      action: 'withdrawDeferred' as const,
      disabled: true,
    },
  ],
};

// 获取会员中心首页真实数据，静态配置只承载入口结构，不做接口失败兜底。
export async function fetchMemberHomeData(): Promise<MemberHomeData> {
  const center = await fetchBffCrmCenter();
  const profile = center.profile;
  const couponCount = profile.couponCount ?? 0;
  const growthValue = profile.growthValue ?? 0;
  const pointsBalance = profile.pointsBalance ?? 0;
  const nextLevelText = profile.nextLevelGrowth
    ? `再获得 ${Math.max(profile.nextLevelGrowth - growthValue, 0)} 成长值即可升级${profile.nextLevelName || '下一等级'}`
    : `${profile.levelName || '会员'}权益已生效`;
  const benefitItems = center.benefits.map((benefit) => ({
    key: benefit.benefitNo,
    title: benefit.benefitTitle,
    desc: benefit.benefitSummary || benefit.highlightText || '会员专属权益',
    action: 'memberGrowth' as const,
  }));

  return {
    points: pointsBalance,
    growthText: nextLevelText,
    couponCount,
    couponHintText: couponCount ? `当前有 ${couponCount} 张可用券` : '暂无可用会员券',
    shortcuts: MEMBER_HOME_SHORTCUTS.map((shortcut) => (
      shortcut.key === 'coupons'
        ? { ...shortcut, value: `${couponCount} 张可用` }
        : shortcut
    )),
    sections: [
      ...(benefitItems.length ? [{
        title: '会员权益',
        items: benefitItems,
      }] : []),
      MEMBER_HOME_MORE_SERVICE_SECTION,
    ],
  };
}
