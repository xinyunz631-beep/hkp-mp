import {
  fetchBffOrderAftersales,
  fetchBffOrderDetail,
} from '@/core/services/bff-order-api';
import { normalizeText, toOrderSummary } from './bff-adapter';
import { mapOrderCouponFields } from './coupon-facts';
import type { OrderAftersaleListData } from './model';

export type { OrderAftersaleListData } from './model';

interface FetchAftersaleListOptions {
  orderId?: string;
}

export async function fetchAftersaleListData(
  options: FetchAftersaleListOptions = {},
): Promise<OrderAftersaleListData> {
  const [listResult, orderDetailResult] = await Promise.allSettled([
    fetchBffOrderAftersales(),
    options.orderId
      ? fetchBffOrderDetail(options.orderId, {
        showErrorToast: false,
      })
      : Promise.resolve(undefined),
  ]);

  if (listResult.status !== 'fulfilled') throw listResult.reason;

  const data = listResult.value;

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
    couponFields: orderDetailResult.status === 'fulfilled' && orderDetailResult.value
      ? mapOrderCouponFields(orderDetailResult.value)
      : [],
    unavailableReason: normalizeText(data.unavailableReason) || undefined,
  };
}
