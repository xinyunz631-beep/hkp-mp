import { resolveMockData } from '@/core/services/mock';
import { inviteRecords } from './mock-data';

// 获取邀请明细页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchShareInviteData() {
  return resolveMockData({ records: inviteRecords });
}
