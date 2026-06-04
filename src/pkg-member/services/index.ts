import { fetchBffCrmCenter } from '@/core/services/bff-crm-api';
import { withServiceFallback } from '@/core/services/mock';
import { memberHomeData, type MemberHomeData } from './mock-data';

export type { MemberHomeData, MemberHomeSectionItem, MemberHomeShortcut } from './mock-data';

// 获取会员中心首页数据，后续接真实接口时在这里统一处理字段归一和失败兜底。
export function fetchMemberHomeData() {
  return withServiceFallback(async () => {
    const center = await fetchBffCrmCenter();
    const profile = center.profile;
    const nextLevelText = profile.nextLevelGrowth
      ? `再获得 ${Math.max(profile.nextLevelGrowth - (profile.growthValue || 0), 0)} 成长值即可升级${profile.nextLevelName || '下一等级'}`
      : `${profile.levelName || '会员'}权益已生效`;
    const benefitItems = center.benefits.map((benefit) => ({
      key: benefit.benefitNo,
      title: benefit.benefitTitle,
      desc: benefit.benefitSummary || benefit.highlightText || '会员专属权益',
      action: 'memberGrowth' as const,
    }));

    return {
      ...memberHomeData,
      points: profile.growthValue || memberHomeData.points,
      growthText: nextLevelText,
      couponCount: profile.couponCount ?? memberHomeData.couponCount,
      couponHintText: profile.couponCount ? `当前有 ${profile.couponCount} 张可用券` : memberHomeData.couponHintText,
      shortcuts: memberHomeData.shortcuts.map((shortcut) => (
        shortcut.key === 'coupons'
          ? { ...shortcut, value: `${profile.couponCount ?? memberHomeData.couponCount} 张可用` }
          : shortcut
      )),
      sections: memberHomeData.sections.map((section, index) => (
        index === 0 && benefitItems.length > 0 ? { ...section, items: benefitItems } : section
      )),
    };
  }, memberHomeData);
}
