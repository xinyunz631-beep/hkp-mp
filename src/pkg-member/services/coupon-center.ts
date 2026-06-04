import { fetchBffCrmP1Coupons, type BffCrmP1ConfigItem } from '@/core/services/bff-crm-api';
import { withServiceFallback } from '@/core/services/mock';

export type MemberCouponCenterTabKey = 'recommend' | 'kcoin';

export interface MemberCouponCenterTab {
  key: MemberCouponCenterTabKey;
  title: string;
}

export interface MemberCouponCenterCoupon {
  id: string;
  tabKey: MemberCouponCenterTabKey;
  title: string;
  amountText: string;
  thresholdText: string;
  validityText: string;
  actionText: string;
  kCoinPrice?: number;
}

export interface MemberCouponCenterData {
  tabs: MemberCouponCenterTab[];
  coupons: MemberCouponCenterCoupon[];
  emptyTitle: string;
  emptyDescription: string;
}

const couponCenterData: MemberCouponCenterData = {
  tabs: [
    { key: 'recommend', title: '好券推荐' },
    { key: 'kcoin', title: 'K币兑换' },
  ],
  coupons: [
    {
      id: '7000000000001001',
      tabKey: 'recommend',
      title: '乐园门票立减券',
      amountText: '30元',
      thresholdText: '满199元可用',
      validityText: '领取后7天内有效',
      actionText: '立即领取',
    },
    {
      id: '7000000000001002',
      tabKey: 'recommend',
      title: '餐饮套餐优惠券',
      amountText: '20元',
      thresholdText: '满99元可用',
      validityText: '领取后14天内有效',
      actionText: '立即领取',
    },
    {
      id: '7000000000001003',
      tabKey: 'recommend',
      title: '官方商城满减券',
      amountText: '50元',
      thresholdText: '满299元可用',
      validityText: '领取后30天内有效',
      actionText: '立即领取',
    },
    {
      id: '7000000000001004',
      tabKey: 'kcoin',
      title: '酒店住宿优惠券',
      amountText: '80元',
      thresholdText: '满599元可用',
      validityText: '兑换后30天内有效',
      actionText: '120K币',
      kCoinPrice: 120,
    },
    {
      id: '7000000000001005',
      tabKey: 'kcoin',
      title: '园区购物优惠券',
      amountText: '60元',
      thresholdText: '满399元可用',
      validityText: '兑换后30天内有效',
      actionText: '90K币',
      kCoinPrice: 90,
    },
  ],
  emptyTitle: '暂无可领取/可兑换的优惠券',
  emptyDescription: '耐心等待活动发布',
};

function readExtraButtonText(item: BffCrmP1ConfigItem) {
  if (!item.extraPayload) return undefined;

  try {
    const extra = JSON.parse(item.extraPayload) as { buttonText?: string };
    return extra.buttonText;
  } catch {
    return undefined;
  }
}

function toCouponCenterCoupon(item: BffCrmP1ConfigItem): MemberCouponCenterCoupon {
  const kCoinPrice = item.pointsCost || undefined;

  return {
    id: item.itemNo,
    tabKey: kCoinPrice ? 'kcoin' : 'recommend',
    title: item.itemName,
    amountText: item.badgeText || item.tagText || '会员券',
    thresholdText: item.subtitle || item.description || '按券包规则使用',
    validityText: item.endAt ? `有效期至 ${item.endAt.slice(0, 10)}` : '领取后按券包规则生效',
    actionText: readExtraButtonText(item) || (kCoinPrice ? `${kCoinPrice}K币` : '立即领取'),
    kCoinPrice,
  };
}

// 获取领券中心页面数据，后续真实接口接入时保持相同字段承载页面状态。
export function fetchMemberCouponCenterData() {
  return withServiceFallback(async () => {
    const coupons = (await fetchBffCrmP1Coupons()).map(toCouponCenterCoupon);
    return {
      ...couponCenterData,
      coupons,
    };
  }, couponCenterData);
}
