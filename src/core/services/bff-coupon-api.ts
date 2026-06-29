import { request } from '@/core/request';
import { parseNumberLike } from '@/core/utils/money';

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
  templateId?: string;
  couponName: string;
  displayName?: string;
  title?: string;
  description?: string;
  sceneType: BffCouponSceneType;
  couponType?: string;
  thresholdAmountCent?: number;
  thresholdAmount?: number;
  discountAmountCent?: number;
  discountAmount?: number;
  amount?: number;
  discountPercent?: number;
  discountRate?: number;
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
  applicableSceneTypes?: BffCouponSceneType[];
  applicableObjectIds?: string[];
  useType?: string;
  buttonText?: string;
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
  templateId?: string;
  templateName: string;
  displayName?: string;
  title?: string;
  sceneType: BffCouponSceneType;
  couponType?: string;
  thresholdAmountCent?: number;
  thresholdAmount?: number;
  discountAmountCent?: number;
  discountAmount?: number;
  amount?: number;
  discountPercent?: number;
  discountRate?: number;
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
  packageId?: string;
  packageName: string;
  packageStatus?: string;
  sceneType: BffCouponSceneType;
  source?: string;
  coupons?: BffCouponTemplateView[];
  couponNos?: string[];
  claimable?: boolean;
  reason?: string;
  validStartAt?: string;
  validEndAt?: string;
  activityId?: string;
  activityName?: string;
}

export interface BffMemberCouponPackageItemView extends BffCouponAssetView {
  reason?: string;
}

export interface BffMemberCouponPackageView {
  packageNo: string;
  packageId?: string;
  packageName: string;
  packageStatus?: string;
  sceneType: BffCouponSceneType;
  source?: string;
  sourceName?: string;
  claimedAt?: string;
  validEndAt?: string;
  totalCount?: number;
  availableCount?: number;
  usedCount?: number;
  expiredCount?: number;
  packageItems?: BffMemberCouponPackageItemView[];
}

export interface BffCouponPackagesResponse {
  sceneType?: BffCouponSceneType;
  packages?: Array<BffMemberCouponPackageView | BffCouponPackageView>;
  list?: Array<BffMemberCouponPackageView | BffCouponPackageView>;
  claimablePackages?: BffCouponPackageView[];
  total?: number;
  page?: number;
  size?: number;
  pageSize?: number;
  hasMore?: boolean;
}

export type BffClaimedCountValue = number | boolean | string;

export interface BffFreeClaimGiftItemView {
  giftId?: string;
  giftType?: string;
  giftObjectId?: string;
  couponNo?: string;
  memberCouponNo?: string;
  claimedCouponNo?: string;
  couponNos?: string[];
  couponInstances?: BffCouponAssetView[];
  templateNo?: string;
  couponTemplateId?: string;
  issueBatchId?: string;
  batchId?: string;
  giftObjectName?: string;
  giftName?: string;
  couponName?: string;
  templateName?: string;
  displayName?: string;
  sendNumber?: number;
  claimUnitCount?: number;
  claimedByCurrentMember?: BffClaimedCountValue;
  currentMemberClaimedCount?: BffClaimedCountValue;
  remainingStock?: number;
  canClaim?: boolean;
  cannotClaimReason?: string;
  couponTemplateStatus?: string;
  issueStartAt?: string;
  issueEndAt?: string;
}

export interface BffFreeClaimActivityView {
  activityId: string;
  activityName: string;
  bannerImage?: string;
  shareTitle?: string;
  startAt?: string;
  endAt?: string;
  activityStatus?: string;
  claimLimitPerMember?: number;
  dailyLimit?: number;
  claimedByCurrentMember?: BffClaimedCountValue;
  canClaim?: boolean;
  canClaimAll?: boolean;
  claimableGiftCount?: number;
  cannotClaimReason?: string;
  totalCouponCount?: number;
  giftItems?: BffFreeClaimGiftItemView[];
}

export interface BffFreeClaimActivitiesResponse {
  list?: BffFreeClaimActivityView[];
  records?: BffFreeClaimActivityView[];
  items?: BffFreeClaimActivityView[];
  total?: number;
  page?: number;
  pageSize?: number;
  size?: number;
  hasMore?: boolean;
}

export interface FetchBffFreeClaimActivitiesParams {
  placement?: string;
  displayTab?: string;
  page?: number;
  pageSize?: number;
}

export interface BffClaimCouponRequest {
  templateNo?: string;
  activityId?: string;
}

export interface BffClaimCouponResponse {
  coupon?: BffCouponAssetView;
  activityId?: string;
  activityName?: string;
  couponNos?: string[];
  coupons?: BffCouponAssetView[];
  successCount?: number;
  failCount?: number;
}

export interface BffFreeClaimActivityClaimRequest {
  claimMode?: 'activityAll' | 'singleGift';
  giftId?: string;
  idempotentKey: string;
  quantity?: number;
}

export interface BffFreeClaimActivityClaimResponse {
  claimRecordId?: string;
  activityId?: string;
  activityName?: string;
  claimMode?: 'activityAll' | 'singleGift';
  couponNos?: string[];
  couponInstances?: BffCouponAssetView[];
  coupons?: BffCouponAssetView[];
  claimedGiftId?: string;
  claimedGiftItems?: Array<{
    giftId?: string;
    giftObjectId?: string;
    templateNo?: string;
    couponTemplateId?: string;
    issuedCount?: number;
    couponNo?: string;
    coupon?: BffCouponAssetView;
    couponInstances?: BffCouponAssetView[];
  }>;
  failedGiftItems?: Array<{
    giftId?: string;
    giftObjectId?: string;
    templateNo?: string;
    couponTemplateId?: string;
    issuedCount?: number;
    code?: string;
    message?: string;
    errorCode?: string;
    errorMessage?: string;
  }>;
  issuedCount?: number;
  claimedByCurrentMember?: BffClaimedCountValue;
  canClaim?: boolean;
  canClaimAll?: boolean;
  nextAction?: {
    type?: string;
    text?: string;
    path?: string;
  };
}

export interface BffFreeClaimActivityMemberRecord {
  claimRecordId?: string;
  activityId?: string;
  activityName?: string;
  couponNos?: string[];
  couponInstances?: BffCouponAssetView[];
  claimAt?: string;
  status?: string;
}

export interface BffFreeClaimActivityMemberRecordsResponse {
  list?: BffFreeClaimActivityMemberRecord[];
  records?: BffFreeClaimActivityMemberRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
}

export interface BffCouponExchangeRequest {
  exchangeCode: string;
}

export interface BffAvailableCouponView {
  couponNo: string;
  templateNo: string;
  templateId?: string;
  couponName: string;
  displayName?: string;
  title?: string;
  sceneType: BffCouponSceneType;
  thresholdAmountCent?: number;
  thresholdAmount?: number;
  discountAmountCent?: number;
  discountPercent?: number;
  discountRate?: number;
  maxDiscountCent?: number;
  status: BffCouponStatus;
  selected?: boolean;
  available?: boolean;
  reason?: string;
  unavailableReason?: string;
  validEndAt?: string;
  discountAmount?: number;
  amount?: number;
  priority?: number;
  mutexGroup?: string;
}

export interface BffAvailableCouponsResponse {
  sceneType?: BffCouponSceneType;
  coupons?: BffAvailableCouponView[];
  list?: BffAvailableCouponView[];
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
  pendingReviewCount?: number;
  pendingReviewCouponNos?: string[];
  notReturnedCount?: number;
  notReturnedCouponNos?: string[];
  operatedAt?: string;
}

function appendQuery(url: string, params: Record<string, string | number | string[] | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .flatMap(([key, value]) => {
      const queryValue = Array.isArray(value)
        ? value.filter((item) => typeof item !== 'undefined' && item !== '').join(',')
        : value;
      return queryValue === '' ? [] : [`${encodeURIComponent(key)}=${encodeURIComponent(String(queryValue))}`];
    })
    .join('&');

  return query ? `${url}?${query}` : url;
}

// 归一化后端券状态，兼容 promotion 早期小写状态和当前大写枚举。
export function normalizeBffCouponStatus(status?: BffCouponStatus) {
  return String(status || '').trim().toUpperCase();
}

// 判断券是否可用，优先尊重后端 available 布尔值，其次兼容大小写状态。
export function isBffCouponAvailable(coupon: { available?: boolean; status?: BffCouponStatus }) {
  if (typeof coupon.available === 'boolean') return coupon.available;
  return normalizeBffCouponStatus(coupon.status) === 'AVAILABLE';
}

// 读取券标题，优先使用 BFF 展示名，再兼容历史名称字段。
export function getBffCouponTitle(
  coupon: { displayName?: string; couponName?: string; title?: string; templateName?: string },
  fallback = '',
) {
  return [coupon.displayName, coupon.couponName, coupon.title, coupon.templateName, fallback]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find(Boolean) || '';
}

// 读取券优惠金额，统一输出分；兼容 discountAmountCent、discountAmount 和 amount。
export function getBffCouponAmountCent(coupon: {
  discountAmountCent?: unknown;
  discountAmount?: unknown;
  amount?: unknown;
}) {
  return [
    coupon.discountAmountCent,
    coupon.discountAmount,
    coupon.amount,
  ].reduce<number | undefined>((matchedAmount, value) => {
    if (typeof matchedAmount === 'number') return matchedAmount;
    const amount = parseNumberLike(value);
    return typeof amount === 'number' ? amount : undefined;
  }, undefined) ?? 0;
}

// 读取券门槛金额，统一输出分；兼容 thresholdAmountCent 和 thresholdAmount。
export function getBffCouponThresholdCent(coupon: {
  thresholdAmountCent?: unknown;
  thresholdAmount?: unknown;
}) {
  return [
    coupon.thresholdAmountCent,
    coupon.thresholdAmount,
  ].reduce<number | undefined>((matchedAmount, value) => {
    if (typeof matchedAmount === 'number') return matchedAmount;
    const amount = parseNumberLike(value);
    return typeof amount === 'number' ? amount : undefined;
  }, undefined) ?? 0;
}

// 读取不可用原因，兼容 reason 和 unavailableReason。
export function getBffCouponReason(coupon: {
  reason?: string;
  unavailableReason?: string;
}) {
  return [coupon.unavailableReason, coupon.reason]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .find(Boolean) || '';
}

// 读取会员券列表，兼容分页 list 和早期 coupons。
export function getBffMemberCouponList(response?: BffMemberCouponsResponse) {
  return response?.list ?? response?.coupons ?? [];
}

// 读取券包列表，兼容分页 list 和早期 packages。
export function getBffCouponPackageList(response?: BffCouponPackagesResponse) {
  return response?.list ?? response?.packages ?? [];
}

// 读取免费领券活动列表，兼容 PageResult 的多种列表字段。
export function getBffFreeClaimActivityList(response?: BffFreeClaimActivitiesResponse) {
  return response?.list ?? response?.records ?? response?.items ?? [];
}

// 读取结算可用券列表，兼容分页 list 和早期 coupons。
export function getBffAvailableCouponList(response?: BffAvailableCouponsResponse) {
  return response?.list ?? response?.coupons ?? [];
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

// 查询活动中心免费领券活动卡，小程序推荐 tab 以活动为展示维度。
export function fetchBffFreeClaimActivities(params: FetchBffFreeClaimActivitiesParams = {}) {
  return request<BffFreeClaimActivitiesResponse>({
    url: appendQuery('/api/bff/activity-center/free-claim-activities', {
      placement: params.placement ?? 'couponCenter',
      displayTab: params.displayTab ?? 'recommend',
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
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

// 按活动维度领取免费领券活动，写接口必须带幂等键和 HMAC 签名。
export function claimBffFreeClaimActivity(activityId: string, data: BffFreeClaimActivityClaimRequest) {
  return request<BffFreeClaimActivityClaimResponse, BffFreeClaimActivityClaimRequest>({
    url: `/api/bff/activity-center/free-claim-activities/${encodeURIComponent(activityId)}/claim`,
    method: 'POST',
    data,
    sign: true,
  });
}

// 查询当前会员在单个免费领券活动下的领取记录。
export function fetchBffFreeClaimActivityMyRecords(activityId: string, params: { page?: number; pageSize?: number } = {}) {
  return request<BffFreeClaimActivityMemberRecordsResponse>({
    url: appendQuery(`/api/bff/activity-center/free-claim-activities/${encodeURIComponent(activityId)}/my-records`, {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    }),
    method: 'GET',
  });
}

// 按后端真实兑换码兑券，兑换结果仍以我的券资产回源为准。
export function exchangeBffCoupon(exchangeCode: string) {
  return request<BffClaimCouponResponse, BffCouponExchangeRequest>({
    url: '/api/bff/promotion/coupons/exchange',
    method: 'POST',
    data: { exchangeCode },
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
