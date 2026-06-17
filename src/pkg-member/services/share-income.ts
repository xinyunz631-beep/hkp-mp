import { resolveMockData } from '@/core/services/mock';
import { incomeRecords, shareSummaryData } from './mock-data';

// 获取收益明细页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchShareIncomeData() {
  return resolveMockData({ summary: shareSummaryData, records: incomeRecords });
}
