import {
  fetchBffMemberCoupons,
  type BffMemberCouponAsset,
  type BffCouponStatus,
} from '@/core/services/bff-api';

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
  status: MemberCouponStatus;
  rawStatus?: BffCouponStatus;
  sideText: string;
  amountText: string;
  couponTypeText: string;
  currencyText: string;
  validityText: string;
  title: string;
  actionText: string;
  useType: MemberCouponUseType;
}

export interface MemberCouponsData {
  tabs: MemberCouponTab[];
  coupons: MemberCouponItem[];
  moreButtonText: string;
}

const STATUS_TABS: Array<Omit<MemberCouponTab, 'count'>> = [
  { key: 'claimed', text: '已领取' },
  { key: 'used', text: '已使用' },
  { key: 'expired', text: '已过期' },
];

function formatCentAmount(amountCent?: number) {
  const amount = Number(amountCent || 0) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return '优惠';

  return Number.isInteger(amount) ? `${amount}` : amount.toFixed(2);
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10).replace(/-/g, '.') : '';
}

function resolveValidityText(coupon: BffMemberCouponAsset) {
  const startAt = formatDate(coupon.validStartAt);
  const endAt = formatDate(coupon.validEndAt);

  if (coupon.status === 'USED') return coupon.usedAt ? `已使用:${formatDate(coupon.usedAt)}` : '已使用';
  if (coupon.status === 'EXPIRED') return endAt ? `已过期:${endAt}` : '已过期';
  if (startAt && endAt) return `有效期:${startAt}-${endAt}`;
  if (endAt) return `有效期至 ${endAt}`;

  return '有效期以券规则为准';
}

function resolveMemberCouponStatus(status?: BffCouponStatus): MemberCouponStatus {
  if (status === 'USED') return 'used';
  if (status === 'EXPIRED') return 'expired';

  return 'claimed';
}

function resolveActionText(coupon: BffMemberCouponAsset) {
  if (coupon.status === 'USED') return '已使用';
  if (coupon.status === 'EXPIRED') return '已过期';
  if (coupon.status === 'LOCKED') return '已锁定';

  return '立即使用';
}

function resolveSceneText(sceneType?: string) {
  if (sceneType === 'TICKET') return '限门票订单使用';
  if (sceneType === 'MALL') return '限商城订单使用';
  if (sceneType === 'HOTEL') return '限酒店订单使用';
  if (sceneType === 'DINING') return '限园内餐饮使用';
  return '线上及园内消费皆可使用';
}

function resolveCouponUseType(sceneType?: string) {
  if (sceneType === 'DINING') return MEMBER_COUPON_USE_TYPE_OFFLINE;
  if (sceneType === 'TICKET' || sceneType === 'MALL' || sceneType === 'HOTEL') {
    return MEMBER_COUPON_USE_TYPE_ONLINE;
  }

  return MEMBER_COUPON_USE_TYPE_UNKNOWN;
}

function resolveCouponTypeText(couponType?: string) {
  if (couponType?.includes('PERCENT')) return '折扣券';
  if (couponType?.includes('CASH') || couponType?.includes('AMOUNT')) return '满减券';
  if (couponType?.includes('GIFT')) return '礼品券';

  return '优惠券';
}

function toMemberCouponItem(coupon: BffMemberCouponAsset): MemberCouponItem | undefined {
  if (!coupon.couponNo) return undefined;

  return {
    id: coupon.couponNo,
    status: resolveMemberCouponStatus(coupon.status),
    rawStatus: coupon.status,
    sideText: resolveSceneText(coupon.sceneType),
    amountText: formatCentAmount(coupon.discountAmountCent),
    couponTypeText: resolveCouponTypeText(coupon.couponType),
    currencyText: 'RMB',
    validityText: resolveValidityText(coupon),
    title: coupon.couponName || '会员优惠券',
    actionText: resolveActionText(coupon),
    useType: resolveCouponUseType(coupon.sceneType),
  };
}

function buildTabs(coupons: MemberCouponItem[]): MemberCouponTab[] {
  return STATUS_TABS.map((tab) => ({
    ...tab,
    count: coupons.filter((coupon) => coupon.status === tab.key).length,
  }));
}

// 获取我的优惠券真实资产，接口失败直接交给页面异常态，不再回退本地假券。
export async function fetchCouponsData() {
  const response = await fetchBffMemberCoupons();
  const coupons = (response.coupons ?? [])
    .map(toMemberCouponItem)
    .filter((coupon): coupon is MemberCouponItem => Boolean(coupon));

  return {
    tabs: buildTabs(coupons),
    coupons,
    moreButtonText: '获取更多好券',
  };
}
