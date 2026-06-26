import {
  fetchBffMemberCoupons,
  getBffCouponAmountCent,
  getBffCouponThresholdCent,
  getBffCouponTitle,
  getBffMemberCouponList,
  isBffCouponAvailable,
  normalizeBffCouponStatus,
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
  const normalizedStatus = normalizeBffCouponStatus(status);
  if (normalizedStatus === 'USED') return 'used';
  if (normalizedStatus === 'EXPIRED') return 'expired';
  return 'claimed';
}

function resolveSceneText(sceneType?: BffCouponSceneType) {
  const normalizedSceneType = String(sceneType || '').toUpperCase();
  if (normalizedSceneType === 'TICKET') return '限门票订单使用';
  if (normalizedSceneType === 'HOTEL') return '限酒店订单使用';
  if (normalizedSceneType === 'MALL') return '限商城订单使用';
  if (normalizedSceneType === 'DINING') return '限餐饮订单使用';
  return '乐园消费可使用';
}

function resolveUseType(sceneType?: BffCouponSceneType): MemberCouponUseType {
  const normalizedSceneType = String(sceneType || '').toUpperCase();
  if (normalizedSceneType === 'MALL' || normalizedSceneType === 'TICKET' || normalizedSceneType === 'HOTEL') {
    return MEMBER_COUPON_USE_TYPE_ONLINE;
  }

  if (normalizedSceneType === 'DINING' || normalizedSceneType === 'ALL') {
    return MEMBER_COUPON_USE_TYPE_OFFLINE;
  }

  return MEMBER_COUPON_USE_TYPE_UNKNOWN;
}

function resolveUseRoute(coupon: BffCouponAssetView) {
  const normalizedSceneType = String(coupon.sceneType || '').toUpperCase();
  if (normalizedSceneType === 'TICKET') return MINI_PACKAGE_ROUTES.ticketBooking;
  if (normalizedSceneType === 'HOTEL') return MINI_PACKAGE_ROUTES.hotelHome;
  if (normalizedSceneType === 'MALL') {
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
  const normalizedStatus = normalizeBffCouponStatus(status);
  if (normalizedStatus === 'USED') return '已使用';
  if (normalizedStatus === 'EXPIRED') return '已过期';
  if (normalizedStatus === 'LOCKED') return '使用中';
  if (normalizedStatus === 'RETURNED') return '已返还';
  if (normalizedStatus === 'VOIDED' || normalizedStatus === 'DISABLED') return '已失效';
  if (normalizedStatus === 'FROZEN') return '暂不可用';
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
  const discountAmountCent = getBffCouponAmountCent(coupon);
  if (typeof discountAmountCent === 'number' && discountAmountCent > 0) {
    return formatYuan(discountAmountCent);
  }

  return formatDiscountPercent(coupon.discountPercent ?? coupon.discountRate) || '券';
}

function resolveThresholdText(coupon: BffCouponAssetView) {
  const thresholdAmountCent = getBffCouponThresholdCent(coupon);
  if (typeof thresholdAmountCent === 'number' && thresholdAmountCent > 0) {
    return `满${formatYuan(thresholdAmountCent)}元可用`;
  }

  if (
    getBffCouponAmountCent(coupon) > 0
    || typeof parseNumberLike(coupon.discountPercent ?? coupon.discountRate) === 'number'
  ) {
    return '无门槛使用';
  }

  return '按券面规则使用';
}

function resolveBenefitText(coupon: BffCouponAssetView) {
  const discountAmountCent = getBffCouponAmountCent(coupon);
  if (typeof discountAmountCent === 'number' && discountAmountCent > 0) {
    return `立减${formatYuan(discountAmountCent)}元`;
  }

  const discountText = formatDiscountPercent(coupon.discountPercent ?? coupon.discountRate);
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
  const normalizedStatus = normalizeBffCouponStatus(coupon.status);
  if (normalizedStatus === 'RETURNED') return '已返还';
  if (normalizedStatus === 'VOIDED' || normalizedStatus === 'DISABLED') return '已失效';
  if (normalizedStatus === 'FROZEN') return '暂不可用';

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
  const normalizedStatus = normalizeBffCouponStatus(coupon.status);
  if (normalizedStatus === 'AVAILABLE') {
    if (resolveUseRoute(coupon) === MINI_PACKAGE_ROUTES.memberCode) return '出示会员码';
    return '去使用';
  }

  if (normalizedStatus === 'USED') return '已使用';
  if (normalizedStatus === 'EXPIRED') return '已过期';
  if (normalizedStatus === 'LOCKED') return '使用中';
  if (normalizedStatus === 'RETURNED') return '已返还';
  if (normalizedStatus === 'VOIDED' || normalizedStatus === 'DISABLED') return '已失效';
  if (normalizedStatus === 'FROZEN') return '暂不可用';
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
  const normalizedStatus = normalizeBffCouponStatus(coupon.status);

  const normalizedRefundReturnStatus = String(coupon.refundReturnStatus || '')
    .trim()
    .replace(/[_\s-]/g, '')
    .toUpperCase();
  if (normalizedRefundReturnStatus === 'PENDINGREVIEW') {
    return '退款后返还需要人工审核，审核完成后会继续更新到券状态里。';
  }
  if (normalizedRefundReturnStatus === 'NOTRETURNED') {
    return '该优惠券按退款返还口径当前不再返还，可在售后记录里继续查看处理结果。';
  }

  if (normalizedStatus === 'LOCKED') return '该优惠券已被当前订单占用，完成支付或释放后可继续使用。';
  if (normalizedStatus === 'USED') return '该优惠券已随订单完成核销。';
  if (normalizedStatus === 'EXPIRED') return '该优惠券已超过可使用时效。';
  if (normalizedStatus === 'RETURNED') return '该优惠券已按退款结果返还到账。';
  if (normalizedStatus === 'VOIDED' || normalizedStatus === 'DISABLED') return '该优惠券当前已失效。';
  if (normalizedStatus === 'FROZEN') return '该优惠券当前暂不可使用，请稍后再试。';
  return '满足使用条件后，可在对应订单确认页选择这张优惠券。';
}

function resolveOrderNoText(coupon: BffCouponAssetView) {
  if (coupon.usedOrderNo) return coupon.usedOrderNo;
  if (coupon.lockedOrderNo) return coupon.lockedOrderNo;
  return '';
}

function resolveRefundReturnStatusText(refundReturnStatus?: string) {
  const normalizedStatus = String(refundReturnStatus || '')
    .trim()
    .replace(/[_\s-]/g, '')
    .toUpperCase();
  if (!normalizedStatus) return '';
  if (normalizedStatus === 'RETURNED' || normalizedStatus === 'SUCCESS') return '退款后已返还';
  if (normalizedStatus === 'PROCESSING' || normalizedStatus === 'PENDING') return '返还处理中';
  if (normalizedStatus === 'PENDINGREVIEW') return '待人工审核';
  if (normalizedStatus === 'NOTRETURNED') return '不再返还';
  if (normalizedStatus === 'PARTIAL_RETURNED') return '部分返还';
  return '';
}

function waitCouponSnapshotRetry(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

// 单飞读取我的券列表，避免列表页和详情页在同一轮操作里重复打同一份券资产接口。
async function loadMemberCouponItems() {
  if (memberCouponsRequest) return memberCouponsRequest;

  memberCouponsRequest = fetchBffMemberCoupons({ page: 1, size: 100 })
    .then((response) => getBffMemberCouponList(response)
      .map(toMemberCouponItem)
      .filter((coupon): coupon is MemberCouponItem => Boolean(coupon)))
    .finally(() => {
      memberCouponsRequest = null;
    });

  return memberCouponsRequest;
}

function toMemberCouponItem(coupon: BffCouponAssetView): MemberCouponItem | undefined {
  if (!coupon.couponNo) return undefined;

  const status = resolveMemberCouponStatus(coupon.status);
  return {
    id: coupon.couponNo,
    couponNo: coupon.couponNo,
    templateNo: coupon.templateNo || coupon.templateId || '',
    packageNo: coupon.packageNo || '',
    status,
    bffStatus: coupon.status || '',
    statusText: resolveStatusText(coupon.status),
    sideText: resolveSceneText(coupon.sceneType),
    sceneText: resolveSceneText(coupon.sceneType),
    amountText: resolveAmountText(coupon),
    couponTypeText: resolveCouponTypeText(coupon.couponType),
    currencyText: getBffCouponAmountCent(coupon) > 0 ? 'RMB' : (coupon.discountPercent || coupon.discountRate ? '折扣' : '权益'),
    validityText: resolveValidityText(coupon, status),
    validityPeriodText: resolveValidityPeriodText(coupon),
    title: getBffCouponTitle(coupon, '会员优惠券'),
    actionText: resolveActionText(coupon),
    useType: resolveUseType(coupon.sceneType),
    sceneType: coupon.sceneType,
    useEnabled: isBffCouponAvailable(coupon),
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
export async function fetchCouponsData(): Promise<MemberCouponsData> {
  const coupons = await loadMemberCouponItems();
  return {
    tabs: buildTabs(coupons),
    coupons,
    moreButtonText: '获取更多好券',
  };
}

// 获取优惠券详情页数据：只按我的券资产接口回源，必要时短暂重试等待后端落库。
export async function fetchCouponDetailData(
  couponId: string,
  options: {
    retryTimes?: number;
    retryDelayMs?: number;
  } = {},
) {
  if (!couponId) return null;

  const retryTimes = Math.max(options.retryTimes ?? 0, 0);
  const retryDelayMs = Math.max(options.retryDelayMs ?? 250, 0);

  for (let attempt = 0; attempt <= retryTimes; attempt += 1) {
    const coupons = await loadMemberCouponItems();
    const matchedCoupon = coupons.find((coupon) => coupon.id === couponId);
    if (matchedCoupon) return matchedCoupon;

    if (attempt >= retryTimes) break;

    await waitCouponSnapshotRetry(retryDelayMs);
  }

  return null;
}
