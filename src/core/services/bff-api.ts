import Taro from '@tarojs/taro';
import { ApiRequestError, ensureCsession, request } from '@/core/request';
import { getRuntimeConfig } from '@/core/config/runtime';
import { rootStore } from '@/core/store';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { resolveCurrentMiniProgramAppId } from '@/core/wechat/auth';
import type { BffCrmProfile } from '@/core/services/bff-crm-api';

export type BffSceneType = 'TICKET' | 'MALL' | 'HOTEL' | 'DINING' | string;
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
}

interface BffPrepayPayload extends BffPrepayRequest {
  appId: string;
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
  orderAmountCent?: number;
  itemIds?: string | string[];
  skuIds?: string | string[];
  visitDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

export interface BffHolidaySyncOptions {
  years?: string;
}

export interface BffMemberInfo {
  nickName?: string;
  avatarUrl?: string;
  phone?: string;
  birthday?: string;
  gender?: string;
  levelCode?: string;
  levelName?: string;
  levelNo?: number;
  badgeColor?: string;
  iconUrl?: string;
  growthValue?: number;
  status?: string;
}

export interface BffMemberStatusResponse {
  memberLoggedIn: boolean;
  memberInfo?: BffMemberInfo | null;
}

export interface BffPhoneAuthorizeRequest {
  code?: string;
  response?: string;
  encryptedData?: string;
  sign?: string;
  signType?: string;
}

export interface BffPhoneAuthorizeResponse {
  platform?: string;
  phoneNumber?: string;
  purePhoneNumber?: string;
  countryCode?: string;
  profile: BffCrmProfile;
}

export interface BffImageUploadResponse {
  imageUrl: string;
}

interface BffImageUploadPayload {
  success?: boolean;
  code?: string | number;
  message?: string;
  msg?: string;
  errMsg?: string;
  imageUrl?: string;
  data?: BffImageUploadResponse | string;
}

export type BffLooseResponse = Record<string, unknown>;

const UPLOAD_CREDENTIAL_INVALID_CODES = new Set([
  '401',
  '10008',
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_SESSION_EXPIRED',
  'AUTH_TOKEN_LOGGED_OUT',
]);

// 将查询参数拼到接口地址上，保证签名时 query 与真实请求一致。
function appendQuery(url: string, params: Record<string, string | number | string[] | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .flatMap(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values
        .filter((item): item is string | number => typeof item !== 'undefined' && item !== '')
        .map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    })
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

// 查询当前 BFF token 是否已关联带手机号的会员资料。
export function fetchBffMemberStatus(showErrorToast = false) {
  return request<BffMemberStatusResponse>({
    url: '/api/bff/auth/member/status',
    method: 'GET',
    showErrorToast,
    skipAuthStatusSync: true,
  });
}

// 提交微信/支付宝官方手机号授权凭证，成功后由后端写入会员资料。
export function authorizeBffMiniProgramPhone(data: BffPhoneAuthorizeRequest) {
  return request<BffPhoneAuthorizeResponse, BffPhoneAuthorizeRequest>({
    url: '/api/bff/auth/mini-program/phone/authorize',
    method: 'POST',
    data,
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
  return request<BffPaymentStatus, BffPrepayPayload>({
    url: '/api/bff/pay/prepay',
    method: 'POST',
    data: {
      ...data,
      appId: resolveCurrentMiniProgramAppId(),
    },
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
      orderAmountCent: params.orderAmountCent,
      itemIds: params.itemIds,
      skuIds: params.skuIds,
      visitDate: params.visitDate,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
    }),
    method: 'GET',
  });
}

// 解析上传接口响应，兼容 Taro uploadFile 返回字符串和少量调试对象。
function parseBffImageUploadPayload(data: unknown, statusCode: number): BffImageUploadPayload {
  if (data && typeof data === 'object') return data as BffImageUploadPayload;

  try {
    return JSON.parse(String(data || '{}')) as BffImageUploadPayload;
  } catch {
    throw new ApiRequestError(resolveErrorMessage(data, '图片上传失败'), {
      statusCode,
      retryable: false,
    });
  }
}

// 判断上传接口失败是否来自登录态失效，uploadFile 需要自行补一次 token 刷新重试。
function isBffImageUploadCredentialInvalid(statusCode: number, payload: BffImageUploadPayload) {
  return statusCode === 401 || UPLOAD_CREDENTIAL_INVALID_CODES.has(String(payload.code));
}

// 提取上传成功后的线上图片地址，后端只允许页面消费真实 imageUrl。
function resolveBffImageUploadUrl(payload: BffImageUploadPayload) {
  if (typeof payload.data === 'object' && payload.data?.imageUrl) return payload.data.imageUrl;
  if (typeof payload.data === 'string') return payload.data;
  return payload.imageUrl;
}

// 发送一次图片上传请求，调用方负责处理登录态失效后的重试。
async function uploadBffImageOnce(filePath: string, accessToken: string) {
  return Taro.uploadFile({
    url: `${getRuntimeConfig().apiHost}/api/bff/files/images`,
    filePath,
    name: 'file',
    header: {
      Authorization: `Bearer ${accessToken}`,
      'ngrok-skip-browser-warning': '1',
    },
  });
}

// 上传小程序图片文件，只走真实 BFF 上传接口，不使用本地假地址兜底。
export async function uploadBffImage(filePath: string) {
  let response = await uploadBffImageOnce(filePath, await ensureCsession());
  let payload = parseBffImageUploadPayload(response.data, response.statusCode);

  if (isBffImageUploadCredentialInvalid(response.statusCode, payload)) {
    response = await uploadBffImageOnce(filePath, await ensureCsession(true));
    payload = parseBffImageUploadPayload(response.data, response.statusCode);
  }

  const imageUrl = resolveBffImageUploadUrl(payload);
  if (response.statusCode < 200 || response.statusCode >= 300 || payload.success === false || !imageUrl) {
    throw new ApiRequestError(resolveErrorMessage(payload, '图片上传失败'), {
      code: payload.code,
      statusCode: response.statusCode,
      retryable: false,
    });
  }

  return { imageUrl };
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
