import { request } from '@/core/request';
import { resolveCurrentMiniProgramAppId } from '@/core/wechat/auth';

export type BffOrderSceneType = 'TICKET' | 'MALL' | 'HOTEL' | 'DINING' | 'ALL';
export type BffOrderPaymentChannel = 'WECHAT' | 'ALIPAY' | string;

export interface BffOrderSelectionItem {
  lineNo: string;
  itemId: string;
  skuId?: string;
  itemType?: string;
  quantity: number;
  attributes?: Record<string, string>;
}

export interface BffOrderUnifiedRequest {
  sceneType: BffOrderSceneType;
  memberLevel?: string;
  channel?: string;
  paymentChannel?: BffOrderPaymentChannel;
  freightAmountCent?: number;
  selectedCouponNos?: string[];
  context?: Record<string, string>;
  contactName?: string;
  contactPhone?: string;
  remark?: string;
  items: BffOrderSelectionItem[];
}

export interface BffOrderSubmitItem extends BffOrderSelectionItem {
  itemType: string;
  itemName: string;
  categoryId?: string;
  brandId?: string;
  unitPriceCent: number;
}

export interface BffOrderSubmitRequest extends Omit<BffOrderUnifiedRequest, 'items'> {
  createPayment?: boolean;
  items: BffOrderSubmitItem[];
}

export interface BffOrderItem {
  lineNo?: string;
  itemId?: string;
  skuId?: string;
  itemType?: string;
  itemName?: string;
  categoryId?: string;
  brandId?: string;
  unitPriceCent?: number;
  quantity?: number;
  amountCent?: number;
  attributes?: Record<string, string>;
}

export interface BffOrderRejectedCoupon {
  couponNo?: string;
  reason?: string;
  unavailableReason?: string;
  status?: string;
}

export interface BffOrderCouponView {
  couponNo?: string;
  couponName?: string;
  displayName?: string;
  [key: string]: unknown;
}

export interface BffTicketInstance {
  ticketNo?: string;
  qrCodePayload?: string;
  productName?: string;
  skuName?: string;
  status?: string;
  visitDate?: string;
  validStartAt?: string;
  validEndAt?: string;
  remainingUseTimes?: number;
  usedTimes?: number;
}

export interface BffTicketVoucher {
  source?: string;
  orderCode?: string;
  subOrderCode?: string;
  ticketCode?: string;
  voucherCode?: string;
  qrCodePayload?: string;
  codeImage?: string;
  qrImage?: string;
  qrCodeUrl?: string;
  ticketStatus?: string;
  visitDate?: string;
  useDate?: string;
  entryTime?: string;
  entryTimeText?: string;
  admissionTime?: string;
  admissionTimeText?: string;
  validTime?: string;
  validTimeText?: string;
  entryAddress?: string;
  admissionAddress?: string;
  venueAddress?: string;
  notice?: string;
  refundRule?: string;
  qualificationRule?: string;
  useInstruction?: string;
  usageInstruction?: string;
  useInstructionHtml?: string;
  usageInstructionHtml?: string;
  usedNum?: number;
  totalNum?: number;
  rawFields?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BffAnnualCard {
  cardId?: string;
  cardNo?: string;
  productCode?: string;
  productName?: string;
  skuId?: string;
  skuName?: string;
  status?: string;
  statusText?: string;
  holderName?: string;
  holderMobile?: string;
  holderMobileMasked?: string;
  holderIdCard?: string;
  holderIdCardMasked?: string;
  validFrom?: string;
  validTo?: string;
  activatedAt?: string;
  entryMethods?: string[];
  usageInstructionHtml?: string;
  usageInstructionSummary?: string;
  usageInstruction?: string;
  physicalCardNo?: string;
  createdAt?: string;
  updatedAt?: string;
  orderNo?: string;
  orderItemNo?: string;
  rawFields?: Record<string, unknown>;
  [key: string]: unknown;
}

const BFF_TICKET_VOUCHER_CODE_FIELDS = ['ticketCode', 'voucherCode', 'qrCodePayload', 'codeImage', 'qrImage', 'qrCodeUrl'];

export function getBffTicketVoucherText(voucher: BffTicketVoucher | undefined, key: string) {
  const directValue = voucher?.[key];
  if (typeof directValue === 'string' && directValue) return directValue;

  const rawValue = voucher?.rawFields?.[key];
  return typeof rawValue === 'string' ? rawValue : '';
}

// 判断票务凭证是否可用于入园，避免把后端 FAILED 凭证误当出票成功。
export function isBffTicketVoucherReady(voucher?: BffTicketVoucher) {
  const status = String(
    getBffTicketVoucherText(voucher, 'ticketStatus')
      || getBffTicketVoucherText(voucher, 'status')
      || getBffTicketVoucherText(voucher, 'useStatus')
      || '',
  ).toUpperCase();
  const hasVoucherCode = BFF_TICKET_VOUCHER_CODE_FIELDS.some((key) => getBffTicketVoucherText(voucher, key));
  const blockedStatuses = ['FAILED', 'FAIL', 'VOIDED', 'CANCELED', 'CANCELLED', 'REFUNDED', 'EXPIRED'];

  return hasVoucherCode && !blockedStatuses.includes(status);
}

// 判断年卡资产是否已真实生成；待激活也是支付成功后的有效履约状态。
export function isBffAnnualCardReady(card?: BffAnnualCard) {
  if (!card) return false;
  const status = String(card.status || card.statusText || '').toUpperCase();
  const blockedStatuses = ['FAILED', 'FAIL', 'VOIDED', 'VOID', 'CANCELED', 'CANCELLED', 'REFUNDED'];

  return Boolean(card.cardId || card.cardNo || card.productName) && !blockedStatuses.includes(status);
}

// 判断订单是否已经拿到真实可用履约结果，不能只看 ticketVouchers 数组长度。
export function isBffTicketOrderIssued(orderStatus?: string, ticketVouchers?: BffTicketVoucher[], annualCards?: BffAnnualCard[]) {
  const normalizedStatus = String(orderStatus || '').toUpperCase();
  const issuedStatus = ['WAIT_USE', 'FULFILLING', 'PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED', 'USED', 'FULFILLED', 'COMPLETED', 'SUCCESS']
    .includes(normalizedStatus);

  return issuedStatus && Boolean(
    ticketVouchers?.some((voucher) => isBffTicketVoucherReady(voucher))
      || annualCards?.some((card) => isBffAnnualCardReady(card)),
  );
}

export interface BffOrder {
  orderNo: string;
  sceneType?: BffOrderSceneType;
  orderStatus?: string;
  payNo?: string;
  paymentStatus?: string;
  paymentChannel?: BffOrderPaymentChannel;
  paidAt?: string;
  channel?: string;
  originalAmountCent?: number;
  freightAmountCent?: number;
  discountAmountCent?: number;
  freightDiscountCent?: number;
  payableAmountCent?: number;
  quoteSnapshotNo?: string;
  promotionSnapshotNo?: string;
  selectedCoupons?: BffOrderCouponView[];
  appliedCoupons?: BffOrderCouponView[];
  lockedCoupons?: BffOrderCouponView[];
  releasedCoupons?: BffOrderCouponView[];
  refundReturnedCoupons?: BffOrderCouponView[];
  selectedCouponNos?: string[];
  appliedCouponNos?: string[];
  lockedCouponNos?: string[];
  releasedCouponNos?: string[];
  refundReturnedCouponNos?: string[];
  rejectedCoupons?: BffOrderRejectedCoupon[];
  contactName?: string;
  contactPhone?: string;
  remark?: string;
  context?: Record<string, string>;
  items?: BffOrderItem[];
  ticketInstances?: BffTicketInstance[];
  ticketVouchers?: BffTicketVoucher[];
  annualCards?: BffAnnualCard[];
  payExpireAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BffOrderPageResult {
  list?: BffOrder[];
  items?: BffOrder[];
  records?: BffOrder[];
  total?: number;
  totalCount?: number;
  page?: number;
  current?: number;
  size?: number;
  pageSize?: number;
  hasMore?: boolean;
  statusCounts?: Record<string, number | string>;
  tabCounts?: Record<string, number | string>;
  sceneCounts?: Record<string, number | string>;
  tabs?: BffOrderTabCount[];
}

export interface BffOrderTabCount {
  key?: string;
  text?: string;
  count?: number | string;
}

export interface NormalizedBffOrderPage {
  orders: BffOrder[];
  page: number;
  pageSize: number;
  total?: number;
  hasMore: boolean;
  locallyPaged?: boolean;
  tabCounts?: Record<string, number>;
  tabs?: BffOrderTabCount[];
}

export interface FetchBffOrdersOptions {
  showErrorToast?: boolean;
  page?: number;
  size?: number;
  status?: string;
}

export interface FetchMergedBffOrderPageOptions extends FetchBffOrdersOptions {
  pageSize?: number;
  scenes?: BffOrderSceneType[];
}

export interface FetchBffOrderStatusCountsOptions {
  showErrorToast?: boolean;
}

export interface BffOrderStatusCounts {
  total?: number;
  pendingPay?: number;
  pendingPayment?: number;
  unpaid?: number;
  pendingReceive?: number;
  pendingUse?: number;
  pendingFulfillment?: number;
  pendingReview?: number;
  aftersale?: number;
  afterSale?: number;
  refunding?: number;
  counts?: BffOrderStatusCounts;
  statusCounts?: BffOrderStatusCounts;
  tabCounts?: Record<string, number | string>;
  sceneCounts?: Record<string, number | string>;
  tabs?: BffOrderTabCount[];
  [key: string]: unknown;
}

const DEFAULT_BFF_ORDER_SCENES: BffOrderSceneType[] = ['TICKET', 'MALL', 'HOTEL'];

export interface BffOrderPrepay {
  payNo?: string;
  orderNo?: string;
  channel?: BffOrderPaymentChannel;
  amountCent?: number;
  status?: string;
  payParams?: Record<string, unknown>;
  paymentParams?: Record<string, unknown>;
  reason?: string;
  [key: string]: unknown;
}

export interface BffOrderSubmitResponse {
  order: BffOrder;
  promotionQuote?: Record<string, unknown>;
  promotionLock?: Record<string, unknown>;
  prepay?: BffOrderPrepay;
}

export interface BffPromotionDiscountLine {
  discountCode?: string;
  discountName?: string;
  discountType?: string;
  couponNo?: string;
  discountAmountCent?: number;
  affectedLineNos?: string[];
  [key: string]: unknown;
}

export interface BffPromotionCouponView {
  couponNo?: string;
  templateNo?: string;
  couponName?: string;
  displayName?: string;
  sceneType?: string;
  thresholdAmountCent?: number;
  thresholdAmount?: number;
  discountAmountCent?: number;
  discountPercent?: number;
  discountRate?: number;
  maxDiscountCent?: number;
  status?: string;
  selected?: boolean;
  reason?: string;
  available?: boolean;
  unavailableReason?: string;
  discountAmount?: number;
  amount?: number;
  validEndAt?: string;
  priority?: number;
  mutexGroup?: string;
  [key: string]: unknown;
}

export interface BffPromotionQuoteResponse {
  sceneType?: BffOrderSceneType;
  quoteSnapshotNo?: string;
  originalAmountCent?: number;
  freightAmountCent?: number;
  discountAmountCent?: number;
  freightDiscountCent?: number;
  payableAmountCent?: number;
  appliedDiscounts?: BffPromotionDiscountLine[];
  itemAllocations?: Record<string, unknown>[];
  availableCoupons?: BffPromotionCouponView[];
  mutualExclusionMessages?: string[];
  quotedAt?: string;
  [key: string]: unknown;
}

export interface BffOrderConfirmResponse {
  sceneType?: BffOrderSceneType;
  channel?: string;
  paymentChannel?: BffOrderPaymentChannel;
  items?: BffOrderItem[];
  originalAmountCent?: number;
  freightAmountCent?: number;
  discountAmountCent?: number;
  freightDiscountCent?: number;
  payableAmountCent?: number;
  quoteSnapshotNo?: string;
  promotionQuote?: BffPromotionQuoteResponse;
  context?: Record<string, string>;
  warnings?: string[];
  confirmedAt?: string;
}

export interface BffOrderCreateResponse {
  order: BffOrder;
  confirmation?: BffOrderConfirmResponse;
  promotionLock?: Record<string, unknown>;
}

export interface BffOrderPaymentResponse {
  order: BffOrder;
  prepay?: BffOrderPrepay;
}

export interface BffOrderConfirmReceiveRequest {
  receivedAt?: string;
  remark?: string;
}

export interface BffOrderConfirmReceiveResponse {
  orderNo?: string;
  orderStatus?: string;
  fulfillmentStatus?: string;
  reviewStatus?: string;
  updatedAt?: string;
}

export interface BffOrderStatusSnapshotTicketVoucher {
  ticketCode?: string;
  voucherCode?: string;
  ticketStatus?: string;
  usedNum?: number;
  totalNum?: number;
}

export interface BffOrderStatusSnapshot {
  orderNo?: string;
  sceneType?: BffOrderSceneType;
  orderStatus?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
  refundStatus?: string;
  aftersaleStatus?: string;
  logisticsStatus?: string;
  reviewStatus?: string;
  payNo?: string;
  version?: number;
  updatedAt?: string;
  ticketVoucherVersion?: number;
  ticketVouchersSummary?: BffOrderStatusSnapshotTicketVoucher[];
}

interface BffOrderPaymentPayload {
  paymentChannel: BffOrderPaymentChannel;
  appId: string;
}

export interface BffOrderOperationResponse {
  order?: BffOrder;
  orderNo?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
}

export interface BffOrderReviewDraftData {
  orderNo?: string;
  itemId?: string;
  productId?: string;
  productTitle?: string;
  productImageUrl?: string;
  alreadySubmitted?: boolean;
  submitTip?: string;
}

export interface BffCreateOrderReviewRequest {
  orderNo: string;
  itemId?: string;
  rating?: number;
  tags?: string[];
  content: string;
  imageUrls?: string[];
  anonymous?: boolean;
}

export interface BffCreateOrderReviewResponse {
  reviewId?: string;
  reviewStatus?: string;
  auditTip?: string;
}

export interface BffOrderSummaryImageAsset {
  src?: string;
  url?: string;
  imageUrl?: string;
  alt?: string;
}

export interface BffOrderSummaryProduct {
  id?: string;
  title?: string;
  subtitle?: string;
  image?: BffOrderSummaryImageAsset;
  imageUrl?: string;
  imageSrc?: string;
  mainImageUrl?: string;
  skuText?: string;
  price?: number;
  quantity?: number;
  attributes?: Record<string, string | undefined>;
}

export interface BffOrderSummary {
  id?: string;
  statusText?: string;
  merchantName?: string;
  products?: BffOrderSummaryProduct[];
  totalAmount?: number;
  countText?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
}

export interface BffOrderLogisticsTraceItem {
  id?: string;
  timeText?: string;
  detailText?: string;
}

export interface BffOrderLogisticsData {
  productImageSrc?: string;
  statusText?: string;
  companyText?: string;
  trackingNumberText?: string;
  hotlineText?: string;
  quantityText?: string;
  totalAmountText?: string;
  confirmButtonText?: string;
  traces?: BffOrderLogisticsTraceItem[];
}

export interface BffOrderAftersaleTypeOptionData {
  key?: string;
  title?: string;
  desc?: string;
  amountText?: string;
  tagText?: string;
}

export interface BffOrderAftersaleTypeData {
  order?: BffOrderSummary;
  tipText?: string;
  types?: BffOrderAftersaleTypeOptionData[];
}

export interface BffOrderAftersaleDraftData {
  order?: BffOrderSummary;
  selectedTypeText?: string;
  reasons?: string[];
  defaultReason?: string;
  refundAmountText?: string;
  contactName?: string;
  contactMobile?: string;
  placeholderText?: string;
  uploadHintText?: string;
  serviceTipText?: string;
  submitButtonText?: string;
}

export interface BffOrderAftersaleSubmitRequest {
  typeText?: string;
  reasonText?: string;
  remarkText?: string;
  imageUrls?: string[];
}

export interface BffOrderAftersaleRecordData {
  id?: string;
  tabKey?: string;
  serviceNo?: string;
  typeText?: string;
  statusText?: string;
  statusDesc?: string;
  amountText?: string;
  createdAt?: string;
  buttonText?: string;
  order?: BffOrderSummary;
}

export interface BffOrderAftersaleListTabData {
  key?: string;
  text?: string;
  count?: number;
}

export interface BffOrderAftersaleListData {
  tabs?: BffOrderAftersaleListTabData[];
  records?: BffOrderAftersaleRecordData[];
  unavailableReason?: string;
}

export interface BffOrderAftersaleProgressStepData {
  id?: string;
  title?: string;
  timeText?: string;
  detailText?: string;
}

export interface BffOrderAftersaleFieldData {
  label?: string;
  value?: string;
}

export interface BffOrderAftersaleProgressData {
  order?: BffOrderSummary;
  serviceNo?: string;
  typeText?: string;
  statusText?: string;
  statusDesc?: string;
  refundAmountText?: string;
  reasonText?: string;
  fields?: BffOrderAftersaleFieldData[];
  progress?: BffOrderAftersaleProgressStepData[];
  primaryButtonText?: string;
  unavailableReason?: string;
}

export interface BffOrderCancelRequest {
  reason?: string;
}

export interface BffOrderRefundRequest {
  refundAmountCent?: number;
  lineNos?: string[];
  reason?: string;
}

function appendQuery(url: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `${url}?${query}` : url;
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  return Number.isFinite(value) && Number(value) > 0 ? Math.floor(Number(value)) : fallback;
}

function normalizeOrderNo(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function isBffOrderPageResult(response: BffOrder[] | BffOrderPageResult): response is BffOrderPageResult {
  return Boolean(response && !Array.isArray(response) && typeof response === 'object');
}

function readBffOrderPageOrders(response: BffOrder[] | BffOrderPageResult) {
  if (Array.isArray(response)) return response;
  return response.list || response.items || response.records || [];
}

function readBffOrderPageTotal(response: BffOrderPageResult) {
  if (typeof response.total === 'number' && response.total >= 0) return response.total;
  if (typeof response.totalCount === 'number' && response.totalCount >= 0) return response.totalCount;
  return undefined;
}

function normalizeCountRecord(record?: Record<string, number | string>) {
  if (!record) return undefined;
  return Object.entries(record).reduce<Record<string, number>>((result, [key, value]) => {
    const numberValue = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(numberValue)) {
      result[key] = Math.max(0, Math.floor(numberValue));
    }
    return result;
  }, {});
}

export function sortBffOrdersByCreatedAt(orders: BffOrder[]) {
  return orders.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function dedupeBffOrders(orders: BffOrder[]) {
  const seenOrderNos = new Set<string>();
  return orders.filter((order) => {
    const orderNo = normalizeOrderNo(order.orderNo);
    if (!orderNo || seenOrderNos.has(orderNo)) return false;
    seenOrderNos.add(orderNo);
    return true;
  });
}

export function normalizeBffOrderPage(
  response: BffOrder[] | BffOrderPageResult,
  page: number,
  pageSize: number,
): NormalizedBffOrderPage {
  const responseOrders = readBffOrderPageOrders(response);
  if (!isBffOrderPageResult(response)) {
    const shouldSliceLocally = responseOrders.length > pageSize;
    const startIndex = shouldSliceLocally ? (page - 1) * pageSize : 0;
    const orders = shouldSliceLocally
      ? responseOrders.slice(startIndex, startIndex + pageSize)
      : responseOrders;

    return {
      orders,
      page,
      pageSize,
      hasMore: shouldSliceLocally
        ? startIndex + pageSize < responseOrders.length
        : orders.length === pageSize,
      locallyPaged: shouldSliceLocally,
    };
  }

  const orders = responseOrders;
  const responsePageSize = normalizePositiveInteger(response.size ?? response.pageSize, pageSize);
  const responsePage = normalizePositiveInteger(response.page ?? response.current, page);
  const total = readBffOrderPageTotal(response);
  const tabCounts = normalizeCountRecord(response.tabCounts);
  const hasMore = typeof response.hasMore === 'boolean'
    ? response.hasMore
    : typeof total === 'number'
      ? responsePage * responsePageSize < total
      : orders.length >= responsePageSize;

  return {
    orders,
    page: responsePage,
    pageSize: responsePageSize,
    total,
    hasMore,
    locallyPaged: false,
    tabCounts,
    tabs: response.tabs,
  };
}

// 调用订单中心新版聚合分页接口，承接后端三业态分页和状态 Tab 计数。
export async function fetchBffOrderCenterPage(
  sceneType: BffOrderSceneType,
  page: number,
  pageSize: number,
  status?: string,
  showErrorToast = true,
) {
  const response = await request<BffOrderPageResult>({
    url: appendQuery('/api/bff/orders/page', {
      sceneType,
      status,
      page,
      pageSize,
    }),
    method: 'GET',
    showErrorToast,
  });
  return normalizeBffOrderPage(response, page, pageSize);
}

export async function fetchBffOrderPage(
  sceneType: BffOrderSceneType,
  page: number,
  pageSize: number,
  showErrorToast = true,
) {
  const response = await fetchBffOrders(sceneType, {
    page,
    size: pageSize,
    showErrorToast,
  });
  return normalizeBffOrderPage(response, page, pageSize);
}

export async function fetchMergedBffOrderPage(
  options: FetchMergedBffOrderPageOptions = {},
): Promise<NormalizedBffOrderPage> {
  const page = normalizePositiveInteger(options.page, 1);
  const pageSize = normalizePositiveInteger(options.pageSize ?? options.size, 10);
  const scenes = options.scenes?.length ? options.scenes : DEFAULT_BFF_ORDER_SCENES;
  const allPage = await fetchBffOrderCenterPage('ALL', page, pageSize, options.status, false)
    .catch(() => fetchBffOrderPage('ALL', page, pageSize, false))
    .catch(() => undefined);
  if (allPage && (allPage.orders.length > 0 || typeof allPage.total === 'number')) return allPage;

  const sceneResults = await Promise.allSettled(
    scenes.map((scene) => fetchBffOrderPage(scene, page, pageSize, options.showErrorToast ?? true)),
  );
  const scenePages = sceneResults
    .filter((result): result is PromiseFulfilledResult<NormalizedBffOrderPage> => result.status === 'fulfilled')
    .map((result) => result.value);
  if (!scenePages.length) {
    const rejected = sceneResults.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    throw rejected?.reason || new Error('ORDER_LIST_UNAVAILABLE');
  }

  const mergedOrders = sortBffOrdersByCreatedAt(dedupeBffOrders(scenePages.flatMap((scenePage) => scenePage.orders)));
  const filteredOrders = options.status && options.status !== 'all'
    ? mergedOrders.filter((order) => {
      const normalizedStatus = String(order.orderStatus || '').toUpperCase();
      const normalizedTab = String(options.status || '').toLowerCase();
      if (normalizedTab === 'pendingpay') return ['PENDING', 'PENDING_PAYMENT', 'UNPAID', 'PAYING'].includes(normalizedStatus);
      if (normalizedTab === 'pendingreceive') return ['PAID', 'WAIT_USE', 'FULFILLING', 'PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus);
      if (normalizedTab === 'pendingreview') return ['FULFILLED', 'USED', 'COMPLETED', 'SUCCESS'].includes(normalizedStatus);
      if (normalizedTab === 'aftersale') return ['REFUNDING', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED'].includes(normalizedStatus);
      return normalizedStatus === String(options.status || '').toUpperCase();
    })
    : mergedOrders;
  const total = scenePages.every((scenePage) => typeof scenePage.total === 'number')
    ? scenePages.reduce((sum, scenePage) => sum + (scenePage.total || 0), 0)
    : undefined;
  const hasScenePagingSignal = scenePages.some((scenePage) => (
    scenePage.locallyPaged || scenePage.hasMore || typeof scenePage.total === 'number'
  ));
  const shouldSliceMergedLocally = !hasScenePagingSignal && filteredOrders.length > pageSize;
  const startIndex = shouldSliceMergedLocally ? (page - 1) * pageSize : 0;

  return {
    orders: filteredOrders.slice(startIndex, startIndex + pageSize),
    page,
    pageSize,
    total: options.status && options.status !== 'all' ? filteredOrders.length : total,
    hasMore: shouldSliceMergedLocally
      ? startIndex + pageSize < filteredOrders.length
      : scenePages.some((scenePage) => scenePage.hasMore) || filteredOrders.length > pageSize,
  };
}

// 会员页订单角标优先消费后端轻量计数接口；老后端未发布时由调用方静默降级。
export function fetchBffOrderStatusCounts(
  sceneType: BffOrderSceneType = 'ALL',
  options: FetchBffOrderStatusCountsOptions = {},
) {
  return request<BffOrderStatusCounts>({
    url: appendQuery('/api/bff/orders/status-counts', { sceneType }),
    method: 'GET',
    showErrorToast: options.showErrorToast ?? false,
  });
}

export function submitBffOrder(data: BffOrderSubmitRequest) {
  return request<BffOrderSubmitResponse, BffOrderSubmitRequest>({
    url: '/api/bff/orders/submit',
    method: 'POST',
    data,
    sign: true,
  });
}

// 调用统一订单确认接口，确认酒店、票务、商城的价格、库存和优惠。
export function confirmBffOrder(data: BffOrderUnifiedRequest) {
  return request<BffOrderConfirmResponse, BffOrderUnifiedRequest>({
    url: '/api/bff/orders/confirm',
    method: 'POST',
    data: {
      ...data,
      freightAmountCent: data.freightAmountCent ?? 0,
    },
    sign: true,
  });
}

// 创建统一订单，酒店链路使用该接口落库并锁定库存/优惠。
export function createBffOrder(data: BffOrderUnifiedRequest) {
  return request<BffOrderCreateResponse, BffOrderUnifiedRequest>({
    url: '/api/bff/orders',
    method: 'POST',
    data: {
      ...data,
      freightAmountCent: data.freightAmountCent ?? 0,
    },
    sign: true,
  });
}

// 为已创建订单发起支付，显式携带当前运行小程序 AppID，避免支付预下单串到错误主体。
export function payBffOrder(orderNo: string, paymentChannel: BffOrderPaymentChannel = 'WECHAT') {
  return request<BffOrderPaymentResponse, BffOrderPaymentPayload>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}/pay`,
    method: 'POST',
    data: {
      paymentChannel,
      appId: resolveCurrentMiniProgramAppId(),
    },
    sign: true,
  });
}

// 商城订单确认收货，后端负责校验订单业态和可确认状态。
export function confirmReceiveBffOrder(
  orderNo: string,
  data: BffOrderConfirmReceiveRequest = {},
  options: { showErrorToast?: boolean } = {},
) {
  return request<BffOrderConfirmReceiveResponse, BffOrderConfirmReceiveRequest>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}/confirm-receive`,
    method: 'POST',
    data,
    showErrorToast: options.showErrorToast,
  });
}

// 查询订单轻量状态快照，用于页面后台轮询探针，探针结果不直接渲染。
export function fetchBffOrderStatusSnapshot(orderNo: string, options: { showErrorToast?: boolean } = {}) {
  return request<BffOrderStatusSnapshot>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}/status-snapshot`,
    method: 'GET',
    showErrorToast: options.showErrorToast,
  });
}

// 取消未支付统一订单，库存锁和优惠锁由后端释放。
export function cancelBffOrder(orderNo: string, data: BffOrderCancelRequest = {}) {
  return request<BffOrderOperationResponse, BffOrderCancelRequest>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}/cancel`,
    method: 'POST',
    data,
    sign: true,
  });
}

// 发起统一订单退款，默认整单退款；退款金额和可退性由后端校验。
export function refundBffOrder(orderNo: string, data: BffOrderRefundRequest = {}) {
  return request<BffOrderOperationResponse, BffOrderRefundRequest>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}/refunds`,
    method: 'POST',
    data,
    sign: true,
  });
}

// 提交商城售后申请，由 BFF 统一收口申请类型、原因、备注和退款调用。
export function submitBffOrderAftersale(orderNo: string, data: BffOrderAftersaleSubmitRequest = {}) {
  return request<BffOrderOperationResponse, BffOrderAftersaleSubmitRequest>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}/aftersales`,
    method: 'POST',
    data,
    sign: true,
  });
}

export function fetchBffOrderDetail(orderNo: string, options: { showErrorToast?: boolean } = {}) {
  return request<BffOrder>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}`,
    method: 'GET',
    showErrorToast: options.showErrorToast,
  });
}

export function fetchBffOrders(
  sceneType: BffOrderSceneType = 'TICKET',
  options: FetchBffOrdersOptions = {},
) {
  return request<BffOrder[] | BffOrderPageResult>({
    url: appendQuery('/api/bff/orders', {
      sceneType,
      page: options.page,
      size: options.size,
    }),
    method: 'GET',
    showErrorToast: options.showErrorToast,
  });
}

// 查询订单评价草稿，确保前端只展示当前登录用户可评价的真实商品。
export function fetchBffOrderReviewDraft(orderNo: string, itemId?: string, showErrorToast = true) {
  return request<BffOrderReviewDraftData>({
    url: appendQuery('/api/bff/orders/reviews/draft', {
      orderNo,
      itemId,
    }),
    method: 'GET',
    showErrorToast,
  });
}

// 提交订单评价，内容、图片和匿名态均走真实 BFF 接口。
export function submitBffOrderReview(data: BffCreateOrderReviewRequest) {
  return request<BffCreateOrderReviewResponse, BffCreateOrderReviewRequest>({
    url: '/api/bff/orders/reviews',
    method: 'POST',
    data,
    sign: true,
  });
}

export function fetchBffOrderLogistics(orderNo: string, showErrorToast = true) {
  return request<BffOrderLogisticsData>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}/logistics`,
    method: 'GET',
    showErrorToast,
  });
}

export function fetchBffOrderAftersaleTypes(orderNo: string, showErrorToast = true) {
  return request<BffOrderAftersaleTypeData>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}/aftersales/types`,
    method: 'GET',
    showErrorToast,
  });
}

export function fetchBffOrderAftersaleDraft(
  orderNo: string,
  params: { typeText?: string } = {},
  showErrorToast = true,
) {
  return request<BffOrderAftersaleDraftData>({
    url: appendQuery(`/api/bff/orders/${encodeURIComponent(orderNo)}/aftersales/draft`, {
      typeText: params.typeText,
    }),
    method: 'GET',
    showErrorToast,
  });
}

export function fetchBffOrderAftersales(showErrorToast = true) {
  return request<BffOrderAftersaleListData>({
    url: '/api/bff/orders/aftersales',
    method: 'GET',
    showErrorToast,
  });
}

export function fetchBffOrderAftersaleProgress(
  orderNo: string,
  params: { typeText?: string; reasonText?: string } = {},
  showErrorToast = true,
) {
  return request<BffOrderAftersaleProgressData>({
    url: appendQuery(`/api/bff/orders/${encodeURIComponent(orderNo)}/aftersales/progress`, {
      typeText: params.typeText,
      reasonText: params.reasonText,
    }),
    method: 'GET',
    showErrorToast,
  });
}
