import { fetchBffCrmP1Exchanges, type BffCrmP1ConfigItem } from '@/core/services/bff-crm-api';
import {
  claimBffFreeClaimActivity,
  claimBffCoupon,
  exchangeBffCoupon,
  fetchBffFreeClaimActivities,
  getBffFreeClaimActivityList,
  type BffClaimCouponResponse,
  type BffFreeClaimActivityClaimResponse,
  type BffFreeClaimActivityView,
  type BffFreeClaimGiftItemView,
} from '@/core/services/bff-coupon-api';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';

export type MemberCouponCenterTabKey = 'recommend' | 'exchangeCode' | 'kcoin';
export type MemberCouponCenterSource = 'activity' | 'kcoin';

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
  giftItems?: BffFreeClaimGiftItemView[];
  targetRoute?: string;
  kCoinPrice?: number;
}

export type MemberCouponClaimResponse = BffClaimCouponResponse & Partial<BffFreeClaimActivityClaimResponse>;

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

// 格式化免费领券活动的前台可见有效期。
function resolveActivityValidityText(activity: BffFreeClaimActivityView) {
  const startAt = formatDate(activity.startAt);
  const endAt = formatDate(activity.endAt);
  if (startAt && endAt) return `${startAt}-${endAt}`;
  if (endAt) return `有效期至 ${endAt}`;
  return '活动期内可领取';
}

// 读取活动礼包项的可展示名称，按后端字段优先级兜底。
function resolveGiftName(giftItem: BffFreeClaimGiftItemView) {
  return [
    giftItem.displayName,
    giftItem.couponName,
    giftItem.templateName,
    giftItem.giftObjectName,
    giftItem.giftObjectId,
  ].map((value) => (typeof value === 'string' ? value.trim() : '')).find(Boolean) || '优惠券';
}

// 汇总活动包含的券礼品，避免前台把礼包拆平成多个独立活动。
function resolveActivityGiftSummary(giftItems: BffFreeClaimGiftItemView[] = []) {
  if (giftItems.length === 0) return '活动优惠券';
  return giftItems
    .slice(0, 2)
    .map((item) => `${resolveGiftName(item)} x${item.sendNumber || 1}`)
    .join('、')
    + (giftItems.length > 2 ? ` 等 ${giftItems.length} 组` : '');
}

// 计算活动卡片上的权益数量文案。
function resolveActivityAmountText(activity: BffFreeClaimActivityView) {
  const totalGiftCount = (activity.giftItems || []).reduce((total, item) => total + Number(item.sendNumber || 1), 0);
  if (totalGiftCount > 0) return `${totalGiftCount}张券`;
  return '领券';
}

// 将后端活动卡映射为领券中心统一卡片模型。
function toActivityCoupon(activity: BffFreeClaimActivityView): MemberCouponCenterCoupon | undefined {
  const activityId = activity.activityId;
  const canClaim = typeof activity.canClaim === 'boolean' ? activity.canClaim : activity.activityStatus === 'running';
  const disabledReason = activity.cannotClaimReason || (canClaim ? undefined : '当前活动暂不可领取');

  if (!activityId || !activity.activityName) return undefined;

  return {
    id: activityId,
    tabKey: 'recommend',
    source: 'activity',
    title: activity.activityName,
    amountText: resolveActivityAmountText(activity),
    thresholdText: resolveActivityGiftSummary(activity.giftItems),
    validityText: resolveActivityValidityText(activity),
    actionText: canClaim ? '立即领取' : disabledReason || '暂不可领',
    claimable: canClaim,
    disabledReason,
    activityId,
    giftItems: activity.giftItems,
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

// 获取领券中心页面数据：好券推荐按活动卡读取，K 币入口读 CRM 兑换配置。
export async function fetchMemberCouponCenterData() {
  const [activityResponse, crmExchanges] = await Promise.all([
    fetchBffFreeClaimActivities({ placement: 'couponCenter', displayTab: 'recommend', page: 1, pageSize: 50 }),
    fetchBffCrmP1Exchanges(),
  ]);
  const activityCoupons = getBffFreeClaimActivityList(activityResponse)
    .map(toActivityCoupon)
    .filter((coupon): coupon is MemberCouponCenterCoupon => Boolean(coupon));
  const kcoinCoupons = crmExchanges.map(toKcoinCoupon).filter((coupon): coupon is MemberCouponCenterCoupon => Boolean(coupon));

  return {
    ...couponCenterBaseData,
    coupons: [...activityCoupons, ...kcoinCoupons],
  };
}

// 生成活动领取幂等键，同一点击链路只提交一次领取请求。
function createFreeClaimIdempotentKey(activityId: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FCLAIM-${activityId}-${Date.now()}-${random}`;
}

// 领取优惠券，推荐 tab 走活动中心新接口，历史模板号只作为兼容路径。
export async function claimMemberCoupon(coupon: MemberCouponCenterCoupon): Promise<MemberCouponClaimResponse> {
  if (!coupon.activityId && !coupon.templateNo) {
    throw new Error(coupon.disabledReason || '当前优惠券暂不可领取');
  }

  if (coupon.activityId) {
    const claimResponse = await claimBffFreeClaimActivity(coupon.activityId, {
      idempotentKey: createFreeClaimIdempotentKey(coupon.activityId),
    });
    return {
      ...claimResponse,
      coupons: claimResponse.couponInstances || claimResponse.coupons,
    };
  }

  return claimBffCoupon({ templateNo: coupon.templateNo });
}

// 提交真实优惠券兑换码，兑换成功后由调用方刷新我的券资产。
export async function exchangeMemberCouponCode(exchangeCode: string) {
  const normalizedCode = exchangeCode.trim();
  if (!normalizedCode) {
    throw new Error('请输入兑换码');
  }

  return exchangeBffCoupon(normalizedCode);
}
