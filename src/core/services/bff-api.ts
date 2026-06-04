import { ApiRequestError, request } from '@/core/request';
import { rootStore } from '@/core/store';

export type BffSceneType = 'TICKET' | 'MALL' | 'DINING' | string;
export type BffPayChannel = 'WECHAT' | 'ALIPAY' | string;

export interface BffAuthTokenResponse {
  tokenType?: string;
  accessToken: string;
  expiresIn?: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
  signSecret?: string;
}

export interface BffPrepayRequest {
  orderNo: string;
  channel: BffPayChannel;
  amountCent: number;
  subject: string;
  description?: string;
  userUuid: string;
  channelOpenId: string;
}

export interface BffPaymentStatus {
  payNo?: string;
  orderNo?: string;
  channel?: BffPayChannel;
  amountCent?: number;
  status?: string;
  payParams?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BffPromotionItem {
  lineNo: string;
  itemId: string;
  itemType: string;
  itemName: string;
  categoryId?: string;
  brandId?: string;
  unitPriceCent: number;
  quantity: number;
  attributes?: Record<string, unknown>;
}

export interface BffPromotionQuoteRequest {
  sceneType: BffSceneType;
  userId: string;
  memberLevel?: string;
  channel: string;
  freightAmountCent?: number;
  items: BffPromotionItem[];
  selectedCouponNos?: string[];
  context?: Record<string, unknown>;
}

export interface BffPromotionLockRequest {
  quoteSnapshotNo: string;
  orderNo: string;
}

export interface BffPromotionConfirmRequest {
  promotionSnapshotNo: string;
  orderNo: string;
  payNo?: string;
}

export interface BffPromotionReleaseRequest {
  promotionSnapshotNo: string;
  orderNo: string;
  reason?: string;
}

export interface BffAvailableCouponsParams {
  sceneType: BffSceneType;
  userId: string;
  orderAmountCent?: number;
}

export interface BffHolidaySyncOptions {
  years?: string;
}

export type BffLooseResponse = Record<string, unknown>;

// 将查询参数拼到接口地址上，保证签名时 query 与真实请求一致。
function appendQuery(url: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `${url}?${query}` : url;
}

// 将认证响应写入会员全局状态，供后续 Authorization 和 HMAC 签名使用。
function applyAuthSession(response: BffAuthTokenResponse) {
  rootStore.member.setAuthSession({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    signSecret: response.signSecret,
  });
  return response;
}

// 刷新 BFF 登录令牌，同时轮换 refreshToken 和 signSecret。
export async function refreshBffAuthSession(refreshToken = rootStore.member.refreshToken) {
  if (!refreshToken) {
    throw new ApiRequestError('缺少刷新令牌，请重新登录', { retryable: false });
  }

  const response = await request<BffAuthTokenResponse, { refreshToken: string }>({
    url: '/api/bff/auth/refresh',
    method: 'POST',
    data: { refreshToken },
    auth: 'none',
  });

  return applyAuthSession(response);
}

// 登出当前 BFF 会话，带 refreshToken 时会让后端一并失效刷新令牌。
export function logoutBffAuthSession(refreshToken = rootStore.member.refreshToken) {
  return request<void, { refreshToken: string } | undefined>({
    url: '/api/bff/auth/logout',
    method: 'POST',
    data: refreshToken ? { refreshToken } : undefined,
    auth: 'optional',
    sign: true,
  });
}

// 查询 BFF 聚合的后端模块状态。
export function fetchBffModules() {
  return request<BffLooseResponse>({
    url: '/api/bff/modules',
    method: 'GET',
  });
}

// 查询后台默认配置在 BFF 边界的聚合快照。
export function fetchBffAdminConfigDefaults() {
  return request<BffLooseResponse>({
    url: '/api/bff/admin-config/defaults',
    method: 'GET',
  });
}

// 创建小程序支付预支付单，高风险写接口必须携带 HMAC 签名。
export function createBffPrepayOrder(data: BffPrepayRequest) {
  return request<BffPaymentStatus, BffPrepayRequest>({
    url: '/api/bff/pay/prepay',
    method: 'POST',
    data,
    sign: true,
  });
}

// 查询支付状态，后端必要时会主动同步渠道支付结果。
export function fetchBffPaymentStatus(payNo: string) {
  return request<BffPaymentStatus>({
    url: `/api/bff/pay/payments/${encodeURIComponent(payNo)}`,
    method: 'GET',
  });
}

// 促销试算，覆盖门票、商城、餐饮统一优惠计算。
export function quoteBffPromotion(data: BffPromotionQuoteRequest) {
  return request<BffLooseResponse, BffPromotionQuoteRequest>({
    url: '/api/bff/promotion/quote',
    method: 'POST',
    data,
    sign: true,
  });
}

// 锁定促销试算快照和优惠券。
export function lockBffPromotion(data: BffPromotionLockRequest) {
  return request<BffLooseResponse, BffPromotionLockRequest>({
    url: '/api/bff/promotion/lock',
    method: 'POST',
    data,
    sign: true,
  });
}

// 支付成功后核销已锁定的优惠。
export function confirmBffPromotion(data: BffPromotionConfirmRequest) {
  return request<BffLooseResponse, BffPromotionConfirmRequest>({
    url: '/api/bff/promotion/confirm',
    method: 'POST',
    data,
    sign: true,
  });
}

// 订单取消或支付超时后释放已锁定优惠。
export function releaseBffPromotion(data: BffPromotionReleaseRequest) {
  return request<BffLooseResponse, BffPromotionReleaseRequest>({
    url: '/api/bff/promotion/release',
    method: 'POST',
    data,
    sign: true,
  });
}

// 查询当前场景下用户可用优惠券。
export function fetchBffAvailableCoupons(params: BffAvailableCouponsParams) {
  return request<BffLooseResponse>({
    url: appendQuery('/api/bff/promotion/coupons/available', {
      sceneType: params.sceneType,
      userId: params.userId,
      orderAmountCent: params.orderAmountCent,
    }),
    method: 'GET',
  });
}

// 通过 BFF 触发节假日同步，通常只用于受控调试或后台场景。
export function syncBffHoliday(options: BffHolidaySyncOptions = {}) {
  return request<BffLooseResponse>({
    url: appendQuery('/api/bff/xxl-job/holiday/sync', {
      years: options.years,
    }),
    method: 'POST',
    sign: true,
  });
}
