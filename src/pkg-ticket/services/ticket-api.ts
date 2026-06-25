import { request } from '@/core/request';

export interface BffTicketImageAsset {
  id?: string;
  url?: string;
  alt?: string;
  sortOrder?: number;
}

export interface BffTicketSkuRule {
  id: string;
  variantCode?: string;
  name: string;
  audience?: string;
  basePrice?: number;
  marketPrice?: number;
  minQuantity?: number;
  maxQuantity?: number;
  travelerSlotMode?: string;
  travelerRoles?: string[];
  requiredFields?: string[];
  mobileRequired?: boolean;
  certificateRequired?: boolean;
  qualificationRule?: string;
  verificationMethod?: string;
  refundRule?: string;
}

export interface BffTicketProduct {
  productCode: string;
  title: string;
  subtitle?: string;
  productType?: string;
  categorySection?: string;
  coverImages?: BffTicketImageAsset[];
  tags?: string[];
  badgeText?: string;
  minPrice?: number;
  maxPrice?: number;
  saleStatus?: string;
  availableDateSummary?: string;
  dailySaleStartTime?: string;
  dailySaleEndTime?: string;
  entryTimeText?: string;
  entryAddress?: string;
  servicePhone?: string;
  notice?: string;
  refundRule?: string;
  skuRules?: BffTicketSkuRule[];
  publishStatus?: string;
  channels?: string[];
}

export interface BffTicketInventoryDay {
  productId?: string;
  skuId: string;
  date: string;
  price?: number;
  availableStock?: number;
  publishStatus?: string;
  saleStatus?: string;
  restrictionReason?: string;
}

export interface BffTicketCalendarBatchDay {
  date: string;
  minPriceCent?: number;
  availableStock?: number;
  saleStatus?: string;
  restrictionReason?: string;
}

export interface BffTicketProductCalendar {
  productCode: string;
  status?: string;
  message?: string;
  days?: BffTicketCalendarBatchDay[];
}

export interface BffTicketCalendarBatchRequest {
  channel?: string;
  productCodes: string[];
  startDate: string;
  endDate: string;
  visitDate?: string;
}

export interface BffTicketCalendarBatchResponse {
  traceId?: string;
  calendars?: BffTicketProductCalendar[];
}

export interface BffTicketQuoteItem {
  productCode: string;
  skuId?: string;
  variantCode?: string;
  visitDate: string;
  quantity: number;
  attributes?: Record<string, unknown>;
}

export interface BffTicketQuoteRequest {
  visitDate: string;
  channel?: string;
  items: BffTicketQuoteItem[];
  context?: Record<string, unknown>;
}

export interface BffTicketQuoteResponse {
  quoteNo?: string;
  sceneType?: string;
  channel?: string;
  originalAmountCent?: number;
  discountAmountCent?: number;
  payableAmountCent?: number;
}

interface BackendPageResult<TItem> {
  list?: TItem[];
  records?: TItem[];
  items?: TItem[];
  total?: number;
}

// 拼接查询参数，兼容小程序 GET 请求不同端对 data 的处理差异。
function appendQuery(url: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `${url}?${query}` : url;
}

// 归一化后端分页结构，避免页面层感知 list/records/items 差异。
function normalizePageResult<TItem>(result: BackendPageResult<TItem> | TItem[]) {
  if (Array.isArray(result)) return result;
  return result.list || result.records || result.items || [];
}

// 查询小程序可见票务商品。
export async function fetchBffTicketProducts() {
  const result = await request<BackendPageResult<BffTicketProduct>>({
    url: appendQuery('/api/bff/tickets/products', { size: 100 }),
    method: 'GET',
  });
  return normalizePageResult(result);
}

// 查询指定票务商品的库存日历。
export async function fetchBffTicketCalendar(productCode: string, startDate: string, endDate = startDate) {
  const result = await request<BackendPageResult<BffTicketInventoryDay>>({
    url: appendQuery(`/api/bff/tickets/products/${encodeURIComponent(productCode)}/calendar`, {
      startDate,
      endDate,
      size: 500,
    }),
    method: 'GET',
  });
  return normalizePageResult(result);
}

// 批量查询多个票务商品的日期库存摘要，门票预定页首屏用它替代逐商品 calendar。
export async function fetchBffTicketCalendarBatch(data: BffTicketCalendarBatchRequest) {
  const result = await request<BffTicketCalendarBatchResponse, BffTicketCalendarBatchRequest>({
    url: '/api/bff/tickets/products/calendar-batch',
    method: 'POST',
    data,
  });
  return result.calendars || [];
}

// 调用票务报价接口，校验票种、日期和库存对应的小计。
export function quoteBffTickets(data: BffTicketQuoteRequest) {
  return request<BffTicketQuoteResponse, BffTicketQuoteRequest>({
    url: '/api/bff/tickets/quote',
    method: 'POST',
    data,
    sign: true,
  });
}
