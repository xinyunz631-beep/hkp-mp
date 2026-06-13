import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import {
  createBffOrder,
  type BffOrder,
  type BffOrderTicketVoucher,
  type BffOrderUnifiedRequest,
} from '@/core/services/bff-order-api';
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

export type TicketOrderTravelerRole =
  | 'adult'
  | 'child'
  | 'senior'
  | 'annualAdult'
  | 'annualChild';

export interface TicketOrderTraveler {
  id: string;
  productId: string;
  productTitle: string;
  category: 'ticket' | 'annualCard';
  role: TicketOrderTravelerRole;
  roleText: string;
  title: string;
  requirementText: string;
  mobileRequired: boolean;
  qualificationText?: string;
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
  addonQuantity: number;
  contact: TicketOrderContact;
  travelers: TicketOrderTraveler[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketOrderDraftPayload {
  parkName: string;
  selectedDate: string;
  products: TicketOrderDraftProduct[];
  coupons: TicketCoupon[];
  selectedCouponId?: string;
  addonQuantity?: number;
}

export interface SubmitTicketOrderDraftPayload {
  selectedDate: string;
  selectedCouponId?: string;
  addonQuantity: number;
  contact: TicketOrderContact;
  travelers: TicketOrderTraveler[];
}

// 读取全部本地门票订单草稿，异常时返回空列表。
function listTicketOrderDrafts() {
  const cachedDrafts = getCache<unknown>(MINI_STORAGE_KEYS.ticketOrderDrafts);

  if (Array.isArray(cachedDrafts)) {
    return cachedDrafts.filter((draft): draft is TicketOrderDraft => Boolean(draft?.id));
  }

  if (cachedDrafts && typeof cachedDrafts === 'object' && 'id' in cachedDrafts) {
    return [cachedDrafts as TicketOrderDraft];
  }

  return [];
}

// 保存门票订单草稿列表，统一隔离本地缓存 key。
function saveTicketOrderDrafts(drafts: TicketOrderDraft[]) {
  setCache(MINI_STORAGE_KEYS.ticketOrderDrafts, drafts);
}

function formatCentAmount(amountCent?: number) {
  const normalizedAmount = Math.max(0, Number(amountCent ?? 0));
  return `¥${(normalizedAmount / 100).toFixed(2)}`;
}

function resolveBffTicketOrderStatusText(status?: string) {
  const statusMap: Record<string, string> = {
    PENDING_PAYMENT: '待支付',
    PAYING: '支付中',
    PAID: '已支付',
    FULFILLING: '出票中',
    WAIT_USE: '待使用',
    PART_USED: '部分使用',
    USED: '已使用',
    FULFILLED: '已完成',
    COMPLETED: '已完成',
    CLOSED: '已关闭',
    REFUNDING: '退款中',
    REFUNDED: '已退款',
  };

  return status ? statusMap[status] ?? status : '待使用';
}

function resolveTicketVoucherCode(voucher: BffOrderTicketVoucher) {
  const code = voucher.ticketCode || voucher.voucherCode || voucher.couponCode;
  return typeof code === 'string' && code.trim() ? code.trim() : '';
}

function resolveTicketVoucherImage(voucher: BffOrderTicketVoucher) {
  const image = voucher.codeImage || voucher.qrImage || voucher.qrCodeUrl;
  return typeof image === 'string' && image.trim() ? image.trim() : '';
}

function createTicketOrderRequest(
  draft: TicketOrderDraft,
  payload: SubmitTicketOrderDraftPayload,
): BffOrderUnifiedRequest {
  const selectedCouponNos = payload.selectedCouponId ? [payload.selectedCouponId] : undefined;
  const travelerPayload = payload.travelers.map((traveler) => ({
    productId: traveler.productId,
    productTitle: traveler.productTitle,
    role: traveler.role,
    name: traveler.name,
    mobile: traveler.mobile,
    idCard: traveler.idCard,
  }));

  return {
    sceneType: 'TICKET',
    channel: 'MINI_PROGRAM',
    paymentChannel: 'WECHAT',
    freightAmountCent: 0,
    selectedCouponNos,
    contactName: payload.contact.name,
    contactPhone: payload.contact.mobile,
    context: {
      parkName: draft.parkName,
      visitDate: payload.selectedDate,
      useDate: payload.selectedDate,
      contactIdCard: payload.contact.idCard,
      addonQuantity: String(payload.addonQuantity),
      travelers: JSON.stringify(travelerPayload),
    },
    items: draft.products
      .filter((product) => product.quantity > 0)
      .map((product, index) => ({
        lineNo: String(index + 1),
        itemId: product.id,
        itemType: product.category === 'annualCard' ? 'ANNUAL_CARD' : 'TICKET',
        quantity: product.quantity,
        attributes: {
          visitDate: payload.selectedDate,
          useDate: payload.selectedDate,
          category: product.category,
          noticeText: product.noticeText,
        },
      })),
  };
}

function createBffTicketLocalOrder(
  order: BffOrder,
  draft: TicketOrderDraft,
  payload: SubmitTicketOrderDraftPayload,
): LocalOrderRecord {
  const now = createLocalOrderTime();
  const orderItems = order.items?.length ? order.items : draft.products.map((product, index) => ({
    lineNo: String(index + 1),
    itemId: product.id,
    itemName: product.title,
    itemType: product.category === 'annualCard' ? 'ANNUAL_CARD' : 'TICKET',
    unitPriceCent: Math.round(product.price * 100),
    quantity: product.quantity,
    amountCent: Math.round(product.price * product.quantity * 100),
    attributes: {
      visitDate: payload.selectedDate,
    },
  }));
  const totalQuantity = orderItems.reduce((total, item) => total + (item.quantity ?? 0), 0);
  const firstItem = orderItems[0];
  const itemsAmountCent = orderItems.reduce((total, item) => total + (item.amountCent ?? 0), 0);
  const originalAmountCent = order.originalAmountCent ?? itemsAmountCent;
  const paidAmountCent = order.payableAmountCent ?? itemsAmountCent;
  const discountAmountCent = order.discountAmountCent ?? 0;
  const productSummary = orderItems.map((item) => `${item.itemName || item.itemId || '门票'} x${item.quantity ?? 0}`).join('、');
  const travelerNames = payload.travelers.map((traveler) => `${traveler.name}（${traveler.productTitle}）`);
  const travelerSummary = travelerNames.length > 3
    ? `${travelerNames.slice(0, 3).join('、')} 等${travelerNames.length}人`
    : travelerNames.join('、');
  const voucherFields = (order.ticketVouchers ?? []).map((voucher, index) => {
    const voucherCode = resolveTicketVoucherCode(voucher);
    const voucherImage = resolveTicketVoucherImage(voucher);
    const voucherText = [
      voucherCode ? `票码：${voucherCode}` : '',
      voucherImage ? `二维码：${voucherImage}` : '',
    ].filter(Boolean).join('\n') || '已出票，请以订单详情为准';

    return {
      label: `入园凭证${index + 1}`,
      value: voucherText,
    };
  });

  return {
    id: order.orderNo,
    source: 'ticket',
    tabKey: 'pendingReceive',
    paymentStatus: 'paid',
    primaryActionType: 'refund',
    dateText: payload.selectedDate,
    statusText: resolveBffTicketOrderStatusText(order.orderStatus),
    paidAmountText: formatCentAmount(paidAmountCent),
    title: firstItem?.itemName || draft.products[0]?.title || 'Hello Kitty 乐园门票',
    quantityText: `x${totalQuantity}`,
    totalText: `共${totalQuantity}张 合计:${formatCentAmount(paidAmountCent)}`,
    productFields: [
      { label: '使用日期', value: payload.selectedDate },
      { label: '票品内容', value: productSummary },
      { label: '使用方法', value: voucherFields.length ? '凭订单入园码或票码核验入园' : '凭订单详情中的入园凭证核验入园' },
    ],
    ticketFields: [
      ...voucherFields,
      { label: '入园地址', value: '浙江湖州市安吉县天使大道1号' },
      { label: '入园时间', value: '10:00-17:00' },
      { label: '退票规则', value: '门票未使用前支持申请退款' },
    ],
    contactFields: [
      { label: '联系人', value: payload.contact.name },
      { label: '手机号', value: payload.contact.mobile },
      { label: '实名游客', value: travelerSummary },
    ],
    amountFields: [
      { label: '票品金额', value: formatCentAmount(originalAmountCent) },
      ...(discountAmountCent > 0 ? [{ label: '优惠金额', value: `- ${formatCentAmount(discountAmountCent)}` }] : []),
      { label: '实付款', value: formatCentAmount(paidAmountCent) },
    ],
    orderFields: [
      { label: '订单编号', value: order.orderNo },
      { label: '下单时间', value: now },
      { label: '支付方式', value: '免支付出票' },
      { label: '订单状态', value: resolveBffTicketOrderStatusText(order.orderStatus) },
    ],
    refundButtonText: '申请退款',
    homeItems: [
      {
        id: order.orderNo,
        orderId: order.orderNo,
        title: firstItem?.itemName || draft.products[0]?.title || 'Hello Kitty 乐园门票',
        subtitle: `出行日期：${payload.selectedDate}`,
        imageSrc: '',
        quantity: totalQuantity,
        priceText: formatCentAmount(paidAmountCent),
        actionText: '查看详情',
      },
    ],
    createdAt: order.createdAt || now,
  };
}

interface TicketTravelerSlotRule {
  role: TicketOrderTravelerRole;
  roleText: string;
  label: string;
  requirementText: string;
  mobileRequired?: boolean;
  qualificationText?: string;
}

const adultSlotRule: TicketTravelerSlotRule = {
  role: 'adult',
  roleText: '成人',
  label: '成人',
  requirementText: '填写实际入园成人信息，入园时可刷证件或入园码核验。',
};

const childSlotRule: TicketTravelerSlotRule = {
  role: 'child',
  roleText: '儿童',
  label: '儿童',
  requirementText: '填写实际入园儿童信息，入园时核验身高或证件，需成人陪同。',
  qualificationText: '儿童票通常适用于 1米（含）-1.4米（不含）儿童，具体以现场核验为准。',
};

const seniorSlotRule: TicketTravelerSlotRule = {
  role: 'senior',
  roleText: '优待',
  label: '优待游客',
  requirementText: '填写本人实名信息，入园时需核验证件和优待资格。',
  qualificationText: '优惠票需现场核验证件或优待资格，若不满足政策可能无法入园。',
};

const annualAdultSlotRule: TicketTravelerSlotRule = {
  role: 'annualAdult',
  roleText: '成人年卡',
  label: '成人持卡人',
  requirementText: '年卡需实名绑定，激活后仅限本人使用，入园时核验证件。',
  mobileRequired: true,
};

const annualChildSlotRule: TicketTravelerSlotRule = {
  role: 'annualChild',
  roleText: '儿童年卡',
  label: '儿童持卡人',
  requirementText: '儿童年卡需实名绑定，入园时核验证件或身高，并由监护人陪同。',
  mobileRequired: true,
  qualificationText: '儿童年卡适用范围以现场要求为准，请确认儿童符合购买条件。',
};

function repeatSlotRules(rule: TicketTravelerSlotRule, count: number) {
  return Array.from({ length: count }, () => rule);
}

// 根据产品结构准备出游人填写项，不把各平台 UI 照搬到页面层。
function resolveTravelerSlotRules(product: TicketOrderDraftProduct) {
  if (product.id === '4000000000001004') {
    return Array.from({ length: product.quantity }).flatMap(() => [adultSlotRule, childSlotRule]);
  }

  if (product.id === '4000000000001002') {
    return repeatSlotRules(seniorSlotRule, product.quantity);
  }

  if (product.id === '4000000000001003') {
    return repeatSlotRules(childSlotRule, product.quantity);
  }

  if (product.id === '4000000000002002') {
    return repeatSlotRules(annualChildSlotRule, product.quantity);
  }

  if (product.id === '4000000000002001') {
    return repeatSlotRules(annualAdultSlotRule, product.quantity);
  }

  if (product.id === '4000000000002003') {
    return Array.from({ length: product.quantity }).flatMap(() => [
      annualAdultSlotRule,
      annualAdultSlotRule,
      annualChildSlotRule,
    ]);
  }

  if (product.id === '4000000000002004') {
    return Array.from({ length: product.quantity }).flatMap(() => [
      annualAdultSlotRule,
      annualAdultSlotRule,
      annualChildSlotRule,
      annualChildSlotRule,
    ]);
  }

  if (product.id === '4000000000002005') {
    return Array.from({ length: product.quantity }).flatMap(() => [
      annualAdultSlotRule,
      annualChildSlotRule,
    ]);
  }

  return repeatSlotRules(adultSlotRule, product.quantity);
}

// 生成门票实名出游人列表，旧草稿缺少该字段时也用这里补齐。
export function createTicketOrderTravelers(
  products: TicketOrderDraftProduct[],
  seedContact?: Partial<TicketOrderContact>,
) {
  let travelerIndex = 0;

  return products.flatMap((product) => {
    const rules = resolveTravelerSlotRules(product);

    return rules.map((rule, index) => {
      travelerIndex += 1;
      const isFirstTraveler = travelerIndex === 1;
      const sameRoleCount = rules.filter((item) => item.role === rule.role).length;
      const currentRoleIndex = rules.slice(0, index + 1).filter((item) => item.role === rule.role).length;
      const sequenceText = sameRoleCount > 1 ? ` ${currentRoleIndex}` : '';

      return {
        id: `${product.id}-${index + 1}`,
        productId: product.id,
        productTitle: product.title,
        category: product.category,
        role: rule.role,
        roleText: rule.roleText,
        title: `${product.title} ${rule.label}${sequenceText}`,
        requirementText: rule.requirementText,
        mobileRequired: Boolean(rule.mobileRequired),
        qualificationText: rule.qualificationText,
        name: isFirstTraveler ? seedContact?.name ?? '' : '',
        mobile: isFirstTraveler ? seedContact?.mobile ?? '' : '',
        idCard: isFirstTraveler ? seedContact?.idCard ?? '' : '',
      };
    });
  });
}

// 创建门票订单草稿，预定页通过草稿编号跳到确认订单页。
export function createTicketOrderDraft(payload: CreateTicketOrderDraftPayload) {
  const now = createLocalOrderTime();
  const contact = {
    name: ticketCheckoutData.contact.name,
    mobile: ticketCheckoutData.contact.mobile,
    idCard: ticketCheckoutData.contact.idCard,
  };
  const draft: TicketOrderDraft = {
    id: createLocalOrderId('TICKET-DRAFT-'),
    parkName: payload.parkName,
    selectedDate: payload.selectedDate,
    products: payload.products,
    coupons: payload.coupons,
    selectedCouponId: payload.selectedCouponId,
    addonQuantity: payload.addonQuantity ?? 0,
    contact,
    travelers: createTicketOrderTravelers(payload.products, contact),
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

// 提交门票订单草稿，走 BFF 统一订单创建，后端会在门票场景跳过支付并调用智游宝出票。
export async function submitTicketOrderDraft(draftId: string, payload: SubmitTicketOrderDraftPayload) {
  const draft = getTicketOrderDraft(draftId);
  if (!draft) return undefined;

  updateTicketOrderDraft(draftId, {
    selectedDate: payload.selectedDate,
    selectedCouponId: payload.selectedCouponId,
    addonQuantity: payload.addonQuantity,
    contact: payload.contact,
    travelers: payload.travelers,
  });

  const response = await createBffOrder(createTicketOrderRequest(draft, payload));
  const record = createBffTicketLocalOrder(response.order, draft, payload);
  saveLocalOrder(record);

  return record;
}
