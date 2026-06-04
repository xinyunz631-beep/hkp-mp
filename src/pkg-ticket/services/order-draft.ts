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

// 计算草稿中门票商品金额。
function calculateProductsAmount(products: TicketOrderDraftProduct[]) {
  return products.reduce((total, product) => total + product.price * product.quantity, 0);
}

// 查找当前已选优惠券。
function resolveSelectedCoupon(draft: TicketOrderDraft, selectedCouponId?: string) {
  const nextCouponId = selectedCouponId ?? draft.selectedCouponId;
  return draft.coupons.find((coupon) => coupon.id === nextCouponId);
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

// 提交门票订单草稿，模拟支付成功后写入本地订单中心。
export function submitTicketOrderDraft(draftId: string, payload: SubmitTicketOrderDraftPayload) {
  const draft = getTicketOrderDraft(draftId);
  if (!draft) return undefined;

  const productsAmount = calculateProductsAmount(draft.products);
  const addonAmount = ticketCheckoutData.addonItem.price * payload.addonQuantity;
  const originAmount = productsAmount + addonAmount;
  const selectedCoupon = resolveSelectedCoupon(draft, payload.selectedCouponId);
  const discountAmount = selectedCoupon && originAmount >= selectedCoupon.minimumAmount
    ? selectedCoupon.discountAmount
    : 0;
  const paidAmount = Math.max(0, productsAmount + addonAmount - discountAmount);
  const orderId = createLocalOrderId('TICKET-');
  const now = createLocalOrderTime();
  const firstProduct = draft.products[0];
  const productSummary = draft.products.map((product) => `${product.title} x${product.quantity}`).join('、');
  const travelerNames = payload.travelers
    .map((traveler) => `${traveler.name}（${traveler.productTitle}）`)
  const travelerSummary = travelerNames.length > 3
    ? `${travelerNames.slice(0, 3).join('、')} 等${travelerNames.length}人`
    : travelerNames.join('、');

  const record: LocalOrderRecord = {
    id: orderId,
    source: 'ticket',
    tabKey: 'pendingReceive',
    dateText: payload.selectedDate,
    statusText: '待使用',
    paidAmountText: `¥${paidAmount.toFixed(2)}`,
    title: firstProduct?.title || 'Hello Kitty 乐园门票',
    quantityText: `x${draft.products.reduce((total, product) => total + product.quantity, 0)}`,
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
      { label: '联系人', value: payload.contact.name },
      { label: '手机号', value: payload.contact.mobile },
      { label: '实名游客', value: travelerSummary },
    ],
    amountFields: [
      { label: '票品金额', value: `¥${productsAmount.toFixed(2)}` },
      { label: '加购金额', value: `¥${addonAmount.toFixed(2)}` },
      ...(discountAmount > 0 ? [{ label: '优惠金额', value: `- ¥${discountAmount.toFixed(2)}` }] : []),
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
    addonQuantity: payload.addonQuantity,
    contact: payload.contact,
    travelers: payload.travelers,
  });
  saveLocalOrder(record);

  return record;
}
