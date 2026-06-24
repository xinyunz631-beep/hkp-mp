import {
  fetchBffOrderAftersales,
  fetchBffOrderDetail,
} from '@/core/services/bff-order-api';
import { mergeOrderSummaryWithDetail, normalizeText, toOrderSummary } from './bff-adapter';
import { mapOrderCouponFields } from './coupon-facts';
import type { OrderAftersaleListData } from './model';
import { formatOrderDateTime } from './time';

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
  const routeOrderDetail = orderDetailResult.status === 'fulfilled' ? orderDetailResult.value : undefined;

  return {
    tabs: (data.tabs || [])
      .map((tab) => ({
        key: normalizeText(tab.key),
        text: normalizeText(tab.text),
        count: typeof tab.count === 'number' ? tab.count : undefined,
      }))
      .filter((tab) => tab.key && tab.text),
    records: (data.records || [])
      .map((record) => {
        const order = toOrderSummary(record.order);
        const recordId = normalizeText(record.id)
          || normalizeText(record.serviceNo)
          || order.id;
        const enhancedOrder = routeOrderDetail && routeOrderDetail.orderNo === order.id
          ? mergeOrderSummaryWithDetail(order, routeOrderDetail)
          : order;

        return {
          id: recordId,
          tabKey: normalizeText(record.tabKey),
          serviceNo: normalizeText(record.serviceNo),
          typeText: normalizeText(record.typeText),
          statusText: normalizeText(record.statusText),
          statusDesc: normalizeText(record.statusDesc),
          amountText: normalizeText(record.amountText),
          createdAt: formatOrderDateTime(record.createdAt),
          buttonText: normalizeText(record.buttonText),
          order: enhancedOrder,
        };
      })
      .filter((record) => record.id && record.order.id),
    couponFields: routeOrderDetail
      ? mapOrderCouponFields(routeOrderDetail)
      : [],
    unavailableReason: normalizeText(data.unavailableReason) || undefined,
  };
}
