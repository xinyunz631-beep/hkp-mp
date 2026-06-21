import { confirmBffOrder, createBffOrder, payBffOrder, type BffOrderUnifiedRequest, type BffOrderPaymentResponse } from '@/core/services/bff-order-api';
import { fetchBffCouponAvailable, type BffAvailableCouponView } from '@/core/services/bff-coupon-api';
import {
  ensureHotelOrderDraft,
  resolveHotelDraftAmount,
  updateHotelOrderDraft,
  type SubmitHotelOrderDraftPayload,
} from './order-draft';
import {
  calculateHotelNights,
  formatHotelStayDateText,
  type HotelCheckoutData,
  type HotelCheckoutCouponData,
  type HotelOccupancy,
  type HotelStayRange,
} from './model';

export type { HotelCheckoutData } from './model';

export interface FetchHotelCheckoutParams {
  draftId?: string;
  hotelId?: string;
  productId?: string;
  ratePlanId?: string;
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
  roomCount?: number;
  selectedCouponId?: string;
}

export interface HotelCheckoutOrderResult {
  orderNo: string;
  payableAmount: number;
  payment?: BffOrderPaymentResponse;
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

function resolveHotelPayableAmountCent(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error('酒店确认单金额暂不可用，请稍后再试');
  }

  return value;
}

function yuanToCent(value: number) {
  return Math.round(value * 100);
}

function centToYuan(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Number((value / 100).toFixed(2));
}

function formatYuan(amountCent = 0) {
  const amount = amountCent / 100;
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number) {
  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent) || discountPercent <= 0) return '';
  const discount = discountPercent > 10 ? discountPercent / 10 : discountPercent;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

function toHotelCoupon(coupon: BffAvailableCouponView): HotelCheckoutCouponData {
  const thresholdAmount = centToYuan(coupon.thresholdAmountCent);
  const discountAmountCent = typeof coupon.discountAmount === 'number' ? coupon.discountAmount : coupon.discountAmountCent;
  const discountAmount = centToYuan(discountAmountCent);
  const validDate = coupon.validEndAt ? coupon.validEndAt.slice(0, 10) : '';
  const available = coupon.available !== false && coupon.status === 'AVAILABLE';

  return {
    id: coupon.couponNo,
    title: coupon.couponName || '酒店优惠券',
    amountText: discountAmount > 0 ? `¥${formatYuan(discountAmountCent)}` : (formatDiscountPercent(coupon.discountPercent) || '优惠券'),
    thresholdText: thresholdAmount > 0 ? `满¥${thresholdAmount.toFixed(2)}可用` : '无门槛',
    validityText: validDate ? `有效期至 ${validDate}` : '按券规则生效',
    status: available ? 'available' : 'disabled',
    tag: available ? (coupon.reason || '可用') : (coupon.unavailableReason || coupon.reason || '暂不可用'),
    minimumAmount: thresholdAmount,
    discountAmount,
  };
}

function resolveSelectedCouponId(params: FetchHotelCheckoutParams, draft: NonNullable<ReturnType<typeof ensureHotelOrderDraft>>) {
  if (Object.prototype.hasOwnProperty.call(params, 'selectedCouponId')) return params.selectedCouponId;
  return draft.selectedCouponId;
}

// 生成酒店统一订单请求，酒店商品价格和库存由后端确认接口最终计算。
function buildHotelUnifiedOrderRequest(
  draft: NonNullable<ReturnType<typeof ensureHotelOrderDraft>>,
  payload?: Partial<SubmitHotelOrderDraftPayload>,
): BffOrderUnifiedRequest {
  const roomCount = Number(payload?.roomCount || draft.occupancy.roomCount || 1);
  const guestNames = payload?.guestNames?.filter(Boolean) || draft.guests.map((item) => item.name).filter(Boolean);
  const hasPayloadCoupon = payload ? Object.prototype.hasOwnProperty.call(payload, 'selectedCouponId') : false;
  const selectedCouponNo = hasPayloadCoupon ? payload?.selectedCouponId : draft.selectedCouponId;
  const selectedCouponNos = selectedCouponNo ? [selectedCouponNo] : undefined;
  return {
    sceneType: 'HOTEL',
    paymentChannel: 'WECHAT',
    freightAmountCent: 0,
    selectedCouponNos,
    contactName: payload?.contact?.name || draft.contact.name,
    contactPhone: payload?.contact?.mobile || draft.contact.mobile,
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
  const confirmation = await confirmBffOrder(buildHotelUnifiedOrderRequest(draft, {
    roomCount,
    selectedCouponId,
  }));
  const availableCouponsResponse = await fetchBffCouponAvailable({
    sceneType: 'HOTEL',
    orderAmountCent: confirmation.originalAmountCent ?? yuanToCent(resolveHotelDraftAmount(draft, roomCount)),
    itemIds: [draft.hotelId, draft.product.id],
    skuIds: draft.ratePlan.id,
    checkInDate: draft.stayRange.checkIn,
    checkOutDate: draft.stayRange.checkOut,
  });
  const payableAmountCent = resolveHotelPayableAmountCent(confirmation.payableAmountCent);
  const totalAmount = Number((payableAmountCent / 100).toFixed(2));
  const discountAmount = Number(((confirmation.discountAmountCent ?? 0) / 100).toFixed(2));
  const coupons = (availableCouponsResponse.coupons ?? []).map(toHotelCoupon);
  const selectedCoupon = coupons.find((coupon) => coupon.id === selectedCouponId);
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
    unitAmount: Number((totalAmount / roomCount).toFixed(2)),
    totalAmount,
    discountAmount,
    guestFields: resolveGuestFields(roomCount, draft.guests),
    contactNamePlaceholder: '填写联系人姓名',
    contactNameValue: draft.contact.name,
    mobilePlaceholder: '用于接收确认消息',
    mobileValue: draft.contact.mobile,
    selectedCouponId,
    couponText: selectedCoupon ? `${selectedCoupon.amountText} ${selectedCoupon.thresholdText}` : '',
    coupons,
    discountText: '',
    invoiceText: draft.invoiceText,
    cancelRule: draft.ratePlan.cancelRule,
    checkInTimeText: draft.checkInTimeText,
    checkOutTimeText: draft.checkOutTimeText,
  };

  return checkoutData;
}

// 提交酒店订单并发起真实支付，失败时直接抛错给页面展示。
export async function submitHotelCheckoutOrder(draftId: string, payload: SubmitHotelOrderDraftPayload): Promise<HotelCheckoutOrderResult | undefined> {
  const draft = ensureHotelOrderDraft({ draftId });
  if (!draft) return undefined;

  updateHotelOrderDraft(draftId, {
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
    selectedCouponId: payload.selectedCouponId,
  });

  const createResult = await createBffOrder(buildHotelUnifiedOrderRequest(draft, payload));
  const orderNo = createResult.order?.orderNo;
  if (!orderNo) {
    throw new Error('订单创建失败：缺少订单编号');
  }

  const createPayableAmountCent = resolveHotelPayableAmountCent(createResult.order?.payableAmountCent);
  if (createPayableAmountCent === 0) {
    return {
      orderNo,
      payableAmount: 0,
    };
  }

  const payment = await payBffOrder(orderNo, 'WECHAT');
  const payableAmountCent = payment.order?.payableAmountCent ?? createPayableAmountCent;
  const payableAmount = Number((resolveHotelPayableAmountCent(payableAmountCent) / 100).toFixed(2));
  return {
    orderNo,
    payableAmount,
    payment,
  };
}
