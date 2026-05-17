import { resolveMockData } from '@/core/services/mock';
import { ticketCheckoutData, ticketDates, type TicketCheckoutData } from './mock-data';
import { getTicketOrderDraft, type TicketOrderDraft } from './order-draft';

export type { TicketCheckoutData } from './mock-data';
export interface TicketCheckoutPageData extends TicketCheckoutData {
  draft?: TicketOrderDraft;
  dates: typeof ticketDates;
}

// 获取门票确认订单页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCheckoutData(draftId?: string) {
  const draft = getTicketOrderDraft(draftId);

  return resolveMockData<TicketCheckoutPageData>({
    ...ticketCheckoutData,
    parkName: draft?.parkName ?? ticketCheckoutData.parkName,
    ticketItem: {
      ...ticketCheckoutData.ticketItem,
      title: draft?.products[0]?.title ?? ticketCheckoutData.ticketItem.title,
      quantity: draft?.products.reduce((total, product) => total + product.quantity, 0) ?? ticketCheckoutData.ticketItem.quantity,
      travelDate: draft?.selectedDate ?? ticketCheckoutData.ticketItem.travelDate,
      price: draft?.products.reduce((total, product) => total + product.price * product.quantity, 0) ?? ticketCheckoutData.ticketItem.price,
    },
    discountAmount: draft?.coupons.find((coupon) => coupon.id === draft.selectedCouponId)?.discountAmount ?? ticketCheckoutData.discountAmount,
    couponText: draft?.coupons.find((coupon) => coupon.id === draft.selectedCouponId)?.amountText ?? ticketCheckoutData.couponText,
    contact: {
      ...ticketCheckoutData.contact,
      ...(draft?.contact ?? {}),
    },
    draft,
    dates: ticketDates,
  });
}
