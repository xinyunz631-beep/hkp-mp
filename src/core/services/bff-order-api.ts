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
  usedNum?: number;
  totalNum?: number;
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

// 判断订单是否已经拿到真实可用票券，不能只看 ticketVouchers 数组长度。
export function isBffTicketOrderIssued(orderStatus?: string, ticketVouchers?: BffTicketVoucher[]) {
  const normalizedStatus = String(orderStatus || '').toUpperCase();
  const issuedStatus = ['WAIT_USE', 'FULFILLING', 'PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED', 'USED', 'FULFILLED', 'COMPLETED', 'SUCCESS']
    .includes(normalizedStatus);

  return issuedStatus && Boolean(ticketVouchers?.some((voucher) => isBffTicketVoucherReady(voucher)));
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
  payExpireAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

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

export interface BffOrderConfirmResponse {
  sceneType?: BffOrderSceneType;
  channel?: string;
  paymentChannel?: BffOrderPaymentChannel;
  selectedCouponNos?: string[];
  appliedCouponNos?: string[];
  rejectedCoupons?: BffOrderRejectedCoupon[];
  items?: BffOrderItem[];
  originalAmountCent?: number;
  freightAmountCent?: number;
  discountAmountCent?: number;
  freightDiscountCent?: number;
  payableAmountCent?: number;
  quoteSnapshotNo?: string;
  promotionQuote?: Record<string, unknown>;
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
  alt?: string;
}

export interface BffOrderSummaryProduct {
  id?: string;
  title?: string;
  subtitle?: string;
  image?: BffOrderSummaryImageAsset;
  skuText?: string;
  price?: number;
  quantity?: number;
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
  options: { showErrorToast?: boolean } = {},
) {
  return request<BffOrder[]>({
    url: appendQuery('/api/bff/orders', { sceneType }),
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
