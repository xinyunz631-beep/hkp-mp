import { fetchBffCrmP1Exchanges, type BffCrmP1ConfigItem } from '@/core/services/bff-crm-api';
import {
  claimBffFreeClaimActivity,
  claimBffCoupon,
  exchangeBffCoupon,
  fetchBffMemberCoupons,
  fetchBffFreeClaimActivities,
  getBffCouponTitle,
  getBffFreeClaimActivityList,
  getBffMemberCouponList,
  type BffClaimCouponResponse,
  type BffCouponAssetView,
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
  claimed?: boolean;
  disabledReason?: string;
  templateNo?: string;
  couponNo?: string;
  activityId?: string;
  giftItems?: MemberCouponCenterActivityGift[];
  targetRoute?: string;
  kCoinPrice?: number;
}

export type MemberCouponClaimResponse = BffClaimCouponResponse & Partial<BffFreeClaimActivityClaimResponse>;

export interface MemberCouponCenterActivityGift {
  id: string;
  giftId?: string;
  title: string;
  amountText: string;
  actionText: string;
  claimable: boolean;
  claimed: boolean;
  couponNo?: string;
  templateNo?: string;
  disabledReason?: string;
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

// 读取后端领取状态，兼容数字、布尔和字符串三种返回形态。
function readClaimedCount(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return 0;
    if (['true', 'yes', 'claimed', '已领取'].includes(normalized)) return 1;
    const numericValue = Number(normalized);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }

  return 0;
}

function isClaimedReason(reason?: string) {
  return typeof reason === 'string' && reason.includes('已领取');
}

function firstText(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find(Boolean);
}

function normalizeReason(reason?: string) {
  const normalized = reason?.trim();
  if (!normalized) return undefined;
  const genericReasons = [
    '暂不可领',
    '当前券暂不可领',
    '当前礼品不可领取',
    '当前优惠券暂不可领取',
    '优惠券当前不可领取',
    '当前活动暂不可领取',
    '领券活动当前不可领取',
  ];
  return genericReasons.some((item) => normalized.includes(item)) ? undefined : normalized;
}

// 不用前端本地时间推断活动窗口，状态原因以 BFF 明确字段为准。
function resolveActivityStatusReason(activity: BffFreeClaimActivityView) {
  switch (activity.activityStatus) {
    case 'draft':
      return '活动未发布';
    case 'scheduled':
      return '活动待开始';
    case 'paused':
      return '活动已暂停';
    case 'ended':
      return '活动已结束';
    case 'abnormal':
      return '活动异常';
    default:
      return undefined;
  }
}

function resolveGiftStatusReason(activity: BffFreeClaimActivityView, giftItem: BffFreeClaimGiftItemView, giftId?: string) {
  const backendReason = normalizeReason(giftItem.cannotClaimReason || activity.cannotClaimReason);
  if (backendReason) return backendReason;

  const activityReason = resolveActivityStatusReason(activity);
  if (activityReason) return activityReason;

  if (typeof giftItem.remainingStock === 'number' && giftItem.remainingStock <= 0) return '库存不足';
  const couponTemplateStatus = giftItem.couponTemplateStatus?.trim().toLowerCase();
  if (couponTemplateStatus && !['published', 'enabled', 'enable', 'active', 'normal', '正常', '启用', '上架'].includes(couponTemplateStatus)) {
    return '券模板不可用';
  }
  if (!giftId) return '活动配置待同步';
  return '暂不可领';
}

function resolveGiftCouponNo(giftItem: BffFreeClaimGiftItemView) {
  return firstText(
    giftItem.couponNo,
    giftItem.memberCouponNo,
    giftItem.claimedCouponNo,
    giftItem.couponNos?.[0],
    giftItem.couponInstances?.find((coupon) => coupon.couponNo)?.couponNo,
  );
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
function resolveGiftName(giftItem: BffFreeClaimGiftItemView, index = 0) {
  return [
    giftItem.displayName,
    giftItem.couponName,
    giftItem.templateName,
    giftItem.giftObjectName,
    giftItem.giftName,
  ].map((value) => (typeof value === 'string' ? value.trim() : '')).find(Boolean) || `优惠券 ${index + 1}`;
}

// 生成活动子券的稳定前端 ID，优先使用后端 giftId。
function resolveGiftId(activityId: string, giftItem: BffFreeClaimGiftItemView, index: number) {
  return giftItem.giftId || `${activityId}-gift-${giftItem.giftObjectId || index}`;
}

function resolveActivityGiftTotalCount(activity: BffFreeClaimActivityView) {
  return Number(activity.totalCouponCount || 0)
    || (activity.giftItems || []).reduce((total, item) => total + Number(item.claimUnitCount || item.sendNumber || 1), 0);
}

// 将 BFF 子券转换为活动卡内部的可点击券行。
function toActivityGift(activity: BffFreeClaimActivityView, giftItem: BffFreeClaimGiftItemView, index: number): MemberCouponCenterActivityGift {
  const activityClaimable = typeof activity.canClaim === 'boolean' ? activity.canClaim : activity.activityStatus === 'running';
  const claimedCount = Math.max(readClaimedCount(giftItem.claimedByCurrentMember), readClaimedCount(giftItem.currentMemberClaimedCount));
  const reason = giftItem.cannotClaimReason || activity.cannotClaimReason;
  const activityClaimedCount = readClaimedCount(activity.claimedByCurrentMember);
  const activityGiftTotalCount = resolveActivityGiftTotalCount(activity);
  const inferredActivityClaimed = activityGiftTotalCount > 0 && activityClaimedCount >= activityGiftTotalCount;
  const alreadyClaimed = claimedCount > 0 || isClaimedReason(reason) || inferredActivityClaimed;
  const giftClaimable = typeof giftItem.canClaim === 'boolean' ? giftItem.canClaim : activityClaimable;
  const giftId = giftItem.giftId;
  const couponNo = resolveGiftCouponNo(giftItem);
  const templateNo = firstText(giftItem.templateNo, giftItem.couponTemplateId);
  const claimIdentity = giftId || templateNo;
  const disabledReason = alreadyClaimed
    ? '已领取'
    : resolveGiftStatusReason(activity, giftItem, claimIdentity);
  const claimable = Boolean(!alreadyClaimed && giftClaimable && claimIdentity);
  const sendNumber = Number(giftItem.claimUnitCount || giftItem.sendNumber || 1);

  return {
    id: resolveGiftId(activity.activityId, giftItem, index),
    giftId,
    title: resolveGiftName(giftItem, index),
    amountText: `${sendNumber}张`,
    actionText: alreadyClaimed ? '已领取' : claimable ? '领取' : '暂不可领',
    claimable,
    claimed: alreadyClaimed,
    couponNo,
    templateNo,
    disabledReason,
  };
}

// 汇总活动包含的券礼品，避免前台把礼包拆平成多个独立活动。
function resolveActivityGiftSummary(giftItems: BffFreeClaimGiftItemView[] = []) {
  if (giftItems.length === 0) return '活动优惠券';
  return giftItems
    .slice(0, 2)
    .map((item, index) => `${resolveGiftName(item, index)} x${item.sendNumber || 1}`)
    .join('、')
    + (giftItems.length > 2 ? ` 等 ${giftItems.length} 组` : '');
}

// 计算活动卡片上的权益数量文案。
function resolveActivityAmountText(activity: BffFreeClaimActivityView) {
  const totalGiftCount = resolveActivityGiftTotalCount(activity);
  if (totalGiftCount > 0) return `${totalGiftCount}张券`;
  return '领券';
}

// 将后端活动卡映射为领券中心统一卡片模型。
function toActivityCoupon(activity: BffFreeClaimActivityView): MemberCouponCenterCoupon | undefined {
  const activityId = activity.activityId;
  if (!activityId || !activity.activityName) return undefined;

  const giftItems = (activity.giftItems || []).map((item, index) => toActivityGift(activity, item, index));
  const canClaim = typeof activity.canClaim === 'boolean' ? activity.canClaim : activity.activityStatus === 'running';
  const activityClaimedCount = readClaimedCount(activity.claimedByCurrentMember);
  const totalCouponCount = Number(activity.totalCouponCount || 0)
    || giftItems.reduce((total, item) => total + Number.parseInt(item.amountText, 10), 0);
  const allGiftClaimed = Boolean(giftItems.length && giftItems.every((item) => item.claimed));
  const allClaimed = allGiftClaimed || Boolean(giftItems.length && totalCouponCount > 0 && activityClaimedCount >= totalCouponCount);
  const claimedCouponNo = giftItems.find((item) => item.claimed && item.couponNo)?.couponNo;
  const canClaimAll = typeof activity.canClaimAll === 'boolean'
    ? activity.canClaimAll
    : (giftItems.length ? giftItems.some((item) => item.claimable) : canClaim);
  const disabledReason = allClaimed
    ? '已领取'
    : normalizeReason(activity.cannotClaimReason) || resolveActivityStatusReason(activity) || (canClaim ? undefined : '暂不可领');

  return {
    id: activityId,
    tabKey: 'recommend',
    source: 'activity',
    title: activity.activityName,
    amountText: resolveActivityAmountText(activity),
    thresholdText: resolveActivityGiftSummary(activity.giftItems),
    validityText: resolveActivityValidityText(activity),
    actionText: allClaimed ? '已领取' : canClaimAll ? '一键领取' : '暂不可领',
    claimable: Boolean(!allClaimed && canClaimAll),
    claimed: allClaimed,
    disabledReason,
    activityId,
    couponNo: claimedCouponNo,
    giftItems,
  };
}

function matchClaimedCoupon(coupon: BffCouponAssetView, target?: { templateNo?: string; title?: string }) {
  if (!coupon.couponNo) return false;
  if (target?.templateNo && [coupon.templateNo, coupon.templateId].includes(target.templateNo)) return true;
  const title = target?.title?.trim();
  if (!title) return false;
  return [coupon.couponName, coupon.displayName, coupon.title, getBffCouponTitle(coupon)]
    .map((value) => value?.trim())
    .some((value) => Boolean(value && (value.includes(title) || title.includes(value))));
}

export async function resolveClaimedMemberCouponNo(coupon: MemberCouponCenterCoupon, gift?: MemberCouponCenterActivityGift) {
  const directCouponNo = firstText(gift?.couponNo, coupon.couponNo);
  if (directCouponNo) return directCouponNo;
  if (!(gift?.claimed || coupon.claimed)) return undefined;

  const response = await fetchBffMemberCoupons({ page: 1, size: 100 });
  const memberCoupons = getBffMemberCouponList(response);
  const target = {
    templateNo: firstText(gift?.templateNo, coupon.templateNo),
    title: gift?.title || coupon.title,
  };
  return memberCoupons.find((item) => matchClaimedCoupon(item, target))?.couponNo;
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
function createFreeClaimIdempotentKey(activityId: string, giftId?: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FCLAIM-${activityId}${giftId ? `-${giftId}` : ''}-${Date.now()}-${random}`;
}

// 领取优惠券，推荐 tab 走活动中心新接口，历史模板号只作为兼容路径。
export async function claimMemberCoupon(
  coupon: MemberCouponCenterCoupon,
  options: { giftId?: string; templateNo?: string } = {},
): Promise<MemberCouponClaimResponse> {
  if (!coupon.activityId && !coupon.templateNo) {
    throw new Error(coupon.disabledReason || '当前优惠券暂不可领取');
  }

  if (coupon.activityId) {
    if (!options.giftId && options.templateNo) {
      return claimBffCoupon({ templateNo: options.templateNo, activityId: coupon.activityId });
    }
    const claimMode = options.giftId ? 'singleGift' : 'activityAll';
    const claimResponse = await claimBffFreeClaimActivity(coupon.activityId, {
      idempotentKey: createFreeClaimIdempotentKey(coupon.activityId, options.giftId),
      claimMode,
      giftId: options.giftId,
      quantity: options.giftId ? 1 : undefined,
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
