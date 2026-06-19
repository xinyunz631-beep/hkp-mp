import { request } from '@/core/request';
import { resolveCurrentMiniProgramAppId } from '@/core/wechat/auth';

export type BffOrderSceneType = 'TICKET' | 'MALL' | 'HOTEL';
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
  const issuedStatus = ['WAIT_USE', 'FULFILLING', 'PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED', 'USED', 'FULFILLED', 'COMPLETED']
    .includes(normalizedStatus);

  return issuedStatus && Boolean(ticketVouchers?.some((voucher) => isBffTicketVoucherReady(voucher)));
}

export interface BffOrder {
  orderNo: string;
  sceneType?: BffOrderSceneType;
  orderStatus?: string;
  paymentChannel?: BffOrderPaymentChannel;
  channel?: string;
  originalAmountCent?: number;
  freightAmountCent?: number;
  discountAmountCent?: number;
  freightDiscountCent?: number;
  payableAmountCent?: number;
  quoteSnapshotNo?: string;
  promotionSnapshotNo?: string;
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

export function fetchBffOrderDetail(orderNo: string, options: { showErrorToast?: boolean } = {}) {
  return request<BffOrder>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}`,
    method: 'GET',
    showErrorToast: options.showErrorToast,
  });
}

export function fetchBffOrders(sceneType: BffOrderSceneType = 'TICKET') {
  return request<BffOrder[]>({
    url: appendQuery('/api/bff/orders', { sceneType }),
    method: 'GET',
  });
}
