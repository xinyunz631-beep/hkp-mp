import { resolveMockData } from '@/core/services/mock';
import { hotelRoomDetails, type HotelRoomDetailData } from './mock-data';

export type { HotelRoomDetailData } from './mock-data';

// 获取房间详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchRoomDetailData(roomId?: string) {
  const matchedRoom = hotelRoomDetails.find((room) => room.id === roomId) ?? hotelRoomDetails[0];
  return resolveMockData<HotelRoomDetailData>(matchedRoom);
}
