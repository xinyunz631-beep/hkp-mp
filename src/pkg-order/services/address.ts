import { resolveMockData } from '@/core/services/mock';
import { orderAddresses } from './mock-data';

// 获取地址管理页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchAddressData() {
  return resolveMockData({ addresses: orderAddresses });
}
