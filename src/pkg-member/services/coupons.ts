import {
  fetchBffMemberCoupons,
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

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number) {
  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent) || discountPercent <= 0) return '';
  const discount = discountPercent > 10 ? discountPercent / 10 : discountPercent;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

function resolveAmountText(coupon: BffCouponAssetView) {
  if (coupon.discountAmountCent && coupon.discountAmountCent > 0) {
    return formatYuan(coupon.discountAmountCent);
  }

  return formatDiscountPercent(coupon.discountPercent) || '券';
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

function resolveActionText(status?: BffCouponStatus) {
  if (status === 'USED') return '已使用';
  if (status === 'EXPIRED') return '已过期';
  if (status === 'LOCKED') return '使用中';
  if (status === 'RETURNED') return '已返还';
  if (status === 'VOIDED' || status === 'DISABLED') return '已失效';
  if (status === 'FROZEN') return '暂不可用';
  if (status === 'AVAILABLE') return '立即使用';
  return '查看';
}

function toMemberCouponItem(coupon: BffCouponAssetView): MemberCouponItem {
  const status = resolveMemberCouponStatus(coupon.status);
  return {
    id: coupon.couponNo,
    status,
    bffStatus: coupon.status,
    sideText: resolveSceneText(coupon.sceneType),
    amountText: resolveAmountText(coupon),
    couponTypeText: resolveCouponTypeText(coupon.couponType),
    currencyText: coupon.discountAmountCent ? 'RMB' : (coupon.discountPercent ? '折扣' : '权益'),
    validityText: resolveValidityText(coupon, status),
    title: coupon.couponName || '会员优惠券',
    actionText: resolveActionText(coupon.status),
    useType: resolveUseType(coupon.sceneType),
    sceneType: coupon.sceneType,
    useEnabled: coupon.status === 'AVAILABLE',
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
  const response = await fetchBffMemberCoupons({ page: 1, size: 100 });
  const coupons = (response.list ?? response.coupons ?? []).map(toMemberCouponItem);
  return {
    tabs: buildTabs(coupons),
    coupons,
    moreButtonText: '获取更多好券',
  };
}
