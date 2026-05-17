import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import {
  createLocalOrderId,
  createLocalOrderTime,
  saveLocalOrder,
  type LocalOrderRecord,
} from '@/core/services/local-order';
import { getCache, setCache } from '@/core/utils/cache';
import { ticketCheckoutData } from './mock-data';
import type { TicketCoupon } from './ticket-booking';

export interface TicketOrderDraftProduct {
  id: string;
  title: string;
  category: 'ticket' | 'annualCard';
  price: number;
  quantity: number;
  noticeText: string;
}

export interface TicketOrderContact {
  name: string;
  mobile: string;
  idCard: string;
}

export interface TicketOrderDraft {
  id: string;
  parkName: string;
  selectedDate: string;
  products: TicketOrderDraftProduct[];
  coupons: TicketCoupon[];
  selectedCouponId?: string;
  contact: TicketOrderContact;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketOrderDraftPayload {
  parkName: string;
  selectedDate: string;
  products: TicketOrderDraftProduct[];
  coupons: TicketCoupon[];
  selectedCouponId?: string;
}

export interface SubmitTicketOrderDraftPayload {
  selectedDate: string;
  selectedCouponId?: string;
  addonQuantity: number;
  contact: TicketOrderContact;
}

// 读取全部本地门票订单草稿，异常时返回空列表。
function listTicketOrderDrafts() {
  return getCache<TicketOrderDraft[]>(MINI_STORAGE_KEYS.ticketOrderDrafts) ?? [];
}

// 保存门票订单草稿列表，统一隔离本地缓存 key。
function saveTicketOrderDrafts(drafts: TicketOrderDraft[]) {
  setCache(MINI_STORAGE_KEYS.ticketOrderDrafts, drafts);
}

// 计算草稿中门票商品金额。
function calculateProductsAmount(products: TicketOrderDraftProduct[]) {
  return products.reduce((total, product) => total + product.price * product.quantity, 0);
}

// 查找当前已选优惠券。
function resolveSelectedCoupon(draft: TicketOrderDraft, selectedCouponId?: string) {
  const nextCouponId = selectedCouponId ?? draft.selectedCouponId;
  return draft.coupons.find((coupon) => coupon.id === nextCouponId);
}

// 创建门票订单草稿，预定页通过草稿编号跳到确认订单页。
export function createTicketOrderDraft(payload: CreateTicketOrderDraftPayload) {
  const now = createLocalOrderTime();
  const draft: TicketOrderDraft = {
    id: createLocalOrderId('TICKET-DRAFT-'),
    parkName: payload.parkName,
    selectedDate: payload.selectedDate,
    products: payload.products,
    coupons: payload.coupons,
    selectedCouponId: payload.selectedCouponId,
    contact: {
      name: ticketCheckoutData.contact.name,
      mobile: ticketCheckoutData.contact.mobile,
      idCard: ticketCheckoutData.contact.idCard,
    },
    createdAt: now,
    updatedAt: now,
  };
  const drafts = listTicketOrderDrafts().filter((item) => item.id !== draft.id);
  saveTicketOrderDrafts([draft, ...drafts]);

  return draft;
}

// 读取单个门票订单草稿，确认订单页以此恢复页面状态。
export function getTicketOrderDraft(draftId?: string) {
  if (!draftId) return undefined;
  return listTicketOrderDrafts().find((draft) => draft.id === draftId);
}

// 更新门票订单草稿，确认订单页改日期、优惠券或联系人后写回。
export function updateTicketOrderDraft(draftId: string, patch: Partial<TicketOrderDraft>) {
  const drafts = listTicketOrderDrafts();
  const current = drafts.find((draft) => draft.id === draftId);
  if (!current) return undefined;

  const nextDraft: TicketOrderDraft = {
    ...current,
    ...patch,
    updatedAt: createLocalOrderTime(),
  };

  saveTicketOrderDrafts(drafts.map((draft) => (draft.id === draftId ? nextDraft : draft)));
  return nextDraft;
}

// 提交门票订单草稿，模拟支付成功后写入本地订单中心。
export function submitTicketOrderDraft(draftId: string, payload: SubmitTicketOrderDraftPayload) {
  const draft = getTicketOrderDraft(draftId);
  if (!draft) return undefined;

  const selectedCoupon = resolveSelectedCoupon(draft, payload.selectedCouponId);
  const productsAmount = calculateProductsAmount(draft.products);
  const addonAmount = ticketCheckoutData.addonItem.price * payload.addonQuantity;
  const discountAmount = selectedCoupon?.discountAmount ?? 0;
  const paidAmount = Math.max(0, productsAmount + addonAmount - discountAmount);
  const orderId = createLocalOrderId('TICKET-');
  const now = createLocalOrderTime();
  const firstProduct = draft.products[0];
  const productSummary = draft.products.map((product) => `${product.title} x${product.quantity}`).join('、');

  const record: LocalOrderRecord = {
    id: orderId,
    source: 'ticket',
    tabKey: 'pendingReceive',
    dateText: payload.selectedDate,
    statusText: '待使用',
    paidAmountText: `¥${paidAmount.toFixed(2)}`,
    title: firstProduct?.title || 'Hello Kitty 乐园门票',
    quantityText: `X${draft.products.reduce((total, product) => total + product.quantity, 0)}`,
    totalText: `共${draft.products.length}类票品 合计:¥${paidAmount.toFixed(2)}`,
    productFields: [
      { label: '使用日期', value: payload.selectedDate },
      { label: '票品内容', value: productSummary },
      { label: '使用方法', value: '凭购票时填写的身份证入园' },
    ],
    ticketFields: [
      { label: '入园地址', value: '浙江湖州市安吉县天使大道1号' },
      { label: '入园时间', value: '10:00-17:00' },
      { label: '退票规则', value: '门票未使用前支持申请退款' },
    ],
    contactFields: [
      { label: '姓名', value: payload.contact.name },
      { label: '手机号', value: payload.contact.mobile },
      { label: '身份证', value: payload.contact.idCard },
    ],
    amountFields: [
      { label: '票品金额', value: `¥${productsAmount.toFixed(2)}` },
      { label: '加购金额', value: `¥${addonAmount.toFixed(2)}` },
      { label: '优惠金额', value: `- ¥${discountAmount.toFixed(2)}` },
      { label: '实付款', value: `¥${paidAmount.toFixed(2)}` },
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
        title: firstProduct?.title || 'Hello Kitty 乐园门票',
        subtitle: `出行日期：${payload.selectedDate}`,
        imageSrc: '',
        quantity: draft.products.reduce((total, product) => total + product.quantity, 0),
        priceText: `¥ ${paidAmount.toFixed(2)}`,
        actionText: '查看详情',
      },
    ],
    createdAt: now,
  };

  updateTicketOrderDraft(draftId, {
    selectedDate: payload.selectedDate,
    selectedCouponId: payload.selectedCouponId,
    contact: payload.contact,
  });
  saveLocalOrder(record);

  return record;
}
