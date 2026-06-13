import {
  claimBffCoupon,
  exchangeBffCoupon,
  fetchBffMemberCouponPackages,
  type BffCouponPackageView,
  type BffCouponTemplateView,
} from '@/core/services/bff-api';

export type MemberCouponCenterTabKey = 'recommend' | 'exchangeCode';

export interface MemberCouponCenterTab {
  key: MemberCouponCenterTabKey;
  title: string;
}

export interface MemberCouponCenterCoupon {
  id: string;
  templateNo: string;
  tabKey: MemberCouponCenterTabKey;
  title: string;
  amountText: string;
  thresholdText: string;
  validityText: string;
  actionText: string;
  claimable: boolean;
  reason?: string;
}

export interface MemberCouponCenterData {
  tabs: MemberCouponCenterTab[];
  coupons: MemberCouponCenterCoupon[];
  emptyTitle: string;
  emptyDescription: string;
}

function formatCentAmount(amountCent?: number) {
  const amount = Number(amountCent || 0) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return '优惠';

  return Number.isInteger(amount) ? `${amount}元` : `${amount.toFixed(2)}元`;
}

function formatDate(value?: string) {
  return value ? value.slice(0, 10).replace(/-/g, '.') : '';
}

function resolveThresholdText(coupon?: BffCouponTemplateView) {
  const thresholdAmount = Number(coupon?.thresholdAmountCent || 0) / 100;
  if (Number.isFinite(thresholdAmount) && thresholdAmount > 0) {
    return `满${Number.isInteger(thresholdAmount) ? thresholdAmount : thresholdAmount.toFixed(2)}元可用`;
  }

  return '无门槛可用';
}

function resolveValidityText(coupon?: BffCouponTemplateView) {
  const startAt = formatDate(coupon?.validStartAt);
  const endAt = formatDate(coupon?.validEndAt);

  if (startAt && endAt) return `有效期 ${startAt}-${endAt}`;
  if (endAt) return `有效期至 ${endAt}`;

  return '领取后按券规则生效';
}

function resolveClaimable(pkg: BffCouponPackageView, coupon?: BffCouponTemplateView) {
  return pkg.claimable !== false && coupon?.claimable !== false;
}

function toCouponCenterCoupon(pkg: BffCouponPackageView): MemberCouponCenterCoupon | undefined {
  const coupon = pkg.coupons?.[0];
  const templateNo = coupon?.templateNo || pkg.packageNo;
  if (!templateNo) return undefined;
  const claimable = resolveClaimable(pkg, coupon);
  const reason = pkg.reason || coupon?.reason;

  return {
    id: pkg.packageNo || templateNo,
    templateNo,
    tabKey: 'recommend',
    title: pkg.packageName || coupon?.templateName || '会员优惠券',
    amountText: formatCentAmount(coupon?.discountAmountCent),
    thresholdText: resolveThresholdText(coupon),
    validityText: resolveValidityText(coupon),
    actionText: claimable ? '立即领取' : reason || '不可领取',
    claimable,
    reason,
  };
}

// 获取领券中心真实券包，接口失败直接暴露异常态，不再回退本地券卡。
export async function fetchMemberCouponCenterData() {
  const response = await fetchBffMemberCouponPackages();
  const coupons = (response.packages ?? [])
    .map(toCouponCenterCoupon)
    .filter((coupon): coupon is MemberCouponCenterCoupon => Boolean(coupon));

  return {
    tabs: [
      { key: 'recommend' as const, title: '好券推荐' },
      { key: 'exchangeCode' as const, title: '兑换码' },
    ],
    coupons,
    emptyTitle: '暂无可领取优惠券',
    emptyDescription: '有新活动时会在这里展示',
  };
}

// 提交领券动作，后端会根据当前登录态写入会员券资产。
export function claimMemberCouponCenterCoupon(coupon: MemberCouponCenterCoupon) {
  return claimBffCoupon(coupon.templateNo);
}

// 提交真实优惠券兑换码，兑换结果由后端写入我的优惠券资产。
export function exchangeMemberCouponCode(exchangeCode: string) {
  return exchangeBffCoupon(exchangeCode);
}
