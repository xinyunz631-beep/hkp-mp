import { fetchBffOrderAftersales } from '@/core/services/bff-order-api';
import { normalizeText, toOrderSummary } from './bff-adapter';
import type { OrderAftersaleListData } from './model';

export type { OrderAftersaleListData } from './model';

export async function fetchAftersaleListData(): Promise<OrderAftersaleListData> {
  const data = await fetchBffOrderAftersales();

  return {
    tabs: (data.tabs || []).map((tab, index) => ({
      key: normalizeText(tab.key) || `aftersale-tab-${index}`,
      text: normalizeText(tab.text),
      count: typeof tab.count === 'number' ? tab.count : undefined,
    })),
    records: (data.records || []).map((record, index) => ({
      id: normalizeText(record.id) || `aftersale-record-${index}`,
      tabKey: normalizeText(record.tabKey),
      serviceNo: normalizeText(record.serviceNo),
      typeText: normalizeText(record.typeText),
      statusText: normalizeText(record.statusText),
      statusDesc: normalizeText(record.statusDesc),
      amountText: normalizeText(record.amountText),
      createdAt: normalizeText(record.createdAt),
      buttonText: normalizeText(record.buttonText),
      order: toOrderSummary(record.order),
    })),
    unavailableReason: normalizeText(data.unavailableReason) || undefined,
  };
}
