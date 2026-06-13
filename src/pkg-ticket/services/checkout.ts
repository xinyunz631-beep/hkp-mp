import { resolveMockData } from '@/core/services/mock';
import { ticketCheckoutData, ticketDates, type TicketCheckoutData } from './mock-data';
import {
  createTicketOrderTravelers,
  getTicketOrderDraft,
  type TicketOrderDraft,
  type TicketOrderTraveler,
} from './order-draft';

export type { TicketCheckoutData } from './mock-data';
export interface TicketCheckoutPageData extends TicketCheckoutData {
  draft?: TicketOrderDraft;
  draftMissing: boolean;
  dates: typeof ticketDates;
  travelers: TicketOrderTraveler[];
}

// 计算确认订单中可抵扣的优惠金额，避免未满足门槛的券在支付时被误用。
function resolveCheckoutDiscountAmount(draft?: TicketOrderDraft) {
  if (!draft) return ticketCheckoutData.discountAmount;

  const productsAmount = draft.products.reduce((total, product) => total + product.price * product.quantity, 0);
  const addonAmount = ticketCheckoutData.addonItem.price * (draft.addonQuantity ?? 0);
  const selectedCoupon = draft.coupons.find((coupon) => coupon.id === draft.selectedCouponId);

  return selectedCoupon && productsAmount + addonAmount >= selectedCoupon.minimumAmount
    ? selectedCoupon.discountAmount
    : 0;
}

// 获取门票确认订单页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCheckoutData(draftId?: string) {
  const draft = getTicketOrderDraft(draftId);
  const discountAmount = resolveCheckoutDiscountAmount(draft);
  const travelers = draft?.travelers?.length
    ? draft.travelers
    : createTicketOrderTravelers(draft?.products ?? [], draft?.contact);

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
    addonItem: {
      ...ticketCheckoutData.addonItem,
      quantity: draft?.addonQuantity ?? 0,
    },
    discountAmount,
    couponText: draft?.coupons.find((coupon) => coupon.id === draft.selectedCouponId)?.amountText ?? ticketCheckoutData.couponText,
    payButtonText: '提交订单',
    contact: {
      ...ticketCheckoutData.contact,
      ...(draft?.contact ?? {}),
    },
    travelers,
    draft,
    draftMissing: !draft,
    dates: ticketDates,
  });
}
