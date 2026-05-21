import { resolveMockData } from '@/core/services/mock';
import {
  ensureHotelOrderDraft,
  resolveHotelDraftAmount,
  submitHotelOrderDraft,
  type SubmitHotelOrderDraftPayload,
} from './order-draft';
import {
  calculateHotelNights,
  createDefaultHotelOccupancy,
  createDefaultHotelStayRange,
  formatHotelStayDateText,
  type HotelCheckoutData,
  type HotelOccupancy,
  type HotelStayRange,
} from './mock-data';

export type { HotelCheckoutData } from './mock-data';

export interface FetchHotelCheckoutParams {
  draftId?: string;
  hotelId?: string;
  productId?: string;
  ratePlanId?: string;
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
}

function resolveGuestFields(roomCount: number, guests: Array<{ id: string; label: string; name: string }>) {
  return Array.from({ length: roomCount }, (_, index) => {
    const guest = guests[index];
    return {
      id: `guest-${index + 1}`,
      label: `房间${index + 1}`,
      placeholder: '填写实际入住人姓名',
      value: guest?.name ?? '',
    };
  });
}

// 获取酒店确认订单页面数据，后续接真实接口时保持以 draftId 恢复订单上下文。
export function fetchCheckoutData(params: FetchHotelCheckoutParams = {}) {
  const draft = ensureHotelOrderDraft({
    ...params,
    stayRange: params.stayRange ?? createDefaultHotelStayRange(),
    occupancy: params.occupancy ?? createDefaultHotelOccupancy(),
  });

  if (!draft) {
    throw new Error('酒店订单信息暂不可用');
  }

  const nights = calculateHotelNights(draft.stayRange);
  const roomCount = draft.occupancy.roomCount;
  const totalAmount = resolveHotelDraftAmount(draft, roomCount);
  const checkoutData: HotelCheckoutData = {
    draftId: draft.id,
    hotelId: draft.hotelId,
    hotelName: draft.hotelName,
    hotelAddress: draft.hotelAddress,
    productId: draft.product.id,
    productTitle: draft.product.title,
    productSubtitle: draft.product.subtitle,
    productImageSrc: draft.product.imageSrc,
    ratePlanId: draft.ratePlan.id,
    ratePlanTitle: draft.ratePlan.title,
    roomTagsText: draft.product.tagsText,
    stayDateText: formatHotelStayDateText(draft.stayRange),
    nightsText: `共${nights}晚`,
    checkIn: draft.stayRange.checkIn,
    checkOut: draft.stayRange.checkOut,
    occupancy: draft.occupancy,
    roomCount,
    maxRoomCount: Math.min(3, Math.max(draft.ratePlan.stock, 1)),
    unitAmount: draft.ratePlan.price * nights,
    totalAmount,
    discountAmount: 0,
    guestFields: resolveGuestFields(roomCount, draft.guests),
    contactNamePlaceholder: '填写联系人姓名',
    contactNameValue: draft.contact.name,
    mobilePlaceholder: '用于接收确认消息',
    mobileValue: draft.contact.mobile,
    couponText: '',
    discountText: '',
    invoiceText: draft.invoiceText,
    cancelRule: draft.ratePlan.cancelRule,
    checkInTimeText: draft.checkInTimeText,
    checkOutTimeText: draft.checkOutTimeText,
  };

  return resolveMockData<HotelCheckoutData>(checkoutData);
}

export function submitHotelCheckoutOrder(draftId: string, payload: SubmitHotelOrderDraftPayload) {
  return submitHotelOrderDraft(draftId, payload);
}
