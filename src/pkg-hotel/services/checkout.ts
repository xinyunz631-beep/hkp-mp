import { resolveMockData } from '@/core/services/mock';
import { hotelCheckoutBaseData, hotelHomeData, type HotelCheckoutData } from './mock-data';

export type { HotelCheckoutData } from './mock-data';

// 获取酒店确认订单页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCheckoutData(roomId?: string) {
  const activeHotel = hotelHomeData.hotels[0];
  const room = activeHotel.rooms.find((item) => item.id === roomId) ?? activeHotel.rooms[0];

  return resolveMockData<HotelCheckoutData>({
    ...hotelCheckoutBaseData,
    roomTitle: room.title,
    roomTagsText: room.tagsText.replace(/\s+/g, '｜'),
    totalAmount: room.price + 120,
  });
}
