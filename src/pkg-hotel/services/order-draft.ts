import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import { getCache, setCache } from '@/core/utils/cache';
import {
  normalizeHotelOccupancy,
  type HotelOccupancy,
  type HotelProductCardData,
  type HotelRatePlanData,
  type HotelStayRange,
} from './model';

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
  selectedCouponId?: string;
  invoiceText: string;
  checkInTimeText: string;
  checkOutTimeText: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateHotelOrderDraftPayload {
  hotelId: string;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  productId: string;
  product: HotelProductCardData;
  ratePlanId?: string;
  stayRange: HotelStayRange;
  occupancy: HotelOccupancy;
  checkInTimeText: string;
  checkOutTimeText: string;
}

export interface SubmitHotelOrderDraftPayload {
  roomCount: number;
  guestNames: string[];
  contact: HotelOrderDraftContact;
  selectedCouponId?: string;
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

// 生成酒店订单草稿编号，只用于跨页面临时恢复，不作为业务订单号。
function createHotelDraftId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HOTEL-DRAFT-${Date.now()}${random}`;
}

// 生成酒店草稿更新时间，便于本地草稿排序和排障。
function createHotelDraftTime() {
  const date = new Date();
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    updatedAt: createHotelDraftTime(),
  };

  saveHotelOrderDrafts(drafts.map((draft) => (draft.id === draftId ? nextDraft : draft)));
  return nextDraft;
}

export function createHotelOrderDraft(payload: CreateHotelOrderDraftPayload) {
  const now = createHotelDraftTime();
  const ratePlan = payload.product.ratePlans.find((item) => item.id === payload.ratePlanId)
    ?? payload.product.ratePlans[0];
  if (!ratePlan) return undefined;
  const occupancy = normalizeHotelOccupancy(payload.occupancy);
  const draft: HotelOrderDraft = {
    id: createHotelDraftId(),
    hotelId: payload.hotelId,
    hotelName: payload.hotelName,
    hotelAddress: payload.hotelAddress,
    hotelPhone: payload.hotelPhone,
    product: payload.product,
    ratePlan,
    stayRange: payload.stayRange,
    occupancy,
    guests: createHotelGuests(occupancy.roomCount),
    contact: {
      name: '',
      mobile: '',
    },
    invoiceText: '如需发票，请到酒店前台办理',
    checkInTimeText: payload.checkInTimeText,
    checkOutTimeText: payload.checkOutTimeText,
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
  if (!params.hotelId || !params.hotelName || !params.hotelAddress || !params.hotelPhone || !params.product || !params.stayRange || !params.occupancy || !params.checkInTimeText || !params.checkOutTimeText) {
    return undefined;
  }

  return createHotelOrderDraft(params as CreateHotelOrderDraftPayload);
}
