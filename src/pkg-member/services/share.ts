import { resolveMockData } from '@/core/services/mock';
import { incomeRecords, inviteRecords, shareSummaryData } from './mock-data';

// 获取分享收益页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchShareData() {
  return resolveMockData({
    summary: shareSummaryData,
    incomes: incomeRecords,
    invites: inviteRecords,
  });
}
