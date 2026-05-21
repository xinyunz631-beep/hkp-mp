import { resolveMockData } from '@/core/services/mock';
import {
  resolveHotelRoomDetailData,
  type HotelOccupancy,
  type HotelRoomDetailData,
  type HotelStayRange,
} from './mock-data';

export type { HotelRoomDetailData } from './mock-data';

// 获取房间详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchRoomDetailData(params: {
  hotelId?: string;
  productId?: string;
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
} = {}) {
  return resolveMockData<HotelRoomDetailData>(resolveHotelRoomDetailData(params));
}
