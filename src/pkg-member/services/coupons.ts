import {
  fetchBffMemberCoupons,
  getBffCouponAmountCent,
  getBffCouponTitle,
  getBffMemberCouponList,
  isBffCouponAvailable,
  normalizeBffCouponStatus,
  type BffCouponAssetView,
  type BffCouponSceneType,
  type BffCouponStatus,
} from '@/core/services/bff-coupon-api';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';

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
  bffStatus: BffCouponStatus;
  sideText: string;
  amountText: string;
  couponTypeText: string;
  currencyText: string;
  validityText: string;
  title: string;
  actionText: string;
  useType: MemberCouponUseType;
  sceneType?: BffCouponSceneType;
  useEnabled: boolean;
  targetRoute: string;
}

export interface MemberCouponsData {
  tabs: MemberCouponTab[];
  coupons: MemberCouponItem[];
  moreButtonText: string;
}

function formatYuan(amountCent = 0) {
  const amount = amountCent / 100;
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDate(dateText?: string) {
  if (!dateText) return '';
  return dateText.slice(0, 10).replace(/-/g, '.');
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

function resolveAmountText(coupon: BffCouponAssetView) {
  const amountCent = getBffCouponAmountCent(coupon);
  if (amountCent > 0) {
    return formatYuan(amountCent);
  }

  return '券';
}

function resolveValidityText(coupon: BffCouponAssetView, status: MemberCouponStatus) {
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

function resolveActionText(status?: BffCouponStatus) {
  const normalizedStatus = normalizeBffCouponStatus(status);
  if (normalizedStatus === 'USED') return '已使用';
  if (normalizedStatus === 'EXPIRED') return '已过期';
  if (normalizedStatus === 'LOCKED') return '使用中';
  if (normalizedStatus === 'AVAILABLE') return '立即使用';
  return '查看';
}

function toMemberCouponItem(coupon: BffCouponAssetView): MemberCouponItem {
  const status = resolveMemberCouponStatus(coupon.status);
  const amountCent = getBffCouponAmountCent(coupon);
  return {
    id: coupon.couponNo,
    status,
    bffStatus: coupon.status || '',
    sideText: resolveSceneText(coupon.sceneType),
    amountText: resolveAmountText(coupon),
    couponTypeText: resolveCouponTypeText(coupon.couponType),
    currencyText: amountCent > 0 ? 'RMB' : '权益',
    validityText: resolveValidityText(coupon, status),
    title: getBffCouponTitle(coupon, '会员优惠券'),
    actionText: resolveActionText(coupon.status),
    useType: resolveUseType(coupon.sceneType),
    sceneType: coupon.sceneType,
    useEnabled: isBffCouponAvailable(coupon),
    targetRoute: resolveUseRoute(coupon),
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
  const response = await fetchBffMemberCoupons();
  const coupons = getBffMemberCouponList(response).map(toMemberCouponItem);
  return {
    tabs: buildTabs(coupons),
    coupons,
    moreButtonText: '获取更多好券',
  };
}
