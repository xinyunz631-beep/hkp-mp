import { fetchBffOrderAftersaleTypes } from '@/core/services/bff-order-api';
import { normalizeText, toOrderSummary } from './bff-adapter';
import type { OrderAftersaleTypeData } from './model';

export type { OrderAftersaleTypeData } from './model';

export async function fetchAftersaleTypeData(orderId?: string): Promise<OrderAftersaleTypeData> {
  if (!orderId) throw new Error('缺少订单编号');

  const data = await fetchBffOrderAftersaleTypes(orderId);

  return {
    order: toOrderSummary(data.order),
    tipText: normalizeText(data.tipText),
    types: (data.types || [])
      .map((item) => ({
        key: normalizeText(item.key),
        title: normalizeText(item.title),
        desc: normalizeText(item.desc),
        amountText: normalizeText(item.amountText),
        tagText: normalizeText(item.tagText) || undefined,
      }))
      .filter((item) => item.key && item.title),
  };
}
