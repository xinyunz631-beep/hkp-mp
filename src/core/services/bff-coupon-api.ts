import { request } from '@/core/request';

export type BffCouponSceneType = 'TICKET' | 'MALL' | 'HOTEL' | 'DINING' | 'ALL' | string;
export type BffCouponStatus =
  | 'AVAILABLE'
  | 'LOCKED'
  | 'USED'
  | 'EXPIRED'
  | 'DISABLED'
  | 'VOIDED'
  | 'RETURNED'
  | 'available'
  | 'locked'
  | 'used'
  | 'expired'
  | 'disabled'
  | 'voided'
  | 'returned'
  | string;

export interface BffCouponAssetView {
  couponNo: string;
  templateNo?: string;
  templateId?: string;
  couponName?: string;
  title?: string;
  description?: string;
  sceneType?: BffCouponSceneType;
  couponType?: string;
  thresholdAmountCent?: number;
  thresholdAmount?: number;
  discountAmountCent?: number;
  discountAmount?: number;
  amount?: number;
  discountRate?: number;
  status?: BffCouponStatus;
  reason?: string;
  source?: string;
  sourceName?: string;
  applicableSceneTypes?: BffCouponSceneType[];
  applicableObjectIds?: string[];
  useType?: string;
  buttonText?: string;
  packageNo?: string;
  lockedOrderNo?: string;
  usedOrderNo?: string;
  refundReturnStatus?: string;
  issuedAt?: string;
  validStartAt?: string;
  validEndAt?: string;
  lockedAt?: string;
  usedAt?: string;
}

export interface BffMemberCouponsResponse {
  sceneType?: BffCouponSceneType;
  status?: BffCouponStatus;
  coupons?: BffCouponAssetView[];
  list?: BffCouponAssetView[];
  total?: number;
  page?: number;
  size?: number;
  pageSize?: number;
  hasMore?: boolean;
  statusCounts?: Partial<Record<BffCouponStatus, number>>;
}

export interface BffCouponTemplateView {
  templateNo: string;
  templateId?: string;
  templateName: string;
  title?: string;
  sceneType: BffCouponSceneType;
  couponType?: string;
  thresholdAmountCent?: number;
  thresholdAmount?: number;
  discountAmountCent?: number;
  discountAmount?: number;
  amount?: number;
  issueStartAt?: string;
  issueEndAt?: string;
  validStartAt?: string;
  validEndAt?: string;
  totalStock?: number;
  issuedStock?: number;
  remainingStock?: number | null;
  perUserLimit?: number;
  claimedCount?: number;
  claimable?: boolean;
  reason?: string;
}

export interface BffCouponPackageView {
  packageNo: string;
  packageId?: string;
  packageName?: string;
  packageStatus?: string;
  source?: string;
  sceneType?: BffCouponSceneType;
  couponNos?: string[];
  coupons?: BffCouponTemplateView[];
  validStartAt?: string;
  validEndAt?: string;
  claimable?: boolean;
  reason?: string;
}

export interface BffCouponPackagesResponse {
  sceneType?: BffCouponSceneType;
  packages?: BffCouponPackageView[];
  list?: BffCouponPackageView[];
  total?: number;
  page?: number;
  size?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export interface BffClaimCouponRequest {
  templateNo: string;
}

export interface BffClaimCouponResponse {
  coupon?: BffCouponAssetView;
}

export interface BffAvailableCouponView {
  couponNo: string;
  templateNo?: string;
  templateId?: string;
  couponName?: string;
  title?: string;
  sceneType?: BffCouponSceneType;
  thresholdAmountCent?: number;
  thresholdAmount?: number;
  discountAmountCent?: number;
  discountAmount?: number;
  amount?: number;
  status?: BffCouponStatus;
  available?: boolean;
  selected?: boolean;
  reason?: string;
  unavailableReason?: string;
  priority?: number;
  mutexGroup?: string;
  validEndAt?: string;
}

export interface BffAvailableCouponsResponse {
  sceneType?: BffCouponSceneType;
  coupons?: BffAvailableCouponView[];
  list?: BffAvailableCouponView[];
}

export interface FetchBffAvailableCouponsParams {
  sceneType: BffCouponSceneType;
  orderAmountCent?: number;
  itemIds?: string[];
  skuIds?: string[];
  visitDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
}

export interface BffKcoinBalance {
  pointsBalance?: number;
  availablePoints?: number;
  frozenPoints?: number;
  updatedAt?: string;
}

export interface BffKcoinLedger {
  ledgerNo?: string;
  bizType?: string;
  pointsDelta?: number;
  beforeBalance?: number;
  afterBalance?: number;
  relatedNo?: string;
  title?: string;
  changeType?: string;
  remark?: string;
  createdAt?: string;
}

export interface BffKcoinLedgersResponse {
  total?: number;
  list?: BffKcoinLedger[];
  page?: number;
  pageSize?: number;
}

export interface FetchBffKcoinLedgersParams {
  page?: number;
  pageSize?: number;
  bizType?: string;
}

export interface BffKcoinExchangeRequest {
  itemNo: string;
  quantity: number;
  idempotencyKey: string;
}

export interface BffKcoinExchangeResponse {
  exchangeNo?: string;
  itemNo?: string;
  quantity?: number;
  couponNos?: string[];
  packageNos?: string[];
  pointsCost?: number;
  beforeBalance?: number;
  afterBalance?: number;
  status?: string;
  message?: string;
  idempotent?: boolean;
}

export interface BffCouponRefundReturnRequest {
  orderNo: string;
  refundNo: string;
  reason?: string;
}

export interface BffCouponRefundReturnResponse {
  orderNo?: string;
  refundNo?: string;
  returnedCount?: number;
  returnedCouponNos?: string[];
  operatedAt?: string;
}

type QueryValue = string | number | string[] | undefined;

// 把 BFF 查询参数转换为 query string，数组按后端约定用英文逗号拼接。
function appendQuery(url: string, params: Record<string, QueryValue>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .map(([key, value]) => {
      const queryValue = Array.isArray(value) ? value.filter(Boolean).join(',') : value;
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(queryValue))}`;
    })
    .join('&');

  return query ? `${url}?${query}` : url;
}

// 归一化后端券状态，兼容当前大写枚举和必补文档里的小写枚举。
export function normalizeBffCouponStatus(status?: BffCouponStatus) {
  return String(status || '').trim().toUpperCase();
}

// 判断券是否可用，优先使用后端未来的 available 字段。
export function isBffCouponAvailable(coupon: Pick<BffAvailableCouponView, 'available' | 'status'>) {
  if (typeof coupon.available === 'boolean') return coupon.available;
  return normalizeBffCouponStatus(coupon.status) === 'AVAILABLE';
}

// 读取券标题，兼容当前 couponName 和后续 title 字段。
export function getBffCouponTitle(coupon: Pick<BffCouponAssetView, 'couponName' | 'title'>, fallback: string) {
  return coupon.couponName || coupon.title || fallback;
}

// 读取券优惠金额，单位统一按分处理。
export function getBffCouponAmountCent(coupon: Pick<BffCouponAssetView, 'discountAmountCent' | 'discountAmount' | 'amount'>) {
  return coupon.discountAmountCent ?? coupon.discountAmount ?? coupon.amount ?? 0;
}

// 读取券使用门槛，单位统一按分处理。
export function getBffCouponThresholdCent(coupon: Pick<BffCouponAssetView, 'thresholdAmountCent' | 'thresholdAmount'>) {
  return coupon.thresholdAmountCent ?? coupon.thresholdAmount ?? 0;
}

// 读取不可用原因，兼容当前 reason 和后续 unavailableReason 字段。
export function getBffCouponReason(coupon: Pick<BffAvailableCouponView, 'reason' | 'unavailableReason' | 'available' | 'status'>) {
  return coupon.unavailableReason || coupon.reason || (isBffCouponAvailable(coupon) ? '可用' : '暂不可用');
}

// 读取会员券列表，兼容当前 coupons 和后续分页 list。
export function getBffMemberCouponList(response: BffMemberCouponsResponse) {
  return response.list ?? response.coupons ?? [];
}

// 读取券包列表，兼容当前 packages 和后续分页 list。
export function getBffCouponPackageList(response: BffCouponPackagesResponse) {
  return response.list ?? response.packages ?? [];
}

// 读取可用券列表，兼容当前 coupons 和后续 list。
export function getBffAvailableCouponList(response: BffAvailableCouponsResponse) {
  return response.list ?? response.coupons ?? [];
}

// 查询当前会员名下 promotion 同源券资产，前端不传任何会员身份字段。
export function fetchBffMemberCoupons(params: { sceneType?: BffCouponSceneType; status?: BffCouponStatus } = {}) {
  return request<BffMemberCouponsResponse>({
    url: appendQuery('/api/bff/member/coupons', {
      sceneType: params.sceneType,
      status: params.status,
    }),
    method: 'GET',
  });
}

// 查询当前会员可领取券包，当前后端由 promotion 券模板生成券包视图。
export function fetchBffMemberCouponPackages(params: { sceneType?: BffCouponSceneType } = {}) {
  return request<BffCouponPackagesResponse>({
    url: appendQuery('/api/bff/member/coupon-packages', {
      sceneType: params.sceneType,
    }),
    method: 'GET',
  });
}

// 按真实券模板领取优惠券，写接口必须带 HMAC 签名。
export function claimBffCoupon(data: BffClaimCouponRequest) {
  return request<BffClaimCouponResponse, BffClaimCouponRequest>({
    url: '/api/bff/promotion/coupons/claim',
    method: 'POST',
    data,
    sign: true,
  });
}

// 查询当前订单场景下可用券，最终优惠金额仍以后端订单确认为准。
export function fetchBffCouponAvailable(params: FetchBffAvailableCouponsParams) {
  return request<BffAvailableCouponsResponse>({
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

// 查询当前会员 K 币余额，BFF 会从登录态推导会员身份。
export function fetchBffKcoinBalance() {
  return request<BffKcoinBalance>({
    url: '/api/bff/member/kcoin/balance',
    method: 'GET',
  });
}

// 查询当前会员 K 币流水。
export function fetchBffKcoinLedgers(params: FetchBffKcoinLedgersParams = {}) {
  return request<BffKcoinLedgersResponse>({
    url: appendQuery('/api/bff/member/kcoin/ledgers', {
      page: params.page,
      pageSize: params.pageSize,
      bizType: params.bizType,
    }),
    method: 'GET',
  });
}

// 提交 K 币兑换，当前后端会写 CRM 券实例；promotion 资产同源仍需后端补齐。
export function exchangeBffKcoin(data: BffKcoinExchangeRequest) {
  return request<BffKcoinExchangeResponse, BffKcoinExchangeRequest>({
    url: '/api/bff/member/kcoin/exchanges',
    method: 'POST',
    data,
    sign: true,
  });
}

// 退款后退回已核销券，通常由订单售后链路触发。
export function refundReturnBffCoupons(data: BffCouponRefundReturnRequest) {
  return request<BffCouponRefundReturnResponse, BffCouponRefundReturnRequest>({
    url: '/api/bff/promotion/coupons/refund-return',
    method: 'POST',
    data,
    sign: true,
  });
}
