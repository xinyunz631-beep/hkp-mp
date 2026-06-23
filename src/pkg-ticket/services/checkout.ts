import { confirmBffOrder } from '@/core/services/bff-order-api';
import { fetchBffCouponAvailable } from '@/core/services/bff-coupon-api';
import {
  normalizeCheckoutAmounts,
  resolveCheckoutCouponState,
  toCheckoutCouponSummary,
} from '@/core/services/checkout-flow';
import { quoteBffTickets } from './ticket-api';
import type { HkpDateOption } from '@/core/types/hkp';
import {
  createTicketOrderTravelers,
  getTicketOrderDraft,
  type TicketOrderDraft,
  type TicketOrderTraveler,
} from './order-draft';
import { buildTicketCheckoutOrderRequest } from './checkout-adapter';
import type { TicketCoupon } from './ticket-booking';

export interface TicketCheckoutTicketItem {
  title: string;
  quantity: number;
  travelDate: string;
  tagText: string;
  price?: number;
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
  const orderRequest = buildTicketCheckoutOrderRequest(draft, {
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
  const amounts = normalizeCheckoutAmounts(confirmation, {
    originalAmountCent: ticketQuote.originalAmountCent,
  }, {
    sceneLabel: '门票确认单',
    requirePayableAmount: true,
  });
  const availableCouponsResponse = await fetchBffCouponAvailable({
    sceneType: 'TICKET',
    orderAmountCent: amounts.hasOriginalAmount ? amounts.originalAmountCent : undefined,
    itemIds: draft.products.map((product) => product.productCode || product.id),
    skuIds: draft.products.map((product) => product.skuId || `${product.productCode || product.id}_standard`),
    visitDate: draft.selectedDate,
  });
  const totalQuantity = draft.products.reduce((total, product) => total + product.quantity, 0);
  const coupons = (availableCouponsResponse.coupons ?? [])
    .map((coupon) => toCheckoutCouponSummary(coupon, '门票优惠券')) as TicketCoupon[];
  const couponState = resolveCheckoutCouponState(confirmation, resolvedSelectedCouponId);
  const nextDraft = {
    ...draft,
    selectedCouponId: couponState.selectedCouponId,
    coupons,
  };

  return {
    parkName: draft.parkName,
    ticketItem: {
      title: draft.products.map((product) => product.title).join('、'),
      quantity: totalQuantity,
      travelDate: draft.selectedDate,
      tagText: '预定须知',
      price: amounts.hasOriginalAmount ? amounts.originalAmount : undefined,
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
    discountText: amounts.hasDiscountAmount && amounts.discountAmount > 0 ? `已优惠 ¥${amounts.discountAmount.toFixed(2)}` : '',
    couponText: coupons.length > 0 ? '请选择优惠券' : '',
    couponNoticeText: couponState.couponNoticeText,
    discountAmount: amounts.hasDiscountAmount ? amounts.discountAmount : 0,
    payableAmount: amounts.payableAmount,
    payButtonText: '提交订单',
    draft: nextDraft,
    draftMissing: false,
    dates: buildCheckoutDates(draft.selectedDate),
    travelers,
  } satisfies TicketCheckoutPageData;
}
