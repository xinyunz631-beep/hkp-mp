import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { fetchBffMallHome, type BffMallProduct } from '@/core/services/bff-mall-api';
import {
  fetchMiniProgramPageAds,
  findMiniProgramSlotAds,
  MINI_PROGRAM_AD_PAGE_CODES,
  resolveMiniProgramAdDescription,
  resolveMiniProgramAdImage,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';
import type { MiniProgramAdView } from '@/core/types/mini-program-ad';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import {
  isRenderableMallCategory,
  isRenderableMallProduct,
  toMallBannerItem,
  toMallCategoryItem,
  toMallProductSummary,
} from './bff-adapter';
import type { MallBannerItem } from './types';

const MALL_HOME_SECONDARY_AD_SLOT_CODES = ['legacy_shop_home_secondary_ad'];
const MALL_HOME_RECOMMENDATION_LIMIT = 6;
const MALL_HOME_EXCLUDED_RECOMMENDATION_PATTERN = /(?:KUMAMON|熊本熊)/i;

function firstString(...values: unknown[]) {
  return values.find((value) => typeof value === 'string' && value.trim()) as string | undefined;
}

function legacyQueryValue(path: string, key: string) {
  const queryText = path.split('?')[1] ?? '';
  const target = queryText
    .split('&')
    .map((item) => item.split('='))
    .find(([name]) => name === key);
  return target?.[1] ? decodeURIComponent(target[1]) : '';
}

function normalizeMallBannerPath(path: string) {
  const normalized = path.trim();
  if (!normalized) return '';
  if (normalized.startsWith('#/productList')) {
    const legacyCategoryId = legacyQueryValue(normalized, 'productCategoryId');
    return legacyCategoryId
      ? `${MINI_PACKAGE_ROUTES.mallProducts}?categoryId=${encodeURIComponent(`H5MALL_CAT_${legacyCategoryId}`)}`
      : MINI_PACKAGE_ROUTES.mallProducts;
  }
  if (normalized.startsWith('#/productDetail')) {
    const legacyProductId = legacyQueryValue(normalized, 'productId');
    return legacyProductId
      ? `${MINI_PACKAGE_ROUTES.mallProductDetail}?productId=${encodeURIComponent(`H5MALL_PRODUCT_${legacyProductId}`)}`
      : MINI_PACKAGE_ROUTES.mallProducts;
  }
  if (normalized.startsWith('/')) return normalized;
  return MINI_PACKAGE_ROUTES.mallProducts;
}

function normalizeHomeBannerItem(item: unknown): MallBannerItem | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  const id = firstString(record.id, record.bannerId, record.adNo, record.adCode) ?? '';
  const imageSrc = sanitizeMallRuntimeUrl(
    firstString(
      record.imageSrc,
      record.imageUrl,
      record.coverImageUrl,
      record.backgroundImage,
      record.materialImage,
      record.mobileImageUrl,
      record.iconImage,
    ) ?? '',
  );
  const path = normalizeMallBannerPath(firstString(
    record.path,
    record.targetPath,
    record.jumpPath,
    record.jumpTarget,
    record.jumpUrl,
  ) ?? '');
  if (!id || !imageSrc || !path) return undefined;
  return {
    id,
    title: sanitizeMallRuntimeText(typeof record.title === 'string' ? record.title : ''),
    subtitle: sanitizeMallRuntimeText(typeof record.subtitle === 'string' ? record.subtitle : ''),
    imageSrc,
    path,
  };
}

function normalizeCategoryBannerFallback(banners: MallBannerItem[]) {
  const firstBanner = banners[0];
  if (!firstBanner?.imageSrc) return [];

  return [{
    id: 'banner-mall-home',
    title: '',
    subtitle: '',
    imageSrc: firstBanner.imageSrc,
    path: MINI_PACKAGE_ROUTES.mallProducts,
  }];
}

// 将首页广告资源位转换为商城中间三宫格 banner。
function normalizeSecondaryAdBanner(ad: MiniProgramAdView): MallBannerItem | undefined {
  const imageSrc = sanitizeMallRuntimeUrl(resolveMiniProgramAdImage(ad, 'background') ?? '');
  const id = firstString(ad.id, ad.adNo, ad.adCode) ?? '';
  if (!id || !imageSrc) return undefined;

  return {
    id,
    title: sanitizeMallRuntimeText(resolveMiniProgramAdTitle(ad)),
    subtitle: sanitizeMallRuntimeText(resolveMiniProgramAdDescription(ad)),
    imageSrc,
    path: MINI_PACKAGE_ROUTES.mallProducts,
    ad,
  };
}

// 商城中间三宫格沿用首页广告配置，承接 H5 参考图里的左大右二布局。
async function fetchSecondaryAdBannersFallback() {
  try {
    const pageAds = await fetchMiniProgramPageAds(MINI_PROGRAM_AD_PAGE_CODES.home);
    return findMiniProgramSlotAds(pageAds, MALL_HOME_SECONDARY_AD_SLOT_CODES)
      .map(normalizeSecondaryAdBanner)
      .filter((item): item is MallBannerItem => Boolean(item))
      .slice(0, 3);
  } catch {
    return [];
  }
}

// 首页好物推荐只保留协调的乐园商品，过滤当前黑色熊本熊类素材并限制首屏数量。
function selectMallHomeRecommendProducts(products: BffMallProduct[]) {
  return products
    .filter(isRenderableMallProduct)
    .filter((product) => {
      const searchText = [
        product.title,
        product.subtitle,
        product.brandName,
        product.mainImageUrl,
        product.shareImageUrl,
        ...(product.tags ?? []),
      ].filter(Boolean).join(' ');

      return !MALL_HOME_EXCLUDED_RECOMMENDATION_PATTERN.test(searchText);
    })
    .slice(0, MALL_HOME_RECOMMENDATION_LIMIT);
}

// 获取商城首页真实数据，接口失败时由页面异常态承接，不回退本地商品。
export async function fetchMallHomeData() {
  const response = await fetchBffMallHome();
  const categories = (response.categories ?? []).filter(isRenderableMallCategory);
  const banners = (response.banners ?? [])
    .map(normalizeHomeBannerItem)
    .filter((item): item is MallBannerItem => Boolean(item));
  const secondaryBanners = (response.secondaryBanners ?? [])
    .map(normalizeHomeBannerItem)
    .filter((item): item is MallBannerItem => Boolean(item));
  const categoryBanners = categories.map(toMallBannerItem).filter((item): item is MallBannerItem => Boolean(item));
  const resolvedSecondaryBanners = secondaryBanners.length
    ? secondaryBanners
    : await fetchSecondaryAdBannersFallback();

  return {
    banners: banners.length ? banners : normalizeCategoryBannerFallback(categoryBanners),
    secondaryBanners: resolvedSecondaryBanners,
    categories: categories.map(toMallCategoryItem),
    products: selectMallHomeRecommendProducts(response.products ?? []).map(toMallProductSummary),
  };
}
