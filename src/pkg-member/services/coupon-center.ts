import { fetchBffCrmP1Exchanges, type BffCrmP1ConfigItem } from '@/core/services/bff-crm-api';
import {
  claimBffCoupon,
  fetchBffMemberCouponPackages,
  type BffCouponPackageView,
  type BffCouponTemplateView,
} from '@/core/services/bff-coupon-api';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';

export type MemberCouponCenterTabKey = 'recommend' | 'kcoin';
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
    { key: 'kcoin', title: 'K币兑换' },
  ],
  emptyTitle: '暂无可领取/可兑换的优惠券',
  emptyDescription: '耐心等待活动发布',
};

function formatYuan(amountCent = 0) {
  const amount = amountCent / 100;
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
function formatDiscountPercent(discountPercent?: number) {
  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent) || discountPercent <= 0) return '';
  const discount = discountPercent > 10 ? discountPercent / 10 : discountPercent;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

function resolveTemplateAmountText(template?: BffCouponTemplateView) {
  if (template?.discountAmountCent && template.discountAmountCent > 0) return formatYuan(template.discountAmountCent);
  return formatDiscountPercent(template?.discountPercent) || '券';
}

function resolveTemplateThresholdText(template?: BffCouponTemplateView) {
  if (template?.thresholdAmountCent && template.thresholdAmountCent > 0) {
    return `满¥${formatYuan(template.thresholdAmountCent)}可用`;
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

function toPackageCoupon(couponPackage: BffCouponPackageView): MemberCouponCenterCoupon {
  const firstCoupon = couponPackage.coupons?.[0];
  const templateNo = firstCoupon?.templateNo;
  const claimable = couponPackage.claimable !== false && Boolean(templateNo);
  const disabledReason = couponPackage.reason || (templateNo ? undefined : '当前优惠券暂不可领取');

  return {
    id: couponPackage.packageNo,
    tabKey: 'recommend',
    source: 'package',
    title: firstCoupon?.templateName || couponPackage.packageName,
    amountText: resolveTemplateAmountText(firstCoupon),
    thresholdText: resolveTemplateThresholdText(firstCoupon),
    validityText: resolveTemplateValidityText(firstCoupon),
    actionText: claimable ? '立即领取' : disabledReason || '暂不可领',
    claimable,
    disabledReason,
    templateNo,
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
  const packageCoupons = (packagesResponse.packages ?? []).map(toPackageCoupon);
  const kcoinCoupons = crmExchanges.map(toKcoinCoupon).filter((coupon): coupon is MemberCouponCenterCoupon => Boolean(coupon));

  return {
    ...couponCenterBaseData,
    coupons: [...packageCoupons, ...kcoinCoupons],
  };
}

// 领取优惠券，后端真实入参是 promotion 模板编号 templateNo。
export async function claimMemberCoupon(coupon: MemberCouponCenterCoupon) {
  if (!coupon.templateNo) {
    throw new Error(coupon.disabledReason || '当前优惠券暂不可领取');
  }

  return claimBffCoupon({ templateNo: coupon.templateNo });
}
