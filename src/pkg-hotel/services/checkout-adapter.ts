import type { BffOrderUnifiedRequest } from '@/core/services/bff-order-api';
import { buildSelectedCouponNos } from '@/core/services/checkout-flow';
import {
  ensureHotelOrderDraft,
  type SubmitHotelOrderDraftPayload,
} from './order-draft';

export type HotelCheckoutDraft = NonNullable<ReturnType<typeof ensureHotelOrderDraft>>;

export interface HotelCheckoutRequestPayload extends Partial<Omit<SubmitHotelOrderDraftPayload, 'selectedCouponId'>> {
  selectedCouponId?: string | null;
}

// 生成酒店统一订单请求，房型、价规、入住日期和入住人由酒店 adapter 独立承接。
export function buildHotelCheckoutOrderRequest(
  draft: HotelCheckoutDraft,
  payload: HotelCheckoutRequestPayload = {},
): BffOrderUnifiedRequest {
  const roomCount = Number(payload.roomCount || draft.occupancy.roomCount || 1);
  const guestNames = payload.guestNames?.filter(Boolean) || draft.guests.map((item) => item.name).filter(Boolean);
  const hasPayloadCoupon = Object.prototype.hasOwnProperty.call(payload, 'selectedCouponId');
  const selectedCouponId = hasPayloadCoupon ? payload.selectedCouponId : draft.selectedCouponId;

  return {
    sceneType: 'HOTEL',
    paymentChannel: 'WECHAT',
    selectedCouponNos: buildSelectedCouponNos(selectedCouponId),
    contactName: payload.contact?.name || draft.contact.name,
    contactPhone: payload.contact?.mobile || draft.contact.mobile,
    context: {
      checkInDate: draft.stayRange.checkIn,
      checkOutDate: draft.stayRange.checkOut,
      roomCount: String(roomCount),
      guestNames: guestNames.join('、'),
      hotelName: draft.hotelName,
      roomTitle: draft.product.title,
      ratePlanTitle: draft.ratePlan.title,
    },
    items: [
      {
        lineNo: '1',
        itemId: draft.hotelId,
        skuId: draft.ratePlan.id,
        itemType: 'HOTEL_ROOM',
        quantity: roomCount,
        attributes: {
          roomTypeId: draft.product.id,
          ratePlanId: draft.ratePlan.id,
          checkInDate: draft.stayRange.checkIn,
          checkOutDate: draft.stayRange.checkOut,
        },
      },
    ],
  };
}
