import { confirmBffOrder } from '@/core/services/bff-order-api';
import {
  fetchBffCouponAvailable,
  getBffAvailableCouponList,
  getBffCouponAmountCent,
  getBffCouponReason,
  getBffCouponThresholdCent,
  getBffCouponTitle,
  isBffCouponAvailable,
  type BffAvailableCouponView,
} from '@/core/services/bff-coupon-api';
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

// 读取服务端金额并转换为页面展示的元单位。
function centToYuan(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Number((value / 100).toFixed(2));
}

function yuanToCent(value: number) {
  return Math.round(value * 100);
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

function formatYuan(amountCent = 0) {
  const amount = amountCent / 100;
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function calculateDraftOrderAmountCent(draft: TicketOrderDraft) {
  return draft.products.reduce((total, product) => {
    const unitPriceCent = product.unitPriceCent ?? yuanToCent(product.price);
    return total + unitPriceCent * product.quantity;
  }, 0);
}

function toTicketCoupon(coupon: BffAvailableCouponView): TicketCoupon {
  const thresholdCent = getBffCouponThresholdCent(coupon);
  const discountCent = getBffCouponAmountCent(coupon);
  const thresholdAmount = centToYuan(thresholdCent);
  const discountAmount = centToYuan(discountCent);
  const validDate = coupon.validEndAt ? coupon.validEndAt.slice(0, 10) : '';

  return {
    id: coupon.couponNo,
    title: getBffCouponTitle(coupon, '门票优惠券'),
    amountText: discountAmount > 0 ? `¥${formatYuan(discountCent)}` : '优惠券',
    thresholdText: thresholdAmount > 0 ? `满¥${thresholdAmount.toFixed(2)}可用` : '无门槛',
    validityText: validDate ? `有效期至 ${validDate}` : '按券规则生效',
    status: isBffCouponAvailable(coupon) ? 'available' : 'disabled',
    tag: getBffCouponReason(coupon),
    minimumAmount: thresholdAmount,
    discountAmount,
  };
}

// 根据草稿和统一订单确认结果生成门票确认单页面数据。
export async function fetchCheckoutData(draftId?: string, selectedCouponId?: string) {
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
      discountAmount: 0,
      payableAmount: 0,
      payButtonText: '提交订单',
      draft,
      draftMissing: true,
      dates: [],
      travelers,
    } satisfies TicketCheckoutPageData;
  }

  const orderRequest = buildTicketUnifiedOrderRequest(draft, {
    selectedDate: draft.selectedDate,
    selectedCouponId: selectedCouponId ?? draft.selectedCouponId,
    addonQuantity: draft.addonQuantity,
    contact: draft.contact,
    travelers,
  });
  const [ticketQuote, confirmation, availableCouponsResponse] = await Promise.all([
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
    fetchBffCouponAvailable({
      sceneType: 'TICKET',
      orderAmountCent: calculateDraftOrderAmountCent(draft),
      itemIds: draft.products.map((product) => product.productCode || product.id),
      skuIds: draft.products.map((product) => product.skuId || `${product.productCode || product.id}_standard`),
      visitDate: draft.selectedDate,
    }),
  ]);
  const originalAmount = centToYuan(confirmation.originalAmountCent || ticketQuote.originalAmountCent);
  const discountAmount = centToYuan(confirmation.discountAmountCent);
  const payableAmount = centToYuan(confirmation.payableAmountCent || ticketQuote.payableAmountCent);
  const totalQuantity = draft.products.reduce((total, product) => total + product.quantity, 0);
  const coupons = getBffAvailableCouponList(availableCouponsResponse).map(toTicketCoupon);
  const nextDraft = {
    ...draft,
    selectedCouponId: selectedCouponId ?? draft.selectedCouponId,
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
    discountAmount,
    payableAmount,
    payButtonText: '提交订单',
    draft: nextDraft,
    draftMissing: false,
    dates: buildCheckoutDates(draft.selectedDate),
    travelers,
  } satisfies TicketCheckoutPageData;
}
