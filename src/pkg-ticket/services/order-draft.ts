import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import { markTicketBookingRefreshNeeded } from '@/core/services/ticket-booking-refresh-signal';
import {
  isBffTicketOrderIssued,
  type BffTicketVoucher,
  type BffOrderUnifiedRequest,
} from '@/core/services/bff-order-api';
import { pruneCheckoutDrafts, removeCheckoutDraftById } from '@/core/services/checkout-draft-lifecycle';
import {
  buildCheckoutPendingOrder,
  canReuseCheckoutPendingOrder,
  createCheckoutRequestFingerprint,
  restoreCheckoutPendingResult,
  submitAndPayBffOrder,
  type CheckoutPendingOrder,
  type CheckoutSubmitResult,
  type SubmitAndPayBffOrderOptions,
} from '@/core/services/checkout-flow';
import { getCache, setCache } from '@/core/utils/cache';
import { sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import { buildTicketCheckoutOrderRequest } from './checkout-adapter';
import type { TicketCoupon } from './ticket-booking';

export const TICKET_ORDER_SOURCE_OFFLINE_QR_FAST_BUY = 'offlineQrFastBuy';

export interface TicketOrderDraftProduct {
  id: string;
  productCode?: string;
  skuId?: string;
  skuName?: string;
  title: string;
  imageSrc?: string;
  category: 'ticket' | 'annualCard' | 'fastPass';
  price: number;
  unitPriceCent?: number;
  quantity: number;
  availableStock?: number;
  maxQuantity?: number;
  noticeText: string;
  travelerRoles?: string[];
  requiredFields?: string[];
  mobileRequired?: boolean;
  certificateRequired?: boolean;
  verificationMethod?: string;
  verificationMethods?: string[];
  fulfillmentType?: string;
  realNameRequired?: boolean;
  entryMethods?: string[];
  cardRule?: Record<string, unknown>;
  usageInstructionHtml?: string;
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
  category: 'ticket' | 'annualCard' | 'fastPass';
  role: TicketOrderTravelerRole;
  roleText: string;
  title: string;
  requirementText: string;
  nameRequired: boolean;
  mobileRequired: boolean;
  certificateRequired: boolean;
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
  source?: string;
  addonQuantity: number;
  contact: TicketOrderContact;
  travelers: TicketOrderTraveler[];
  pendingOrder?: CheckoutPendingOrder;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketOrderDraftPayload {
  parkName: string;
  selectedDate: string;
  products: TicketOrderDraftProduct[];
  coupons: TicketCoupon[];
  selectedCouponId?: string;
  source?: string;
  addonQuantity?: number;
}

export interface SubmitTicketOrderDraftPayload {
  selectedDate: string;
  selectedCouponId?: string;
  addonQuantity: number;
  contact: TicketOrderContact;
  travelers: TicketOrderTraveler[];
}

export interface TicketOrderSubmitResult extends CheckoutSubmitResult {
  id: string;
  ticketVouchers?: BffTicketVoucher[];
}

// 读取全部本地门票订单草稿，异常时返回空列表。
function listTicketOrderDrafts() {
  const cachedDrafts = getCache<unknown>(MINI_STORAGE_KEYS.ticketOrderDrafts);
  let drafts: TicketOrderDraft[] = [];

  if (Array.isArray(cachedDrafts)) {
    drafts = cachedDrafts.filter((draft): draft is TicketOrderDraft => Boolean(draft?.id));
  } else if (cachedDrafts && typeof cachedDrafts === 'object' && 'id' in cachedDrafts) {
    drafts = [cachedDrafts as TicketOrderDraft];
  }

  const availableDrafts = pruneCheckoutDrafts(drafts);
  if (availableDrafts.length !== drafts.length) {
    saveTicketOrderDrafts(availableDrafts);
  }

  return availableDrafts;
}

// 保存门票订单草稿列表，统一隔离本地缓存 key。
function saveTicketOrderDrafts(drafts: TicketOrderDraft[]) {
  setCache(MINI_STORAGE_KEYS.ticketOrderDrafts, drafts);
}

interface TicketTravelerSlotRule {
  role: TicketOrderTravelerRole;
  roleText: string;
  label: string;
  requirementText: string;
  nameRequired?: boolean;
  mobileRequired?: boolean;
  certificateRequired?: boolean;
  qualificationText?: string;
}

const adultSlotRule: TicketTravelerSlotRule = {
  role: 'adult',
  roleText: '成人',
  label: '成人',
  requirementText: '填写实际入园成人信息，入园时可刷证件或入园码核验。',
  nameRequired: true,
  certificateRequired: true,
};

const childSlotRule: TicketTravelerSlotRule = {
  role: 'child',
  roleText: '儿童',
  label: '儿童',
  requirementText: '填写实际入园儿童信息，入园时核验身高或证件，需成人陪同。',
  nameRequired: true,
  certificateRequired: true,
  qualificationText: '儿童票通常适用于 1米（含）-1.4米（不含）儿童，具体以现场核验为准。',
};

const seniorSlotRule: TicketTravelerSlotRule = {
  role: 'senior',
  roleText: '优待',
  label: '优待游客',
  requirementText: '填写本人实名信息，入园时需核验证件和优待资格。',
  nameRequired: true,
  certificateRequired: true,
  qualificationText: '优惠票需现场核验证件或优待资格，若不满足政策可能无法入园。',
};

const annualAdultSlotRule: TicketTravelerSlotRule = {
  role: 'annualAdult',
  roleText: '成人年卡',
  label: '成人持卡人',
  requirementText: '年卡需实名绑定，激活后仅限本人使用，入园时核验证件。',
  nameRequired: true,
  mobileRequired: true,
  certificateRequired: true,
};

const annualChildSlotRule: TicketTravelerSlotRule = {
  role: 'annualChild',
  roleText: '儿童年卡',
  label: '儿童持卡人',
  requirementText: '儿童年卡需实名绑定，入园时核验证件或身高，并由监护人陪同。',
  nameRequired: true,
  mobileRequired: true,
  certificateRequired: true,
  qualificationText: '儿童年卡适用范围以现场要求为准，请确认儿童符合购买条件。',
};

const travelerRoleRuleMap: Record<string, TicketTravelerSlotRule> = {
  adult: adultSlotRule,
  child: childSlotRule,
  senior: seniorSlotRule,
  annualAdult: annualAdultSlotRule,
  annualChild: annualChildSlotRule,
};

const travelerNameFields = ['travelerName', 'holderName', 'name'];
const travelerMobileFields = ['travelerPhone', 'holderPhone', 'mobile', 'phone'];
const travelerCertificateFields = ['travelerIdCard', 'holderIdCard', 'idCard', 'certificateNo'];

function repeatSlotRules(rule: TicketTravelerSlotRule, count: number) {
  return Array.from({ length: count }, () => rule);
}

function hasRequiredField(product: TicketOrderDraftProduct, fieldNames: string[]) {
  return product.requiredFields?.some((field) => fieldNames.includes(field)) ?? false;
}

function hasAnyRealNameField(product: TicketOrderDraftProduct) {
  if (product.realNameRequired === false) return false;
  if (product.realNameRequired === true) return true;

  return Boolean(product.mobileRequired)
    || Boolean(product.certificateRequired)
    || hasRequiredField(product, travelerNameFields)
    || hasRequiredField(product, travelerMobileFields)
    || hasRequiredField(product, travelerCertificateFields);
}

function shouldCreateTravelerSlots(product: TicketOrderDraftProduct) {
  return hasAnyRealNameField(product);
}

// 后端新契约显式返回实名要求时优先按后端字段判断；历史数据缺字段时继续兼容现有实名字段。
export function isTicketDraftProductIdentityRequired(product: TicketOrderDraftProduct) {
  return hasAnyRealNameField(product);
}

// 当前线上策略是一单复用一组实名；只要任一明细需要实名，结算页就展示这一组表单。
export function isTicketOrderIdentityRequired(products: TicketOrderDraftProduct[]) {
  return products.some(isTicketDraftProductIdentityRequired);
}

// 以后端 SKU 实名字段为准调整本地表单必填项；无实名字段的快速通/票种只保留订单联系人。
function applyProductRealNameRule(
  product: TicketOrderDraftProduct,
  rule: TicketTravelerSlotRule,
): TicketTravelerSlotRule {
  if (!hasAnyRealNameField(product)) {
    return {
      ...rule,
      nameRequired: false,
      mobileRequired: false,
      certificateRequired: false,
      requirementText: '当前票种不需要补充实名出游人信息。',
      qualificationText: undefined,
    };
  }

  const nameRequired = hasRequiredField(product, travelerNameFields);
  const mobileRequired = Boolean(product.mobileRequired)
    || hasRequiredField(product, travelerMobileFields);
  const certificateRequired = Boolean(product.certificateRequired)
    || hasRequiredField(product, travelerCertificateFields);

  return {
    ...rule,
    nameRequired,
    mobileRequired,
    certificateRequired,
  };
}

// 根据产品结构准备出游人填写项，不把各平台 UI 照搬到页面层。
function resolveTravelerSlotRules(product: TicketOrderDraftProduct) {
  if (!shouldCreateTravelerSlots(product)) return [];

  if (product.travelerRoles?.length) {
    return Array.from({ length: product.quantity }).flatMap(() => (
      product.travelerRoles || []
    ).map((role) => applyProductRealNameRule(product, travelerRoleRuleMap[role] || adultSlotRule)));
  }

  if (product.id === '4000000000001004') {
    return Array.from({ length: product.quantity }).flatMap(() => [
      applyProductRealNameRule(product, adultSlotRule),
      applyProductRealNameRule(product, childSlotRule),
    ]);
  }

  if (product.id === '4000000000001002') {
    return repeatSlotRules(applyProductRealNameRule(product, seniorSlotRule), product.quantity);
  }

  if (product.id === '4000000000001003') {
    return repeatSlotRules(applyProductRealNameRule(product, childSlotRule), product.quantity);
  }

  if (product.id === '4000000000002002') {
    return repeatSlotRules(applyProductRealNameRule(product, annualChildSlotRule), product.quantity);
  }

  if (product.id === '4000000000002001') {
    return repeatSlotRules(applyProductRealNameRule(product, annualAdultSlotRule), product.quantity);
  }

  if (product.id === '4000000000002003') {
    return Array.from({ length: product.quantity }).flatMap(() => [
      applyProductRealNameRule(product, annualAdultSlotRule),
      applyProductRealNameRule(product, annualAdultSlotRule),
      applyProductRealNameRule(product, annualChildSlotRule),
    ]);
  }

  if (product.id === '4000000000002004') {
    return Array.from({ length: product.quantity }).flatMap(() => [
      applyProductRealNameRule(product, annualAdultSlotRule),
      applyProductRealNameRule(product, annualAdultSlotRule),
      applyProductRealNameRule(product, annualChildSlotRule),
      applyProductRealNameRule(product, annualChildSlotRule),
    ]);
  }

  if (product.id === '4000000000002005') {
    return Array.from({ length: product.quantity }).flatMap(() => [
      applyProductRealNameRule(product, annualAdultSlotRule),
      applyProductRealNameRule(product, annualChildSlotRule),
    ]);
  }

  if (product.category === 'annualCard') {
    return repeatSlotRules(applyProductRealNameRule(product, annualAdultSlotRule), product.quantity);
  }

  return repeatSlotRules(applyProductRealNameRule(product, adultSlotRule), product.quantity);
}

// 归一化票务 SKU 编号，兼容购票菜单同步到票务商品后的标准票种编号。
function resolveTicketSkuId(product: TicketOrderDraftProduct) {
  const productCode = product.productCode || product.id;
  return product.skuId || `${productCode}_standard`;
}

// 生成统一订单票务请求，价格、库存、优惠和出票由后端统一确认。
export function buildTicketUnifiedOrderRequest(
  draft: TicketOrderDraft,
  payload: SubmitTicketOrderDraftPayload,
): BffOrderUnifiedRequest {
  const selectedCouponNos = payload.selectedCouponId ? [payload.selectedCouponId] : [];
  const identityRequired = isTicketOrderIdentityRequired(draft.products);
  const certificateNo = identityRequired
    ? payload.travelers.find((traveler) => Boolean(traveler.idCard))?.idCard || payload.contact.idCard
    : '';
  const travelerSummary = identityRequired
    ? payload.travelers
      .map((traveler) => `${traveler.name}/${traveler.idCard}/${traveler.productId}`)
      .join(';')
    : '';
  const context: Record<string, string> = {
    visitDate: payload.selectedDate,
    parkName: draft.parkName,
    identityRequired: identityRequired ? 'true' : 'false',
  };
  if (certificateNo) context.certificateNo = certificateNo;
  if (travelerSummary) context.travelerSummary = travelerSummary;

  return {
    sceneType: 'TICKET',
    channel: 'MINI_PROGRAM',
    paymentChannel: 'WECHAT',
    selectedCouponNos,
    contactName: identityRequired ? payload.contact.name : undefined,
    contactPhone: identityRequired ? payload.contact.mobile : undefined,
    context,
    items: draft.products.map((product, index) => ({
      lineNo: String(index + 1),
      itemId: product.productCode || product.id,
      skuId: resolveTicketSkuId(product),
      itemType: product.category === 'annualCard' ? 'TICKET_CARD' : 'TICKET_PRODUCT',
      quantity: product.quantity,
      attributes: {
        visitDate: payload.selectedDate,
        productCode: product.productCode || product.id,
        productTitle: product.title,
        imageUrl: sanitizeMallRuntimeUrl(product.imageSrc, { allowMockImage: true }),
        skuId: resolveTicketSkuId(product),
        skuName: product.skuName || '',
        fulfillmentType: product.fulfillmentType || '',
        realNameRequired: isTicketDraftProductIdentityRequired(product) ? 'true' : 'false',
        requiredFields: JSON.stringify(product.requiredFields || []),
        verificationMethods: JSON.stringify(product.verificationMethods || (product.verificationMethod ? [product.verificationMethod] : [])),
        entryMethods: JSON.stringify(product.entryMethods || []),
        ...(product.cardRule ? { cardRule: JSON.stringify(product.cardRule) } : {}),
        usageInstructionHtml: product.usageInstructionHtml || '',
        travelers: isTicketDraftProductIdentityRequired(product) ? JSON.stringify(payload.travelers) : '[]',
        travelerIds: isTicketDraftProductIdentityRequired(product)
          ? payload.travelers.map((traveler) => traveler.idCard).filter(Boolean).join(',')
          : '',
      },
    })),
  };
}

// 生成门票订单草稿编号，仅用于本地确认单草稿，不参与真实订单编号。
function createTicketDraftId() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TICKET-DRAFT-${Date.now()}${random}`;
}

// 生成门票订单草稿更新时间，用于草稿排序和本地恢复确认单。
function createTicketDraftTime() {
  const date = new Date();
  const pad = (value: number) => `${value}`.padStart(2, '0');

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
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
        nameRequired: Boolean(rule.nameRequired),
        mobileRequired: Boolean(rule.mobileRequired),
        certificateRequired: Boolean(rule.certificateRequired),
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
  const now = createTicketDraftTime();
  const contact = {
    name: '',
    mobile: '',
    idCard: '',
  };
  const draft: TicketOrderDraft = {
    id: createTicketDraftId(),
    parkName: payload.parkName,
    selectedDate: payload.selectedDate,
    products: payload.products,
    coupons: payload.coupons,
    selectedCouponId: payload.selectedCouponId,
    source: payload.source,
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

// 清理已过期门票草稿，只处理门票 storage，不影响酒店和商城草稿。
export function pruneTicketOrderDrafts() {
  const drafts = listTicketOrderDrafts();
  saveTicketOrderDrafts(drafts);
  return drafts;
}

// 删除指定门票订单草稿，订单创建成功后只清当前门票 draftId。
export function removeTicketOrderDraft(draftId?: string) {
  saveTicketOrderDrafts(removeCheckoutDraftById(listTicketOrderDrafts(), draftId));
}

// 更新门票订单草稿，确认订单页改日期、优惠券或联系人后写回。
export function updateTicketOrderDraft(draftId: string, patch: Partial<TicketOrderDraft>) {
  const drafts = listTicketOrderDrafts();
  const current = drafts.find((draft) => draft.id === draftId);
  if (!current) return undefined;

  const nextDraft: TicketOrderDraft = {
    ...current,
    ...patch,
    updatedAt: createTicketDraftTime(),
  };

  saveTicketOrderDrafts(drafts.map((draft) => (draft.id === draftId ? nextDraft : draft)));
  return nextDraft;
}

// 提交门票订单草稿并创建真实统一订单；门票创建后必须继续发起真实微信预支付。
export async function submitTicketOrderDraft(draftId: string, payload: SubmitTicketOrderDraftPayload): Promise<TicketOrderSubmitResult | undefined> {
  const draft = getTicketOrderDraft(draftId);
  if (!draft) return undefined;

  const nextDraft = updateTicketOrderDraft(draftId, {
    selectedDate: payload.selectedDate,
    selectedCouponId: payload.selectedCouponId,
    addonQuantity: payload.addonQuantity,
    contact: payload.contact,
    travelers: payload.travelers,
  }) || draft;

  const request = buildTicketCheckoutOrderRequest(nextDraft, payload);
  const requestFingerprint = createCheckoutRequestFingerprint(request);
  const submitOptions: SubmitAndPayBffOrderOptions = {
    sceneLabel: '门票订单',
    onCheckoutCompleted: (result) => {
      removeTicketOrderDraft(draftId);
      markTicketBookingRefreshNeeded({ draftId, orderNo: result.orderNo });
    },
    validateCreatedOrder: (order) => {
      if (String(order.orderStatus || '').toUpperCase() === 'CLOSED') {
        throw new Error('门票出票失败，请稍后重试或联系工作人员');
      }
    },
    isOrderComplete: (order) => isBffTicketOrderIssued(order.orderStatus, order.ticketVouchers, order.annualCards),
  };
  const reusablePendingOrder = canReuseCheckoutPendingOrder(nextDraft.pendingOrder, requestFingerprint);

  if (!reusablePendingOrder && nextDraft.pendingOrder) {
    updateTicketOrderDraft(draftId, { pendingOrder: undefined });
  }

  const submitResult = reusablePendingOrder
    ? restoreCheckoutPendingResult(nextDraft.pendingOrder!, submitOptions)
    : await submitAndPayBffOrder(request, submitOptions);
  const pendingOrder = buildCheckoutPendingOrder(submitResult, requestFingerprint);
  if (!reusablePendingOrder && pendingOrder) {
    updateTicketOrderDraft(draftId, { pendingOrder });
  }

  return {
    id: submitResult.orderNo,
    orderNo: submitResult.orderNo,
    orderStatus: submitResult.orderStatus,
    payableAmount: submitResult.payableAmount,
    payableAmountCent: submitResult.payableAmountCent,
    order: submitResult.order,
    ticketVouchers: submitResult.order?.ticketVouchers,
    payment: submitResult.payment,
    completeCheckout: submitResult.completeCheckout,
  };
}

// 支付预下单成功后回写同一门票草稿的待支付快照，支付失败后继续使用同一订单号。
export function persistTicketCheckoutPendingOrder(
  draftId: string,
  payload: SubmitTicketOrderDraftPayload,
  result: CheckoutSubmitResult,
) {
  const draft = getTicketOrderDraft(draftId);
  if (!draft) return;

  const request = buildTicketCheckoutOrderRequest(draft, payload);
  const pendingOrder = buildCheckoutPendingOrder(result, createCheckoutRequestFingerprint(request));
  if (pendingOrder) {
    updateTicketOrderDraft(draftId, { pendingOrder });
  }
}

// 微信支付取消后原订单会被后端取消，清除本地待支付快照，下一次提交重新建单。
export function clearTicketCheckoutPendingOrder(draftId: string) {
  if (!draftId) return;

  updateTicketOrderDraft(draftId, { pendingOrder: undefined });
}
