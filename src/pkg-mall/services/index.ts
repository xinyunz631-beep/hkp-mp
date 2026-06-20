import {
  fetchBffMallHome,
  fetchAllBffMallRecommendations,
  type BffMallRecommendation,
} from '@/core/services/bff-mall-api';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import {
  isRenderableMallCategory,
  isRenderableMallProduct,
  isRenderableMallRecommendation,
  toMallBannerItem,
  toMallCategoryItem,
  toMallProductSummary,
  toMallPromoCard,
} from './bff-adapter';
import type { MallBannerItem } from './types';

const MALL_HOME_PROMO_PLACEMENTS = ['mallHomeHot', 'mallHomeNew'] as const;
const MALL_HOME_PROMO_PAGE_SIZE = 20;
const MALL_HOME_PROMO_MAX_PAGES = 5;

// 仅把首页真实推荐位 placement 作为首页活动卡候选，避免把购物车等其他位置推荐串到首页。
function isMallHomePromoPlacement(placement?: string) {
  return MALL_HOME_PROMO_PLACEMENTS.includes((placement || '').trim() as typeof MALL_HOME_PROMO_PLACEMENTS[number]);
}

// 将首页推荐位按 placement 优先级和后台排序值统一排序，保证首页活动卡顺序稳定。
function sortMallHomePromotions(recommendations: BffMallRecommendation[]) {
  const placementRankMap = new Map<string, number>([
    ['mallHomeHot', 0],
    ['mallHomeNew', 1],
  ]);

  return recommendations.slice().sort((prev, next) => {
    const placementDiff = (placementRankMap.get((prev.placement || '').trim()) ?? 99)
      - (placementRankMap.get((next.placement || '').trim()) ?? 99);
    if (placementDiff !== 0) return placementDiff;
    const sortDiff = (prev.sortOrder ?? 0) - (next.sortOrder ?? 0);
    if (sortDiff !== 0) return sortDiff;
    return (prev.title || '').localeCompare(next.title || '', 'zh-Hans-CN');
  });
}

// 首页活动卡优先读 placement 精确接口；若后端暂未补齐，再退回 /home 聚合结果里的同 placement 真实数据。
async function fetchMallHomePromotions(fallbackRecommendations: BffMallRecommendation[]) {
  const settledResponses = await Promise.allSettled(
    MALL_HOME_PROMO_PLACEMENTS.map((placement) => fetchAllBffMallRecommendations({
      placement,
    }, {
      pageSize: MALL_HOME_PROMO_PAGE_SIZE,
      maxPages: MALL_HOME_PROMO_MAX_PAGES,
    })),
  );
  const promotionMap = new Map<string, BffMallRecommendation>();

  settledResponses.forEach((result) => {
    if (result.status !== 'fulfilled') return;
    (result.value.list ?? []).filter(isRenderableMallRecommendation).forEach((recommendation) => {
      const key = `${recommendation.poolId || recommendation.title || 'promotion'}-${recommendation.placement || ''}`;
      if (!promotionMap.has(key)) {
        promotionMap.set(key, recommendation);
      }
    });
  });

  const candidates = promotionMap.size > 0
    ? Array.from(promotionMap.values())
    : fallbackRecommendations.filter((recommendation) => (
      isRenderableMallRecommendation(recommendation) && isMallHomePromoPlacement(recommendation.placement)
    ));

  return sortMallHomePromotions(candidates).slice(0, 3).map(toMallPromoCard);
}

function normalizeHomeBannerItem(item: unknown): MallBannerItem | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : typeof record.bannerId === 'string' ? record.bannerId : '';
  const imageSrc = sanitizeMallRuntimeUrl(
    typeof record.imageSrc === 'string'
      ? record.imageSrc
      : typeof record.imageUrl === 'string'
        ? record.imageUrl
        : typeof record.coverImageUrl === 'string'
          ? record.coverImageUrl
          : '',
  );
  const path = typeof record.path === 'string'
    ? record.path
    : typeof record.targetPath === 'string'
      ? record.targetPath
      : '';
  if (!id || !imageSrc || !path) return undefined;
  return {
    id,
    title: sanitizeMallRuntimeText(typeof record.title === 'string' ? record.title : ''),
    subtitle: sanitizeMallRuntimeText(typeof record.subtitle === 'string' ? record.subtitle : ''),
    imageSrc,
    path,
  };
}

// 获取商城首页真实数据，接口失败时由页面异常态承接，不回退本地商品。
export async function fetchMallHomeData() {
  const response = await fetchBffMallHome();
  const categories = (response.categories ?? []).filter(isRenderableMallCategory);
  const banners = (response.banners ?? [])
    .map(normalizeHomeBannerItem)
    .filter((item): item is MallBannerItem => Boolean(item));
  const categoryBanners = categories.map(toMallBannerItem).filter((item): item is MallBannerItem => Boolean(item));
  const promos = await fetchMallHomePromotions(response.recommendations ?? []);

  return {
    banners: banners.length ? banners : categoryBanners,
    categories: categories.map(toMallCategoryItem),
    promos,
    products: (response.products ?? []).filter(isRenderableMallProduct).map(toMallProductSummary),
  };
}
