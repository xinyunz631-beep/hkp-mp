import { resolveMockData } from '@/core/services/mock';
import { hotelHomeData, type HotelHomeData } from './mock-data';

export type { HotelHomeData } from './mock-data';

// 获取酒店首页数据，后续接真实接口时在这里统一处理字段归一和失败兜底。
export function fetchHotelHomeData() {
  return resolveMockData<HotelHomeData>(hotelHomeData);
}
