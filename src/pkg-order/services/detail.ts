import { resolveMockData } from '@/core/services/mock';
import { getLocalOrder } from '@/core/services/local-order';
import { orderDetailData, type OrderDetailData } from './mock-data';

export type { OrderDetailData } from './mock-data';

// 获取订单详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchDetailData(orderId?: string) {
  const localOrder = getLocalOrder(orderId);
  if (localOrder) {
    return resolveMockData<OrderDetailData>({
      id: localOrder.id,
      statusText: localOrder.statusText,
      paidAmountText: localOrder.paidAmountText,
      title: localOrder.title,
      quantityText: localOrder.quantityText,
      productFields: localOrder.productFields,
      ticketFields: localOrder.ticketFields,
      contactFields: localOrder.contactFields,
      amountFields: localOrder.amountFields,
      orderFields: localOrder.orderFields,
      refundButtonText: localOrder.refundButtonText,
    });
  }

  return resolveMockData<OrderDetailData>(orderDetailData);
}
