import { fetchBffMallHome } from '@/core/services/bff-mall-api';
import { toMallBannerItem, toMallCategoryItem, toMallProductSummary, toMallPromoCard } from './bff-adapter';
import type { MallBannerItem } from './mock-data';

// 获取商城首页真实数据，接口失败时由页面异常态承接，不回退本地商品。
export async function fetchMallHomeData() {
  const response = await fetchBffMallHome();
  const categories = response.categories ?? [];
  const banners = categories.map(toMallBannerItem).filter((item): item is MallBannerItem => Boolean(item));

  return {
    banners,
    categories: categories.map(toMallCategoryItem),
    promos: (response.recommendations ?? []).slice(0, 3).map(toMallPromoCard),
    products: (response.products ?? []).map(toMallProductSummary),
  };
}
