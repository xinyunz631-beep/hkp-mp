import { confirmBffOrder, type BffOrderConfirmResponse } from '@/core/services/bff-order-api';
import { fetchBffCouponAvailable, type BffAvailableCouponView } from '@/core/services/bff-coupon-api';
import { centToYuan, parseNumberLike, yuanToCent } from '@/core/utils/money';
import { quoteBffTickets } from './ticket-api';
import type { HkpDateOption } from '@/core/types/hkp';
import {
  buildTicketUnifiedOrderRequest,
  createTicketOrderTravelers,
  getTicketOrderDraft,
  type TicketOrderDraft,
  type TicketOrderTraveler,
} from './order-draft';
import type { TicketCoupon } from './ticket-booking';

export interface TicketCheckoutTicketItem {
  title: string;
  quantity: number;
  travelDate: string;
  tagText: string;
  price: number;
}

export interface TicketCheckoutAddonItem {
  merchantTitle: string;
  productTitle: string;
  noteText: string;
  quantity: number;
  price: number;
}

export interface TicketCheckoutContactInfo {
  name: string;
  mobile: string;
  idCard: string;
  mobilePlaceholder: string;
  idCardPlaceholder: string;
  helperText: string;
  errorText: string;
}

export interface TicketCheckoutData {
  parkName: string;
  ticketItem: TicketCheckoutTicketItem;
  addonItem: TicketCheckoutAddonItem;
  contact: TicketCheckoutContactInfo;
  discountText: string;
  couponText: string;
  couponNoticeText?: string;
  discountAmount: number;
  payableAmount: number;
  payButtonText: string;
}

export interface TicketCheckoutPageData extends TicketCheckoutData {
  draft?: TicketOrderDraft;
  draftMissing: boolean;
  dates: HkpDateOption[];
  travelers: TicketOrderTraveler[];
}

// 生成当前确认单可展示的票务日期，真实可售性由后端确认接口校验。
function buildCheckoutDates(selectedDate: string): HkpDateOption[] {
  return [
    {
      date: selectedDate,
      title: '已选日期',
      subtitle: '待确认',
    },
  ];
}

function formatYuan(amountCent: unknown = 0) {
  const amount = centToYuan(amountCent);
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number | string) {
  const normalizedDiscountPercent = parseNumberLike(discountPercent);
  if (typeof normalizedDiscountPercent !== 'number' || normalizedDiscountPercent <= 0) return '';
  const discount = normalizedDiscountPercent > 10 ? normalizedDiscountPercent / 10 : normalizedDiscountPercent;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

function calculateDraftOrderAmountCent(draft: TicketOrderDraft) {
  return draft.products.reduce((total, product) => {
    const unitPriceCent = product.unitPriceCent ?? yuanToCent(product.price);
    return total + unitPriceCent * product.quantity;
  }, 0);
}

// 归一化后端返回的券号数组，避免空值进入用券事实判断。
function normalizeCouponNos(couponNos?: string[]) {
  return (couponNos ?? []).map((couponNo) => String(couponNo || '').trim()).filter(Boolean);
}

function couponNosFromUnknown(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((couponNo) => String(couponNo || '').trim()).filter(Boolean);
}

function appliedCouponNosFromPromotionQuote(confirmation: BffOrderConfirmResponse) {
  const quote = confirmation.promotionQuote;
  if (!quote || typeof quote !== 'object') return [];

  const appliedDiscounts = (quote as { appliedDiscounts?: unknown }).appliedDiscounts;
  if (!Array.isArray(appliedDiscounts)) return [];

  return appliedDiscounts
    .map((discount) => {
      if (!discount || typeof discount !== 'object') return '';
      return String((discount as { couponNo?: unknown }).couponNo || '').trim();
    })
    .filter(Boolean);
}

function selectedCouponNosFromPromotionQuote(confirmation: BffOrderConfirmResponse) {
  const quote = confirmation.promotionQuote;
  if (!quote || typeof quote !== 'object') return [];

  const availableCoupons = (quote as { availableCoupons?: unknown }).availableCoupons;
  if (!Array.isArray(availableCoupons)) return [];

  return availableCoupons
    .filter((coupon) => Boolean(coupon && typeof coupon === 'object' && (coupon as { selected?: unknown }).selected))
    .map((coupon) => String((coupon as { couponNo?: unknown }).couponNo || '').trim())
    .filter(Boolean);
}

// 以后端确认结果为唯一事实源，只有被 applied 的券才允许回显为已选。
function resolveConfirmedCouponId(confirmation: BffOrderConfirmResponse, requestedCouponId?: string) {
  const appliedCouponNos = [
    ...normalizeCouponNos(confirmation.appliedCouponNos),
    ...appliedCouponNosFromPromotionQuote(confirmation),
  ];
  if (appliedCouponNos.length > 0) return appliedCouponNos[0];
  if (!requestedCouponId) return undefined;

  const rejectedCouponNos = normalizeCouponNos(confirmation.rejectedCoupons?.map((coupon) => coupon.couponNo || ''));
  if (rejectedCouponNos.includes(requestedCouponId)) return undefined;
  if (Array.isArray(confirmation.appliedCouponNos)) return undefined;

  const selectedCouponNos = [
    ...normalizeCouponNos(confirmation.selectedCouponNos),
    ...selectedCouponNosFromPromotionQuote(confirmation),
    ...couponNosFromUnknown((confirmation.promotionQuote as { selectedCouponNos?: unknown } | undefined)?.selectedCouponNos),
  ];
  const hasDiscount = (parseNumberLike(confirmation.discountAmountCent) ?? 0) > 0;
  return selectedCouponNos.includes(requestedCouponId) && hasDiscount ? requestedCouponId : undefined;
}

// 从确认单拒券结果中提取游客可理解的提示，缺省时使用通用重算文案。
function resolveCouponNoticeText(
  confirmation: BffOrderConfirmResponse,
  requestedCouponId?: string,
  confirmedCouponId?: string,
) {
  if (!requestedCouponId || requestedCouponId === confirmedCouponId) return '';

  const rejectedCoupon = confirmation.rejectedCoupons?.find((coupon) => coupon.couponNo === requestedCouponId);
  return rejectedCoupon?.unavailableReason
    || rejectedCoupon?.reason
    || confirmation.warnings?.find(Boolean)
    || '该优惠券暂不可用，已重新计算订单金额';
}

function toTicketCoupon(coupon: BffAvailableCouponView): TicketCoupon {
  const thresholdAmount = centToYuan(coupon.thresholdAmountCent);
  const discountAmountCent = parseNumberLike(coupon.discountAmountCent);
  const discountAmount = centToYuan(discountAmountCent);
  const validDate = coupon.validEndAt ? coupon.validEndAt.slice(0, 10) : '';
  const available = coupon.available !== false && coupon.status === 'AVAILABLE';

  return {
    id: coupon.couponNo,
    title: coupon.couponName || '门票优惠券',
    amountText: discountAmount > 0 ? `¥${formatYuan(discountAmountCent)}` : (formatDiscountPercent(coupon.discountPercent) || '优惠券'),
    thresholdText: thresholdAmount > 0 ? `满¥${thresholdAmount.toFixed(2)}可用` : '无门槛',
    validityText: validDate ? `有效期至 ${validDate}` : '按券规则生效',
    status: available ? 'available' : 'disabled',
    tag: available ? (coupon.reason || '可用') : (coupon.unavailableReason || coupon.reason || '暂不可用'),
    minimumAmount: thresholdAmount,
    discountAmount,
  };
}

// 根据草稿和统一订单确认结果生成门票确认单页面数据。
export async function fetchCheckoutData(draftId?: string, selectedCouponId?: string | null) {
  const draft = getTicketOrderDraft(draftId);
  const travelers = draft?.travelers?.length
    ? draft.travelers
    : createTicketOrderTravelers(draft?.products ?? [], draft?.contact);

  if (!draft) {
    return {
      parkName: '杭州 Hello Kitty 乐园',
      ticketItem: {
        title: '',
        quantity: 0,
        travelDate: '',
        tagText: '',
        price: 0,
      },
      addonItem: {
        merchantTitle: '',
        productTitle: '',
        noteText: '',
        quantity: 0,
        price: 0,
      },
      contact: {
        name: '',
        mobile: '',
        idCard: '',
        mobilePlaceholder: '请输入手机号',
        idCardPlaceholder: '请填写证件号码',
        helperText: '证件信息用于入园核验，请确保与实际出行人一致',
        errorText: '请补全证件信息',
      },
      discountText: '',
      couponText: '',
      couponNoticeText: '',
      discountAmount: 0,
      payableAmount: 0,
      payButtonText: '提交订单',
      draft,
      draftMissing: true,
      dates: [],
      travelers,
    } satisfies TicketCheckoutPageData;
  }

  const resolvedSelectedCouponId = selectedCouponId === null
    ? undefined
    : typeof selectedCouponId === 'undefined'
      ? draft.selectedCouponId
      : selectedCouponId;
  const orderRequest = buildTicketUnifiedOrderRequest(draft, {
    selectedDate: draft.selectedDate,
    selectedCouponId: resolvedSelectedCouponId,
    addonQuantity: draft.addonQuantity,
    contact: draft.contact,
    travelers,
  });
  const [ticketQuote, confirmation] = await Promise.all([
    quoteBffTickets({
      visitDate: draft.selectedDate,
      channel: 'miniProgram',
      context: {
        parkName: draft.parkName,
      },
      items: draft.products.map((product) => ({
        productCode: product.productCode || product.id,
        skuId: product.skuId || `${product.productCode || product.id}_standard`,
        visitDate: draft.selectedDate,
        quantity: product.quantity,
        attributes: {
          productTitle: product.title,
        },
      })),
    }),
    confirmBffOrder(orderRequest),
  ]);
  const availableCouponsResponse = await fetchBffCouponAvailable({
    sceneType: 'TICKET',
    orderAmountCent: confirmation.originalAmountCent ?? ticketQuote.originalAmountCent ?? calculateDraftOrderAmountCent(draft),
    itemIds: draft.products.map((product) => product.productCode || product.id),
    skuIds: draft.products.map((product) => product.skuId || `${product.productCode || product.id}_standard`),
    visitDate: draft.selectedDate,
  });
  const originalAmount = centToYuan(confirmation.originalAmountCent ?? ticketQuote.originalAmountCent);
  const discountAmount = centToYuan(confirmation.discountAmountCent);
  const payableAmount = centToYuan(confirmation.payableAmountCent ?? ticketQuote.payableAmountCent);
  const totalQuantity = draft.products.reduce((total, product) => total + product.quantity, 0);
  const coupons = (availableCouponsResponse.coupons ?? []).map(toTicketCoupon);
  const confirmedCouponId = resolveConfirmedCouponId(confirmation, resolvedSelectedCouponId);
  const couponNoticeText = resolveCouponNoticeText(confirmation, resolvedSelectedCouponId, confirmedCouponId);
  const nextDraft = {
    ...draft,
    selectedCouponId: confirmedCouponId,
    coupons,
  };

  return {
    parkName: draft.parkName,
    ticketItem: {
      title: draft.products.map((product) => product.title).join('、'),
      quantity: totalQuantity,
      travelDate: draft.selectedDate,
      tagText: '预定须知',
      price: originalAmount || payableAmount,
    },
    addonItem: {
      merchantTitle: '',
      productTitle: '',
      noteText: '',
      quantity: 0,
      price: 0,
    },
    contact: {
      name: draft.contact.name,
      mobile: draft.contact.mobile,
      idCard: draft.contact.idCard,
      mobilePlaceholder: '请输入手机号',
      idCardPlaceholder: '请填写证件号码',
      helperText: '证件信息用于入园核验，请确保与实际出行人一致',
      errorText: '请补全证件信息',
    },
    discountText: discountAmount > 0 ? `已优惠 ¥${discountAmount.toFixed(2)}` : '',
    couponText: coupons.length > 0 ? '请选择优惠券' : '',
    couponNoticeText,
    discountAmount,
    payableAmount,
    payButtonText: '提交订单',
    draft: nextDraft,
    draftMissing: false,
    dates: buildCheckoutDates(draft.selectedDate),
    travelers,
  } satisfies TicketCheckoutPageData;
}
