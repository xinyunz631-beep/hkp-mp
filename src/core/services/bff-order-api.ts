import { request } from '@/core/request';

export type BffOrderSceneType = 'TICKET' | 'MALL' | 'DINING' | string;
export type BffOrderPaymentChannel = 'WECHAT' | 'ALIPAY' | string;

export interface BffOrderSubmitItem {
  lineNo: string;
  itemId: string;
  itemType: string;
  itemName: string;
  categoryId?: string;
  brandId?: string;
  unitPriceCent: number;
  quantity: number;
  attributes?: Record<string, string>;
}

export interface BffOrderSubmitRequest {
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
  createPayment?: boolean;
  items: BffOrderSubmitItem[];
}

export interface BffOrderItem {
  lineNo?: string;
  itemId?: string;
  itemType?: string;
  itemName?: string;
  categoryId?: string;
  brandId?: string;
  unitPriceCent?: number;
  quantity?: number;
  amountCent?: number;
  attributes?: Record<string, string>;
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
  [key: string]: unknown;
}

export interface BffOrderSubmitResponse {
  order: BffOrder;
  promotionQuote?: Record<string, unknown>;
  promotionLock?: Record<string, unknown>;
  prepay?: BffOrderPrepay;
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

export function fetchBffOrderDetail(orderNo: string) {
  return request<BffOrder>({
    url: `/api/bff/orders/${encodeURIComponent(orderNo)}`,
    method: 'GET',
  });
}

export function fetchBffOrders(sceneType: BffOrderSceneType = 'TICKET') {
  return request<BffOrder[]>({
    url: appendQuery('/api/bff/orders', { sceneType }),
    method: 'GET',
  });
}
