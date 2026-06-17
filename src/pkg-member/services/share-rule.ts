import { resolveMockData } from '@/core/services/mock';
import { shareSummaryData } from './mock-data';

// 获取分享规则页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchShareRuleData() {
  return resolveMockData({ rules: shareSummaryData.rules });
}
