import { resolveMockData } from '@/core/services/mock';
import { memberHomeData, type MemberHomeData } from './mock-data';

export type { MemberHomeData, MemberHomeSectionItem, MemberHomeShortcut } from './mock-data';

// 获取会员中心首页数据，后续接真实接口时在这里统一处理字段归一和失败兜底。
export function fetchMemberHomeData() {
  return resolveMockData<MemberHomeData>(memberHomeData);
}
