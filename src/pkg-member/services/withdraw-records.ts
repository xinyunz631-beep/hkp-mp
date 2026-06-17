import { resolveMockData } from '@/core/services/mock';
import { withdrawRecords } from './mock-data';

// 获取提现记录页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchWithdrawRecordsData() {
  return resolveMockData({ records: withdrawRecords });
}
