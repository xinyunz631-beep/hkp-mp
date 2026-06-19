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
  | 'FROZEN'
  | string;

export interface BffCouponAssetView {
  couponNo: string;
  templateNo: string;
  couponName: string;
  sceneType: BffCouponSceneType;
  couponType?: string;
  thresholdAmountCent?: number;
  discountAmountCent?: number;
  discountPercent?: number;
  maxDiscountCent?: number;
  status: BffCouponStatus;
  reason?: string;
  issuedAt?: string;
  validStartAt?: string;
  validEndAt?: string;
  lockedAt?: string;
  usedAt?: string;
  source?: string;
  sourceName?: string;
  packageNo?: string;
  lockedOrderNo?: string;
  usedOrderNo?: string;
  refundReturnStatus?: string;
}

export interface BffMemberCouponsResponse {
  sceneType?: BffCouponSceneType;
  status?: BffCouponStatus;
  coupons?: BffCouponAssetView[];
  list?: BffCouponAssetView[];
  total?: number;
  page?: number;
  size?: number;
  hasMore?: boolean;
  statusCounts?: Partial<Record<BffCouponStatus, number>>;
}

export interface FetchBffMemberCouponsParams {
  sceneType?: BffCouponSceneType;
  status?: BffCouponStatus;
  page?: number;
  size?: number;
}

export interface BffCouponTemplateView {
  templateNo: string;
  templateName: string;
  sceneType: BffCouponSceneType;
  couponType?: string;
  thresholdAmountCent?: number;
  discountAmountCent?: number;
  discountPercent?: number;
  maxDiscountCent?: number;
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
  packageName: string;
  sceneType: BffCouponSceneType;
  coupons?: BffCouponTemplateView[];
  claimable?: boolean;
  reason?: string;
}

export interface BffCouponPackagesResponse {
  sceneType?: BffCouponSceneType;
  packages?: BffCouponPackageView[];
}

export interface BffClaimCouponRequest {
  templateNo: string;
}

export interface BffClaimCouponResponse {
  coupon?: BffCouponAssetView;
}

export interface BffAvailableCouponView {
  couponNo: string;
  templateNo: string;
  couponName: string;
  sceneType: BffCouponSceneType;
  thresholdAmountCent?: number;
  discountAmountCent?: number;
  discountPercent?: number;
  maxDiscountCent?: number;
  status: BffCouponStatus;
  selected?: boolean;
  available?: boolean;
  reason?: string;
  unavailableReason?: string;
  validEndAt?: string;
  discountAmount?: number;
  priority?: number;
  mutexGroup?: string;
}

export interface BffAvailableCouponsResponse {
  sceneType?: BffCouponSceneType;
  coupons?: BffAvailableCouponView[];
}

export interface FetchBffAvailableCouponsParams {
  sceneType: BffCouponSceneType;
  orderAmountCent?: number;
  itemIds?: string | string[];
  skuIds?: string | string[];
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
  status?: 'success' | 'pending' | 'failed' | string;
  message?: string;
  idempotent?: boolean;
}

export interface BffCouponRefundReturnRequest {
  orderNo: string;
  refundNo: string;
  sceneType?: BffCouponSceneType;
  couponNos?: string[];
  refundAmountCent?: number;
  refundType?: string;
  idempotencyKey?: string;
  reason?: string;
}

export interface BffCouponRefundReturnResponse {
  orderNo?: string;
  refundNo?: string;
  returnedCount?: number;
  returnedCouponNos?: string[];
  operatedAt?: string;
}

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

// 查询当前会员名下 promotion 同源券资产，前端不传任何会员身份字段。
export function fetchBffMemberCoupons(params: FetchBffMemberCouponsParams = {}) {
  return request<BffMemberCouponsResponse>({
    url: appendQuery('/api/bff/member/coupons', {
      sceneType: params.sceneType,
      status: params.status,
      page: params.page,
      size: params.size,
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

// 提交 K 币兑换，后端会同步生成同一 couponNo 的会员券资产。
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
