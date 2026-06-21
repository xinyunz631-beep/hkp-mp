import { fetchRoomDetailFromBff } from './bff-api';
import type { HotelOccupancy, HotelRoomDetailData, HotelStayRange } from './model';

export type { HotelRoomDetailData } from './model';

// 获取房间详情真实数据，接口失败时交给页面异常态，不回退本地静态数据。
export function fetchRoomDetailData(params: {
  hotelId?: string;
  productId?: string;
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
} = {}) {
  if (!params.stayRange || !params.occupancy) {
    throw new Error('缺少房型查询条件');
  }
  return fetchRoomDetailFromBff({
    hotelId: params.hotelId,
    productId: params.productId,
    stayRange: params.stayRange,
    occupancy: params.occupancy,
    filterKey: undefined,
  });
}
