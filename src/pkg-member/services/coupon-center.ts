import { fetchBffCrmP1Exchanges, type BffCrmP1ConfigItem } from '@/core/services/bff-crm-api';
import {
  claimBffCoupon,
  exchangeBffCoupon,
  fetchBffMemberCouponPackages,
  getBffCouponAmountCent,
  getBffCouponPackageList,
  getBffCouponThresholdCent,
  getBffCouponTitle,
  type BffCouponPackageView,
  type BffCouponTemplateView,
  type BffMemberCouponPackageView,
} from '@/core/services/bff-coupon-api';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { centToYuan, parseNumberLike } from '@/core/utils/money';

export type MemberCouponCenterTabKey = 'recommend' | 'exchangeCode' | 'kcoin';
export type MemberCouponCenterSource = 'package' | 'kcoin';

export interface MemberCouponCenterTab {
  key: MemberCouponCenterTabKey;
  title: string;
}

export interface MemberCouponCenterCoupon {
  id: string;
  tabKey: MemberCouponCenterTabKey;
  source: MemberCouponCenterSource;
  title: string;
  amountText: string;
  thresholdText: string;
  validityText: string;
  actionText: string;
  claimable: boolean;
  disabledReason?: string;
  templateNo?: string;
  activityId?: string;
  targetRoute?: string;
  kCoinPrice?: number;
}

export interface MemberCouponCenterData {
  tabs: MemberCouponCenterTab[];
  coupons: MemberCouponCenterCoupon[];
  emptyTitle: string;
  emptyDescription: string;
}

const couponCenterBaseData: Omit<MemberCouponCenterData, 'coupons'> = {
  tabs: [
    { key: 'recommend', title: '好券推荐' },
    { key: 'exchangeCode', title: '兑换码' },
    { key: 'kcoin', title: 'K币兑换' },
  ],
  emptyTitle: '暂无可领取/可兑换的优惠券',
  emptyDescription: '耐心等待活动发布',
};

function formatYuan(amountCent: unknown = 0) {
  const amount = centToYuan(amountCent);
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDate(dateText?: string) {
  if (!dateText) return '';
  return dateText.slice(0, 10).replace(/-/g, '.');
}

function readExtraPayload(item: BffCrmP1ConfigItem) {
  if (!item.extraPayload) return {};

  try {
    return JSON.parse(item.extraPayload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readExtraText(extraPayload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = extraPayload[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  return undefined;
}

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number | string) {
  const normalizedDiscount = parseNumberLike(discountPercent);
  if (typeof normalizedDiscount !== 'number' || normalizedDiscount <= 0) return '';
  const discount = normalizedDiscount > 10 ? normalizedDiscount / 10 : normalizedDiscount;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

function resolveTemplateAmountText(template?: BffCouponTemplateView) {
  const discountAmountCent = getBffCouponAmountCent(template ?? {});
  if (typeof discountAmountCent === 'number' && discountAmountCent > 0) return formatYuan(discountAmountCent);
  return formatDiscountPercent(template?.discountPercent ?? template?.discountRate) || '券';
}

function resolveTemplateThresholdText(template?: BffCouponTemplateView) {
  const thresholdAmountCent = getBffCouponThresholdCent(template ?? {});
  if (typeof thresholdAmountCent === 'number' && thresholdAmountCent > 0) {
    return `满¥${formatYuan(thresholdAmountCent)}可用`;
  }

  return '无门槛优惠';
}

function resolveTemplateValidityText(template?: BffCouponTemplateView) {
  const startAt = formatDate(template?.validStartAt);
  const endAt = formatDate(template?.validEndAt);
  if (startAt && endAt) return `${startAt}-${endAt}`;
  if (endAt) return `有效期至 ${endAt}`;
  return '领取后按券规则生效';
}

function isClaimableCouponPackage(
  couponPackage: BffCouponPackageView | BffMemberCouponPackageView,
): couponPackage is BffCouponPackageView {
  return Array.isArray((couponPackage as BffCouponPackageView).coupons);
}

function toPackageCoupon(couponPackage: BffCouponPackageView): MemberCouponCenterCoupon | undefined {
  const firstCoupon = couponPackage.coupons?.[0];
  const templateNo = firstCoupon?.templateNo;
  const activityId = couponPackage.activityId;
  const claimable = couponPackage.claimable !== false && Boolean(templateNo || activityId);
  const disabledReason = couponPackage.reason || (templateNo || activityId ? undefined : '当前优惠券暂不可领取');
  const title = getBffCouponTitle(firstCoupon ?? {}, couponPackage.packageName);

  if (!couponPackage.packageNo || !title) return undefined;

  return {
    id: couponPackage.packageNo,
    tabKey: 'recommend',
    source: 'package',
    title,
    amountText: resolveTemplateAmountText(firstCoupon),
    thresholdText: resolveTemplateThresholdText(firstCoupon),
    validityText: resolveTemplateValidityText(firstCoupon),
    actionText: claimable ? '立即领取' : disabledReason || '暂不可领',
    claimable,
    disabledReason,
    templateNo,
    activityId,
  };
}

function toKcoinCoupon(item: BffCrmP1ConfigItem): MemberCouponCenterCoupon | undefined {
  const kCoinPrice = item.pointsCost || 0;
  if (kCoinPrice <= 0) return undefined;

  const extraPayload = readExtraPayload(item);
  const actionText = readExtraText(extraPayload, ['buttonText']) || `${kCoinPrice}K币`;

  return {
    id: item.itemNo,
    tabKey: 'kcoin',
    source: 'kcoin',
    title: item.itemName,
    amountText: item.badgeText || item.tagText || '兑换券',
    thresholdText: item.subtitle || item.description || '按兑换规则使用',
    validityText: item.endAt ? `有效期至 ${item.endAt.slice(0, 10)}` : '兑换后按券规则生效',
    actionText,
    claimable: true,
    targetRoute: `${MINI_PACKAGE_ROUTES.memberExchangeDetail}?id=${encodeURIComponent(item.itemNo)}`,
    kCoinPrice,
  };
}

// 获取领券中心页面数据：好券推荐读可领取券包，K 币入口读 CRM 兑换配置。
export async function fetchMemberCouponCenterData() {
  const [packagesResponse, crmExchanges] = await Promise.all([
    fetchBffMemberCouponPackages(),
    fetchBffCrmP1Exchanges(),
  ]);
  const claimablePackages = packagesResponse.claimablePackages
    ?? getBffCouponPackageList(packagesResponse).filter(isClaimableCouponPackage);
  const packageCoupons = claimablePackages
    .map(toPackageCoupon)
    .filter((coupon): coupon is MemberCouponCenterCoupon => Boolean(coupon));
  const kcoinCoupons = crmExchanges.map(toKcoinCoupon).filter((coupon): coupon is MemberCouponCenterCoupon => Boolean(coupon));

  return {
    ...couponCenterBaseData,
    coupons: [...packageCoupons, ...kcoinCoupons],
  };
}

// 领取优惠券，优先承接活动领券，其次按 promotion 模板编号领取。
export async function claimMemberCoupon(coupon: MemberCouponCenterCoupon) {
  if (!coupon.activityId && !coupon.templateNo) {
    throw new Error(coupon.disabledReason || '当前优惠券暂不可领取');
  }

  return claimBffCoupon(coupon.activityId ? { activityId: coupon.activityId } : { templateNo: coupon.templateNo });
}

// 提交真实优惠券兑换码，兑换成功后由调用方刷新我的券资产。
export async function exchangeMemberCouponCode(exchangeCode: string) {
  const normalizedCode = exchangeCode.trim();
  if (!normalizedCode) {
    throw new Error('请输入兑换码');
  }

  return exchangeBffCoupon(normalizedCode);
}
