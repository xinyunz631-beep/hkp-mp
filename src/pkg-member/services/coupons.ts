import {
  fetchBffMemberCoupons,
  type BffCouponAssetView,
  type BffCouponSceneType,
  type BffCouponStatus,
} from '@/core/services/bff-coupon-api';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { centToYuan, parseNumberLike } from '@/core/utils/money';

export type MemberCouponStatus = 'claimed' | 'used' | 'expired';
export const MEMBER_COUPON_USE_TYPE_OFFLINE = 1;
export const MEMBER_COUPON_USE_TYPE_ONLINE = 2;
export const MEMBER_COUPON_USE_TYPE_UNKNOWN = 3;

export type MemberCouponUseType =
  | typeof MEMBER_COUPON_USE_TYPE_OFFLINE
  | typeof MEMBER_COUPON_USE_TYPE_ONLINE
  | typeof MEMBER_COUPON_USE_TYPE_UNKNOWN;

export interface MemberCouponTab {
  key: MemberCouponStatus;
  text: string;
  count?: number;
}

export interface MemberCouponItem {
  id: string;
  couponNo: string;
  templateNo: string;
  packageNo: string;
  status: MemberCouponStatus;
  bffStatus: BffCouponStatus;
  statusText: string;
  sideText: string;
  sceneText: string;
  amountText: string;
  couponTypeText: string;
  currencyText: string;
  validityText: string;
  validityPeriodText: string;
  title: string;
  actionText: string;
  useType: MemberCouponUseType;
  sceneType?: BffCouponSceneType;
  useEnabled: boolean;
  targetRoute: string;
  thresholdText: string;
  benefitText: string;
  sourceText: string;
  reasonText: string;
  issuedAtText: string;
  lockedAtText: string;
  usedAtText: string;
  orderNoText: string;
  refundReturnStatusText: string;
}

export interface MemberCouponsData {
  tabs: MemberCouponTab[];
  coupons: MemberCouponItem[];
  moreButtonText: string;
}

let memberCouponSnapshot: MemberCouponItem[] = [];
let memberCouponsLoaded = false;
let memberCouponsRequest: Promise<MemberCouponItem[]> | null = null;

function formatYuan(amountCent: unknown = 0) {
  const amount = centToYuan(amountCent);
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDate(dateText?: string) {
  if (!dateText) return '';
  return dateText.slice(0, 10).replace(/-/g, '.');
}

function formatDateTime(dateText?: string) {
  if (!dateText) return '';
  return dateText.slice(0, 16).replace('T', ' ').replace(/-/g, '.');
}

function resolveMemberCouponStatus(status?: BffCouponStatus): MemberCouponStatus {
  if (status === 'USED') return 'used';
  if (status === 'EXPIRED') return 'expired';
  return 'claimed';
}

function resolveSceneText(sceneType?: BffCouponSceneType) {
  if (sceneType === 'TICKET') return '限门票订单使用';
  if (sceneType === 'HOTEL') return '限酒店订单使用';
  if (sceneType === 'MALL') return '限商城订单使用';
  if (sceneType === 'DINING') return '限餐饮订单使用';
  return '乐园消费可使用';
}

function resolveUseType(sceneType?: BffCouponSceneType): MemberCouponUseType {
  if (sceneType === 'MALL' || sceneType === 'TICKET' || sceneType === 'HOTEL') {
    return MEMBER_COUPON_USE_TYPE_ONLINE;
  }

  if (sceneType === 'DINING' || sceneType === 'ALL') {
    return MEMBER_COUPON_USE_TYPE_OFFLINE;
  }

  return MEMBER_COUPON_USE_TYPE_UNKNOWN;
}

function resolveUseRoute(coupon: BffCouponAssetView) {
  if (coupon.sceneType === 'TICKET') return MINI_PACKAGE_ROUTES.ticketBooking;
  if (coupon.sceneType === 'HOTEL') return MINI_PACKAGE_ROUTES.hotelHome;
  if (coupon.sceneType === 'MALL') {
    return `${MINI_PACKAGE_ROUTES.mallProducts}?couponId=${encodeURIComponent(coupon.couponNo)}`;
  }

  return MINI_PACKAGE_ROUTES.memberCode;
}

function resolveCouponTypeText(couponType?: string) {
  const normalizedType = String(couponType || '').toUpperCase();
  if (normalizedType.includes('DISCOUNT')) return '折扣券';
  if (normalizedType.includes('EXCHANGE')) return '兑换券';
  if (normalizedType.includes('FREIGHT')) return '配送券';
  if (normalizedType.includes('UPGRADE')) return '权益券';
  return '优惠券';
}

function resolveStatusText(status?: BffCouponStatus) {
  if (status === 'USED') return '已使用';
  if (status === 'EXPIRED') return '已过期';
  if (status === 'LOCKED') return '使用中';
  if (status === 'RETURNED') return '已返还';
  if (status === 'VOIDED' || status === 'DISABLED') return '已失效';
  if (status === 'FROZEN') return '暂不可用';
  return '可使用';
}

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number | string) {
  const normalizedDiscount = parseNumberLike(discountPercent);
  if (typeof normalizedDiscount !== 'number' || normalizedDiscount <= 0) return '';
  const discount = normalizedDiscount > 10 ? normalizedDiscount / 10 : normalizedDiscount;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

function resolveAmountText(coupon: BffCouponAssetView) {
  const discountAmountCent = parseNumberLike(coupon.discountAmountCent);
  if (typeof discountAmountCent === 'number' && discountAmountCent > 0) {
    return formatYuan(discountAmountCent);
  }

  return formatDiscountPercent(coupon.discountPercent) || '券';
}

function resolveThresholdText(coupon: BffCouponAssetView) {
  const thresholdAmountCent = parseNumberLike(coupon.thresholdAmountCent);
  if (typeof thresholdAmountCent === 'number' && thresholdAmountCent > 0) {
    return `满${formatYuan(thresholdAmountCent)}元可用`;
  }

  if (
    typeof parseNumberLike(coupon.discountAmountCent) === 'number'
    || typeof parseNumberLike(coupon.discountPercent) === 'number'
  ) {
    return '无门槛使用';
  }

  return '按券面规则使用';
}

function resolveBenefitText(coupon: BffCouponAssetView) {
  const discountAmountCent = parseNumberLike(coupon.discountAmountCent);
  if (typeof discountAmountCent === 'number' && discountAmountCent > 0) {
    return `立减${formatYuan(discountAmountCent)}元`;
  }

  const discountText = formatDiscountPercent(coupon.discountPercent);
  if (discountText) {
    const maxDiscountCent = parseNumberLike(coupon.maxDiscountCent);
    const maxDiscountText = typeof maxDiscountCent === 'number' && maxDiscountCent > 0
      ? `，最高减${formatYuan(maxDiscountCent)}元`
      : '';
    return `享${discountText}优惠${maxDiscountText}`;
  }

  return `${resolveCouponTypeText(coupon.couponType)}按券面说明使用`;
}

function resolveValidityText(coupon: BffCouponAssetView, status: MemberCouponStatus) {
  if (coupon.status === 'RETURNED') return '已返还';
  if (coupon.status === 'VOIDED' || coupon.status === 'DISABLED') return '已失效';
  if (coupon.status === 'FROZEN') return '暂不可用';

  if (status === 'used') {
    return coupon.usedAt ? `已使用:${formatDate(coupon.usedAt)}` : '已使用';
  }

  if (status === 'expired') {
    return coupon.validEndAt ? `已过期:${formatDate(coupon.validEndAt)}` : '已过期';
  }

  const startAt = formatDate(coupon.validStartAt);
  const endAt = formatDate(coupon.validEndAt);
  if (startAt && endAt) return `有效期:${startAt}-${endAt}`;
  if (endAt) return `有效期至:${endAt}`;
  return '按券规则生效';
}

function resolveValidityPeriodText(coupon: BffCouponAssetView) {
  const startAt = formatDate(coupon.validStartAt);
  const endAt = formatDate(coupon.validEndAt);
  if (startAt && endAt) return `${startAt} - ${endAt}`;
  if (endAt) return `至 ${endAt}`;
  if (startAt) return `${startAt} 起`;
  return '按券规则生效';
}

function resolveActionText(coupon: BffCouponAssetView) {
  if (coupon.status === 'AVAILABLE') {
    if (resolveUseRoute(coupon) === MINI_PACKAGE_ROUTES.memberCode) return '出示会员码';
    return '去使用';
  }

  const status = coupon.status;
  if (status === 'USED') return '已使用';
  if (status === 'EXPIRED') return '已过期';
  if (status === 'LOCKED') return '使用中';
  if (status === 'RETURNED') return '已返还';
  if (status === 'VOIDED' || status === 'DISABLED') return '已失效';
  if (status === 'FROZEN') return '暂不可用';
  return '查看详情';
}

function resolveSourceText(coupon: BffCouponAssetView) {
  if (coupon.sourceName) return coupon.sourceName;

  const normalizedSource = String(coupon.source || '').toUpperCase();
  if (normalizedSource.includes('EXCHANGE')) return 'K币兑换';
  if (normalizedSource.includes('CLAIM')) return '主动领取';
  if (normalizedSource.includes('PACKAGE')) return '券包发放';
  if (normalizedSource.includes('ISSUE') || normalizedSource.includes('GRANT')) return '定向发放';
  if (normalizedSource.includes('REFUND')) return '退款返还';

  return '会员发放';
}

function resolveReasonText(coupon: BffCouponAssetView) {
  const explicitReason = String(coupon.reason || '').trim();
  if (explicitReason) return explicitReason;

  if (coupon.status === 'LOCKED') return '该优惠券已被当前订单占用，完成支付或释放后可继续使用。';
  if (coupon.status === 'USED') return '该优惠券已随订单完成核销。';
  if (coupon.status === 'EXPIRED') return '该优惠券已超过可使用时效。';
  if (coupon.status === 'RETURNED') return '该优惠券已按退款结果返还到账。';
  if (coupon.status === 'VOIDED' || coupon.status === 'DISABLED') return '该优惠券当前已失效。';
  if (coupon.status === 'FROZEN') return '该优惠券当前暂不可使用，请稍后再试。';
  return '满足使用条件后，可在对应订单确认页选择这张优惠券。';
}

function resolveOrderNoText(coupon: BffCouponAssetView) {
  if (coupon.usedOrderNo) return coupon.usedOrderNo;
  if (coupon.lockedOrderNo) return coupon.lockedOrderNo;
  return '';
}

function resolveRefundReturnStatusText(refundReturnStatus?: string) {
  const normalizedStatus = String(refundReturnStatus || '').toUpperCase();
  if (!normalizedStatus) return '';
  if (normalizedStatus === 'RETURNED' || normalizedStatus === 'SUCCESS') return '退款后已返还';
  if (normalizedStatus === 'PROCESSING' || normalizedStatus === 'PENDING') return '返还处理中';
  if (normalizedStatus === 'PARTIAL_RETURNED') return '部分返还';
  return '';
}

function cacheMemberCoupons(coupons: MemberCouponItem[]) {
  memberCouponSnapshot = coupons;
  memberCouponsLoaded = true;
  return coupons;
}

function upsertMemberCouponSnapshot(nextCoupon: MemberCouponItem) {
  const currentIndex = memberCouponSnapshot.findIndex((coupon) => coupon.id === nextCoupon.id);
  if (currentIndex < 0) {
    return cacheMemberCoupons([nextCoupon, ...memberCouponSnapshot]);
  }

  const nextCoupons = [...memberCouponSnapshot];
  nextCoupons[currentIndex] = nextCoupon;
  return cacheMemberCoupons(nextCoupons);
}

function waitCouponSnapshotRetry(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

// 单飞读取我的券列表，避免列表页和详情页在同一轮操作里重复打同一份券资产接口。
async function loadMemberCouponItems(forceRefresh = false) {
  if (!forceRefresh && memberCouponsLoaded) return memberCouponSnapshot;
  if (memberCouponsRequest) return memberCouponsRequest;

  memberCouponsRequest = fetchBffMemberCoupons({ page: 1, size: 100 })
    .then((response) => cacheMemberCoupons((response.list ?? response.coupons ?? []).map(toMemberCouponItem)))
    .finally(() => {
      memberCouponsRequest = null;
    });

  return memberCouponsRequest;
}

function toMemberCouponItem(coupon: BffCouponAssetView): MemberCouponItem {
  const status = resolveMemberCouponStatus(coupon.status);
  return {
    id: coupon.couponNo,
    couponNo: coupon.couponNo,
    templateNo: coupon.templateNo,
    packageNo: coupon.packageNo || '',
    status,
    bffStatus: coupon.status,
    statusText: resolveStatusText(coupon.status),
    sideText: resolveSceneText(coupon.sceneType),
    sceneText: resolveSceneText(coupon.sceneType),
    amountText: resolveAmountText(coupon),
    couponTypeText: resolveCouponTypeText(coupon.couponType),
    currencyText: coupon.discountAmountCent ? 'RMB' : (coupon.discountPercent ? '折扣' : '权益'),
    validityText: resolveValidityText(coupon, status),
    validityPeriodText: resolveValidityPeriodText(coupon),
    title: coupon.couponName || '会员优惠券',
    actionText: resolveActionText(coupon),
    useType: resolveUseType(coupon.sceneType),
    sceneType: coupon.sceneType,
    useEnabled: coupon.status === 'AVAILABLE',
    targetRoute: resolveUseRoute(coupon),
    thresholdText: resolveThresholdText(coupon),
    benefitText: resolveBenefitText(coupon),
    sourceText: resolveSourceText(coupon),
    reasonText: resolveReasonText(coupon),
    issuedAtText: formatDateTime(coupon.issuedAt),
    lockedAtText: formatDateTime(coupon.lockedAt),
    usedAtText: formatDateTime(coupon.usedAt),
    orderNoText: resolveOrderNoText(coupon),
    refundReturnStatusText: resolveRefundReturnStatusText(coupon.refundReturnStatus),
  };
}

function buildTabs(coupons: MemberCouponItem[]): MemberCouponTab[] {
  return [
    { key: 'claimed', text: '已领取', count: coupons.filter((coupon) => coupon.status === 'claimed').length },
    { key: 'used', text: '已使用', count: coupons.filter((coupon) => coupon.status === 'used').length },
    { key: 'expired', text: '已过期', count: coupons.filter((coupon) => coupon.status === 'expired').length },
  ];
}

// 获取我的优惠券页面数据，只读取真实 BFF 券资产。
export async function fetchCouponsData(options: { forceRefresh?: boolean } = {}): Promise<MemberCouponsData> {
  const coupons = await loadMemberCouponItems(options.forceRefresh);
  return {
    tabs: buildTabs(coupons),
    coupons,
    moreButtonText: '获取更多好券',
  };
}

// 把领券接口直接返回的券资产补进当前会话快照，保证详情页可立即承接新券。
export function cacheClaimedMemberCoupon(coupon?: BffCouponAssetView | null) {
  if (!coupon?.couponNo) return null;
  return upsertMemberCouponSnapshot(toMemberCouponItem(coupon));
}

// 让下一次我的券读取强制回源，适合领券/兑换后重新核对真实券资产。
export function invalidateMemberCouponSnapshot() {
  memberCouponsLoaded = false;
}

// 获取优惠券详情页数据：优先复用当前会话快照，缺失时按需回源重试真实券资产接口。
export async function fetchCouponDetailData(
  couponId: string,
  options: {
    forceRefresh?: boolean;
    retryTimes?: number;
    retryDelayMs?: number;
  } = {},
) {
  if (!couponId) return null;

  const cachedCoupon = memberCouponSnapshot.find((coupon) => coupon.id === couponId);
  if (cachedCoupon && !options.forceRefresh) return cachedCoupon;

  const retryTimes = Math.max(options.retryTimes ?? 0, 0);
  const retryDelayMs = Math.max(options.retryDelayMs ?? 250, 0);
  let forceRefresh = options.forceRefresh ?? memberCouponsLoaded;

  for (let attempt = 0; attempt <= retryTimes; attempt += 1) {
    const coupons = await loadMemberCouponItems(forceRefresh);
    const matchedCoupon = coupons.find((coupon) => coupon.id === couponId);
    if (matchedCoupon) return matchedCoupon;

    if (attempt >= retryTimes) break;

    forceRefresh = true;
    await waitCouponSnapshotRetry(retryDelayMs);
  }

  return null;
}
