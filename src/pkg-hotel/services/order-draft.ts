import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import {
  createLocalOrderId,
  createLocalOrderTime,
  saveLocalOrder,
  type LocalOrderRecord,
} from '@/core/services/local-order';
import { getCache, setCache } from '@/core/utils/cache';
import {
  calculateHotelNights,
  createDefaultHotelOccupancy,
  createDefaultHotelStayRange,
  findHotelProduct,
  formatHotelStayDateText,
  normalizeHotelOccupancy,
  type HotelOccupancy,
  type HotelProductCardData,
  type HotelRatePlanData,
  type HotelStayRange,
} from './mock-data';

export interface HotelOrderDraftGuest {
  id: string;
  label: string;
  name: string;
}

export interface HotelOrderDraftContact {
  name: string;
  mobile: string;
}

export interface HotelOrderDraft {
  id: string;
  hotelId: string;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  product: HotelProductCardData;
  ratePlan: HotelRatePlanData;
  stayRange: HotelStayRange;
  occupancy: HotelOccupancy;
  guests: HotelOrderDraftGuest[];
  contact: HotelOrderDraftContact;
  invoiceText: string;
  checkInTimeText: string;
  checkOutTimeText: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotelOrderDraftPayload {
  hotelId: string;
  productId: string;
  ratePlanId?: string;
  stayRange: HotelStayRange;
  occupancy: HotelOccupancy;
}

export interface SubmitHotelOrderDraftPayload {
  roomCount: number;
  guestNames: string[];
  contact: HotelOrderDraftContact;
  totalAmount: number;
  discountAmount: number;
}

function listHotelOrderDrafts() {
  const cachedDrafts = getCache<unknown>(MINI_STORAGE_KEYS.hotelOrderDrafts);

  if (Array.isArray(cachedDrafts)) {
    return cachedDrafts.filter((draft): draft is HotelOrderDraft => Boolean(draft?.id));
  }

  if (cachedDrafts && typeof cachedDrafts === 'object' && 'id' in cachedDrafts) {
    return [cachedDrafts as HotelOrderDraft];
  }

  return [];
}

function saveHotelOrderDrafts(drafts: HotelOrderDraft[]) {
  setCache(MINI_STORAGE_KEYS.hotelOrderDrafts, drafts);
}

function createHotelGuests(roomCount: number, seedGuests: HotelOrderDraftGuest[] = []) {
  return Array.from({ length: roomCount }, (_, index) => {
    const roomIndexText = String(index + 1);
    return {
      id: `guest-${index + 1}`,
      label: `房间${roomIndexText}`,
      name: seedGuests[index]?.name ?? '',
    };
  });
}

function calculateDraftAmount(draft: HotelOrderDraft, roomCount = draft.occupancy.roomCount) {
  return Number((draft.ratePlan.price * calculateHotelNights(draft.stayRange) * roomCount).toFixed(2));
}

export function getHotelOrderDraft(draftId?: string) {
  if (!draftId) return undefined;
  return listHotelOrderDrafts().find((draft) => draft.id === draftId);
}

export function updateHotelOrderDraft(draftId: string, patch: Partial<HotelOrderDraft>) {
  const drafts = listHotelOrderDrafts();
  const current = drafts.find((draft) => draft.id === draftId);
  if (!current) return undefined;

  const nextDraft: HotelOrderDraft = {
    ...current,
    ...patch,
    updatedAt: createLocalOrderTime(),
  };

  saveHotelOrderDrafts(drafts.map((draft) => (draft.id === draftId ? nextDraft : draft)));
  return nextDraft;
}

export function createHotelOrderDraft(payload: CreateHotelOrderDraftPayload) {
  const matched = findHotelProduct({
    hotelId: payload.hotelId,
    productId: payload.productId,
    stayRange: payload.stayRange,
    occupancy: payload.occupancy,
  }) ?? findHotelProduct({});

  if (!matched) return undefined;

  const now = createLocalOrderTime();
  const ratePlan = matched.product.ratePlans.find((item) => item.id === payload.ratePlanId)
    ?? matched.product.ratePlans[0];
  const occupancy = normalizeHotelOccupancy(payload.occupancy);
  const draft: HotelOrderDraft = {
    id: createLocalOrderId('HOTEL-DRAFT-'),
    hotelId: matched.hotel.id,
    hotelName: matched.hotel.heroTitle,
    hotelAddress: matched.hotel.address,
    hotelPhone: matched.hotel.phoneNumber,
    product: matched.product,
    ratePlan,
    stayRange: payload.stayRange,
    occupancy,
    guests: createHotelGuests(occupancy.roomCount),
    contact: {
      name: '',
      mobile: '',
    },
    invoiceText: '如需发票，请到酒店前台办理',
    checkInTimeText: matched.hotel.checkInTimeText,
    checkOutTimeText: matched.hotel.checkOutTimeText,
    createdAt: now,
    updatedAt: now,
  };
  const drafts = listHotelOrderDrafts().filter((item) => item.id !== draft.id);
  saveHotelOrderDrafts([draft, ...drafts]);

  return draft;
}

export function ensureHotelOrderDraft(params: Partial<CreateHotelOrderDraftPayload> & { draftId?: string }) {
  const existingDraft = getHotelOrderDraft(params.draftId);
  if (existingDraft) return existingDraft;

  const stayRange = params.stayRange ?? createDefaultHotelStayRange();
  const occupancy = params.occupancy ?? createDefaultHotelOccupancy();
  const matched = findHotelProduct({
    hotelId: params.hotelId,
    productId: params.productId,
    stayRange,
    occupancy,
  });

  if (!matched) return undefined;

  return createHotelOrderDraft({
    hotelId: matched.hotel.id,
    productId: matched.product.id,
    ratePlanId: params.ratePlanId,
    stayRange,
    occupancy,
  });
}

export function submitHotelOrderDraft(draftId: string, payload: SubmitHotelOrderDraftPayload) {
  const draft = getHotelOrderDraft(draftId);
  if (!draft) return undefined;

  const now = createLocalOrderTime();
  const orderId = createLocalOrderId('HOTEL-');
  const stayDateText = formatHotelStayDateText(draft.stayRange);
  const nightsText = `共${calculateHotelNights(draft.stayRange)}晚`;
  const guestSummary = payload.guestNames.length > 0 ? payload.guestNames.join('、') : '入住人待补充';
  const productImageSrc = draft.product.imageSrc;
  const hasDiscount = payload.discountAmount > 0;

  const record: LocalOrderRecord = {
    id: orderId,
    source: 'hotel',
    tabKey: 'pendingReceive',
    dateText: stayDateText,
    statusText: '待入住',
    paidAmountText: `¥${payload.totalAmount.toFixed(2)}`,
    title: draft.product.title,
    quantityText: `x${payload.roomCount}`,
    totalText: `共${payload.roomCount}间 合计:¥${payload.totalAmount.toFixed(2)}`,
    productFields: [
      { label: '酒店名称', value: draft.hotelName },
      { label: '预订内容', value: draft.product.title },
      { label: '房型信息', value: draft.product.tagsText },
      { label: '入住日期', value: `${stayDateText} ${nightsText}` },
    ],
    ticketFields: [
      { label: '酒店地址', value: draft.hotelAddress },
      { label: '入住时间', value: `${draft.checkInTimeText}，${draft.checkOutTimeText}` },
      { label: '取消规则', value: draft.ratePlan.cancelRule },
    ],
    contactFields: [
      { label: '联系人', value: payload.contact.name },
      { label: '手机号', value: payload.contact.mobile },
      { label: '入住人', value: guestSummary },
    ],
    amountFields: [
      { label: '房费', value: `¥${(payload.totalAmount + payload.discountAmount).toFixed(2)}` },
      ...(hasDiscount ? [{ label: '优惠金额', value: `- ¥${payload.discountAmount.toFixed(2)}` }] : []),
      { label: '实付款', value: `¥${payload.totalAmount.toFixed(2)}` },
    ],
    orderFields: [
      { label: '订单编号', value: orderId },
      { label: '下单时间', value: now },
      { label: '支付方式', value: '微信支付' },
      { label: '支付时间', value: now },
    ],
    refundButtonText: '申请退款',
    homeItems: [
      {
        id: orderId,
        title: draft.product.title,
        subtitle: `${stayDateText} ${nightsText}`,
        imageSrc: productImageSrc,
        quantity: payload.roomCount,
        priceText: `¥ ${payload.totalAmount.toFixed(2)}`,
        actionText: '查看详情',
      },
    ],
    createdAt: now,
  };

  updateHotelOrderDraft(draftId, {
    occupancy: normalizeHotelOccupancy({
      ...draft.occupancy,
      roomCount: payload.roomCount,
    }),
    guests: createHotelGuests(payload.roomCount, payload.guestNames.map((name, index) => ({
      id: `guest-${index + 1}`,
      label: `房间${index + 1}`,
      name,
    }))),
    contact: payload.contact,
  });

  return saveLocalOrder(record);
}

export function resolveHotelDraftAmount(draft: HotelOrderDraft, roomCount = draft.occupancy.roomCount) {
  return calculateDraftAmount(draft, roomCount);
}
