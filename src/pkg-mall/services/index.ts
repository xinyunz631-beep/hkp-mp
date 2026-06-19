import { fetchBffMallHome } from '@/core/services/bff-mall-api';
import { toMallBannerItem, toMallCategoryItem, toMallProductSummary, toMallPromoCard } from './bff-adapter';
import type { MallBannerItem } from './types';

function normalizeHomeBannerItem(item: unknown): MallBannerItem | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const record = item as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : typeof record.bannerId === 'string' ? record.bannerId : '';
  const imageSrc = typeof record.imageSrc === 'string'
    ? record.imageSrc
    : typeof record.imageUrl === 'string'
      ? record.imageUrl
      : typeof record.coverImageUrl === 'string'
        ? record.coverImageUrl
        : '';
  const path = typeof record.path === 'string'
    ? record.path
    : typeof record.targetPath === 'string'
      ? record.targetPath
      : '';
  if (!id || !imageSrc || !path) return undefined;
  return {
    id,
    title: typeof record.title === 'string' ? record.title : '',
    subtitle: typeof record.subtitle === 'string' ? record.subtitle : '',
    imageSrc,
    path,
  };
}

// 获取商城首页真实数据，接口失败时由页面异常态承接，不回退本地商品。
export async function fetchMallHomeData() {
  const response = await fetchBffMallHome();
  const categories = response.categories ?? [];
  const banners = (response.banners ?? [])
    .map(normalizeHomeBannerItem)
    .filter((item): item is MallBannerItem => Boolean(item));
  const categoryBanners = categories.map(toMallBannerItem).filter((item): item is MallBannerItem => Boolean(item));

  return {
    banners: banners.length ? banners : categoryBanners,
    categories: categories.map(toMallCategoryItem),
    promos: (response.recommendations ?? []).slice(0, 3).map(toMallPromoCard),
    products: (response.products ?? []).map(toMallProductSummary),
  };
}
