import { fetchHotelHomeFromBff } from './bff-api';
import type { HotelHomeData, HotelOccupancy, HotelStayRange } from './model';

export type { HotelHomeData } from './model';

// 获取酒店首页真实数据，页面只消费归一后的酒店/房型/房态模型。
export function fetchHotelHomeData(params: {
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
  filterKey?: string;
} = {}) {
  if (!params.stayRange || !params.occupancy) {
    throw new Error('缺少酒店查询条件');
  }
  return fetchHotelHomeFromBff({
    stayRange: params.stayRange,
    occupancy: params.occupancy,
    filterKey: params.filterKey,
  });
}
