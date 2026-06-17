import { resolveMockData } from '@/core/services/mock';
import { shareSummaryData } from './mock-data';

// 获取申请提现页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchWithdrawData() {
  return resolveMockData({
    availableIncome: shareSummaryData.availableIncome,
    methods: ['微信零钱'],
  });
}
