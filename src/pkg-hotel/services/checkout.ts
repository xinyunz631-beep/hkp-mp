import { confirmBffOrder, type BffOrderConfirmResponse, type BffOrderItem } from '@/core/services/bff-order-api';
import { fetchBffCouponAvailable, getBffAvailableCouponList } from '@/core/services/bff-coupon-api';
import {
  applyConfirmedCouponFacts,
  buildCheckoutPendingOrder,
  canReuseCheckoutPendingOrder,
  createCheckoutRequestFingerprint,
  getCheckoutPromotionCouponSummaries,
  isCheckoutCouponSummary,
  normalizeCheckoutAmounts,
  restoreCheckoutPendingResult,
  resolveCheckoutCouponState,
  submitAndPayBffOrder,
  toCheckoutCouponSummary,
  type CheckoutSubmitResult,
} from '@/core/services/checkout-flow';
import { centToYuan, formatCurrency, parseNumberLike } from '@/core/utils/money';
import {
  ensureHotelOrderDraft,
  removeHotelOrderDraft,
  updateHotelOrderDraft,
  type SubmitHotelOrderDraftPayload,
} from './order-draft';
import {
  calculateHotelNights,
  formatHotelStayDateText,
  type HotelCheckoutCouponData,
  type HotelCheckoutData,
  type HotelCheckoutDiscountDetailData,
  type HotelOccupancy,
  type HotelStayRange,
} from './model';
import { buildHotelCheckoutOrderRequest } from './checkout-adapter';

export type { HotelCheckoutData } from './model';

export interface FetchHotelCheckoutParams {
  draftId?: string;
  hotelId?: string;
  productId?: string;
  ratePlanId?: string;
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
  roomCount?: number;
  selectedCouponId?: string | null;
}

export interface HotelCheckoutOrderResult extends CheckoutSubmitResult {}

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

function resolveSelectedCouponId(params: FetchHotelCheckoutParams, draft: NonNullable<ReturnType<typeof ensureHotelOrderDraft>>) {
  if (Object.prototype.hasOwnProperty.call(params, 'selectedCouponId')) return params.selectedCouponId;
  return draft.selectedCouponId;
}

function isHotelCheckoutLine(item: BffOrderItem, draft: NonNullable<ReturnType<typeof ensureHotelOrderDraft>>) {
  return item.lineNo === '1'
    || item.itemType === 'HOTEL_ROOM'
    || item.itemId === draft.hotelId
    || item.skuId === draft.ratePlan.id
    || item.attributes?.roomTypeId === draft.product.id
    || item.attributes?.ratePlanId === draft.ratePlan.id;
}

function resolveHotelProductAmount(
  confirmation: BffOrderConfirmResponse,
  draft: NonNullable<ReturnType<typeof ensureHotelOrderDraft>>,
) {
  const line = confirmation.items?.find((item) => isHotelCheckoutLine(item, draft));
  const lineAmountCent = parseNumberLike(line?.amountCent);

  if (typeof lineAmountCent === 'number' && lineAmountCent >= 0) return centToYuan(lineAmountCent);

  return undefined;
}

// 从促销原始记录读取可展示文案，避免把技术字段直接露出到确认单。
function readPromotionRecordString(record: Record<string, unknown>, keys: string[]) {
  const value = keys.map((key) => record[key]).find((item) => typeof item === 'string' && item.trim());
  return typeof value === 'string' ? value.trim() : '';
}

// 将酒店确认单后端优惠拆分转成弹层明细，只展示后端返回了名称和金额的明细。
function buildHotelDiscountDetails(confirmation: BffOrderConfirmResponse): HotelCheckoutDiscountDetailData[] {
  const appliedDiscounts = Array.isArray(confirmation.promotionQuote?.appliedDiscounts)
    ? confirmation.promotionQuote.appliedDiscounts
    : [];
  return appliedDiscounts
    .map((item, index): HotelCheckoutDiscountDetailData | undefined => {
      if (!item || typeof item !== 'object') return undefined;
      const record = item as Record<string, unknown>;
      const discountAmountCent = parseNumberLike(record.discountAmountCent);
      if (typeof discountAmountCent !== 'number' || discountAmountCent <= 0) return undefined;
      const title = readPromotionRecordString(record, ['discountName']);
      if (!title) return undefined;

      return {
        id: readPromotionRecordString(record, ['couponNo', 'discountCode']) || `hotel-discount-${index + 1}`,
        title,
        amountText: `- ${formatCurrency(centToYuan(discountAmountCent))}`,
      };
    })
    .filter((item): item is HotelCheckoutDiscountDetailData => Boolean(item));
}

// 获取酒店确认订单真实数据，价格和优惠以统一订单确认接口为准。
export async function fetchCheckoutData(params: FetchHotelCheckoutParams = {}) {
  const draft = ensureHotelOrderDraft({
    draftId: params.draftId,
  });

  if (!draft) {
    throw new Error('酒店订单信息暂不可用');
  }

  const nights = calculateHotelNights(draft.stayRange);
  const roomCount = params.roomCount || draft.occupancy.roomCount;
  const selectedCouponId = resolveSelectedCouponId(params, draft);
  const confirmation = await confirmBffOrder(buildHotelCheckoutOrderRequest(draft, {
    roomCount,
    selectedCouponId,
  }));
  const amounts = normalizeCheckoutAmounts(confirmation, {}, {
    sceneLabel: '酒店确认单',
    requirePayableAmount: true,
  });
  const availableCouponsResponse = await fetchBffCouponAvailable({
    sceneType: 'HOTEL',
    orderAmountCent: amounts.hasOriginalAmount ? amounts.originalAmountCent : undefined,
    itemIds: [draft.hotelId, draft.product.id],
    skuIds: draft.ratePlan.id,
    checkInDate: draft.stayRange.checkIn,
    checkOutDate: draft.stayRange.checkOut,
  });
  const couponState = resolveCheckoutCouponState(confirmation, selectedCouponId);
  const coupons = applyConfirmedCouponFacts(
    getBffAvailableCouponList(availableCouponsResponse)
      .map((coupon) => toCheckoutCouponSummary(coupon))
      .filter(isCheckoutCouponSummary),
    couponState,
    {
      confirmedCoupons: getCheckoutPromotionCouponSummaries(confirmation),
    },
  ) as HotelCheckoutCouponData[];
  const selectedCoupon = coupons.find((coupon) => coupon.id === couponState.selectedCouponId && coupon.status === 'available');
  const confirmedCouponId = selectedCoupon?.id ?? couponState.selectedCouponId;

  if (Object.prototype.hasOwnProperty.call(params, 'selectedCouponId')) {
    updateHotelOrderDraft(draft.id, { selectedCouponId: confirmedCouponId });
  }

  const productAmount = resolveHotelProductAmount(confirmation, draft)
    ?? (amounts.hasOriginalAmount ? amounts.originalAmount : undefined);

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
    productAmount,
    totalAmount: amounts.payableAmount,
    discountAmount: amounts.hasDiscountAmount ? amounts.discountAmount : 0,
    guestFields: resolveGuestFields(roomCount, draft.guests),
    contactNamePlaceholder: '填写联系人姓名',
    contactNameValue: draft.contact.name,
    mobilePlaceholder: '用于接收确认消息',
    mobileValue: draft.contact.mobile,
    selectedCouponId: confirmedCouponId,
    couponText: selectedCoupon ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}` : '',
    couponNoticeText: couponState.couponNoticeText,
    coupons,
    discountText: amounts.hasDiscountAmount && amounts.discountAmount > 0 ? `已优惠 ¥${amounts.discountAmount.toFixed(2)}` : '',
    discountDetails: buildHotelDiscountDetails(confirmation),
    invoiceText: draft.invoiceText,
    cancelRule: draft.ratePlan.cancelRule,
    checkInTimeText: draft.checkInTimeText,
    checkOutTimeText: draft.checkOutTimeText,
  };

  return checkoutData;
}

// 提交酒店订单并申请真实预支付，页面统一处理微信支付结果。
export async function submitHotelCheckoutOrder(draftId: string, payload: SubmitHotelOrderDraftPayload): Promise<HotelCheckoutOrderResult | undefined> {
  const draft = ensureHotelOrderDraft({ draftId });
  if (!draft) return undefined;

  const nextDraft = updateHotelOrderDraft(draftId, {
    occupancy: {
      ...draft.occupancy,
      roomCount: payload.roomCount,
    },
    guests: payload.guestNames.map((name, index) => ({
      id: `guest-${index + 1}`,
      label: `房间${index + 1}`,
      name,
    })),
    contact: payload.contact,
    selectedCouponId: payload.selectedCouponId ?? undefined,
  }) || draft;

  const request = buildHotelCheckoutOrderRequest(nextDraft, payload);
  const requestFingerprint = createCheckoutRequestFingerprint(request);
  const submitOptions = {
    sceneLabel: '酒店订单',
    onCheckoutCompleted: () => removeHotelOrderDraft(draftId),
  };

  if (canReuseCheckoutPendingOrder(nextDraft.pendingOrder, requestFingerprint)) {
    return restoreCheckoutPendingResult(nextDraft.pendingOrder!, submitOptions);
  }

  if (nextDraft.pendingOrder) {
    updateHotelOrderDraft(draftId, { pendingOrder: undefined });
  }

  const result = await submitAndPayBffOrder(request, submitOptions);
  const pendingOrder = buildCheckoutPendingOrder(result, requestFingerprint);
  if (pendingOrder) {
    updateHotelOrderDraft(draftId, { pendingOrder });
  }

  return result;
}

// 支付预下单成功后回写同一酒店草稿的待支付快照，支付失败重进页面仍继续同一订单。
export function persistHotelCheckoutPendingOrder(
  draftId: string,
  payload: SubmitHotelOrderDraftPayload,
  result: CheckoutSubmitResult,
) {
  const draft = ensureHotelOrderDraft({ draftId });
  if (!draft) return;

  const request = buildHotelCheckoutOrderRequest(draft, payload);
  const pendingOrder = buildCheckoutPendingOrder(result, createCheckoutRequestFingerprint(request));
  if (pendingOrder) {
    updateHotelOrderDraft(draftId, { pendingOrder });
  }
}
