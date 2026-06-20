import { fetchBffOrderLogistics } from '@/core/services/bff-order-api';
import { toLogisticsData } from './bff-adapter';
import type { OrderLogisticsData } from './model';

export type { OrderLogisticsData } from './model';

// 物流详情统一走商城订单物流 BFF，由后端负责从真实订单上下文整理结构化字段。
export async function fetchLogisticsData(orderId?: string): Promise<OrderLogisticsData> {
  if (!orderId) throw new Error('缺少订单编号');
  const data = await fetchBffOrderLogistics(orderId);
  return toLogisticsData(data);
}
