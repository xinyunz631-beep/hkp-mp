import { resolveMockData } from '@/core/services/mock';
import {
  DEFAULT_MEMBER_GROWTH_VALUE,
  DEFAULT_MEMBER_LEVEL_ID,
} from '@/core/utils/member-profile';

export interface MemberGrowthLevel {
  id: string;
  levelNo: number;
  name: string;
  growthThreshold: number;
  themeColor: string;
}

export interface MemberGrowthRuleSection {
  id: string;
  title: string;
  content: string;
}

export interface MemberGrowthRecord {
  id: string;
  title: string;
  value: number;
  time: string;
}

export interface MemberGrowthData {
  backgroundImageSrc: string;
  avatarImageSrc: string;
  member: {
    levelId: string;
    growthValue: number;
  };
  levels: MemberGrowthLevel[];
  levelRuleIntro: string[];
  growthRuleSections: MemberGrowthRuleSection[];
  growthRecords: MemberGrowthRecord[];
}

const memberGrowthData: MemberGrowthData = {
  backgroundImageSrc: '',
  avatarImageSrc: '',
  member: {
    levelId: DEFAULT_MEMBER_LEVEL_ID,
    growthValue: DEFAULT_MEMBER_GROWTH_VALUE,
  },
  levels: [
    {
      id: '8000000000001001',
      levelNo: 1,
      name: '初级会员',
      growthThreshold: 0,
      themeColor: '#f6c24b',
    },
    {
      id: '8000000000001002',
      levelNo: 2,
      name: '中级会员',
      growthThreshold: 6000,
      themeColor: '#20c7d8',
    },
    {
      id: '8000000000001003',
      levelNo: 3,
      name: '高级会员',
      growthThreshold: 30000,
      themeColor: '#c51df4',
    },
  ],
  levelRuleIntro: [
    '用户成长值达到对应升级门槛，立即完成升级。',
    '用户等级暂无有效期限制。',
  ],
  growthRuleSections: [
    {
      id: '8000000000003001',
      title: '消费',
      content: '您在Hello Kitty乐园的消费行为，包括线上商城、门票预定、园内消费及酒店预定都可获得成长值。',
    },
    {
      id: '8000000000003002',
      title: '活跃',
      content: '您在Hello Kitty乐园消费行为，包括注册、评价、转发分享以及邀请好友等，都可获得成长值。',
    },
    {
      id: '8000000000003003',
      title: '任务',
      content: '参与会员中心的任务、问卷答题等，可获得相应成长值。',
    },
    {
      id: '8000000000003004',
      title: '游戏',
      content: '参与会员中心的各种小游戏，达到指定要求，可获得相应成长值。',
    },
  ],
  growthRecords: [
    {
      id: '8000000000004001',
      title: '门票预订',
      value: 920,
      time: '2026-05-28 10:20',
    },
    {
      id: '8000000000004002',
      title: '官方商城消费',
      value: 680,
      time: '2026-05-27 15:36',
    },
    {
      id: '8000000000004003',
      title: '会员任务',
      value: 200,
      time: '2026-05-26 09:12',
    },
  ],
};

// 获取会员等级及成长值数据，真实接口接入后在这里归一字段和空态。
export function fetchMemberGrowthData() {
  return resolveMockData<MemberGrowthData>(memberGrowthData);
}
