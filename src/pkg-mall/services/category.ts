import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { fetchAllBffMallCategories, fetchAllBffMallProducts } from '@/core/services/bff-mall-api';
import type { HkpProductSummary } from '@/core/types/hkp';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import {
  isRenderableMallCategory,
  isRenderableMallProduct,
  toMallCategoryItem,
  toMallProductSummary,
} from './bff-adapter';

export interface MallCategoryNavItem {
  id: string;
  title: string;
}

export interface MallCategoryShortcutItem {
  id: string;
  title: string;
  iconSrc: string;
  path: string;
}

export interface MallCategoryData {
  query: string;
  categories: MallCategoryNavItem[];
  activeCategoryId: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageSrc: string;
  shortcuts: MallCategoryShortcutItem[];
  panels: MallCategoryPanelData[];
}

export interface MallCategoryPanelData {
  id: string;
  title: string;
  subtitle: string;
  products: HkpProductSummary[];
}

const MALL_CATEGORY_PAGE_SIZE = 100;
const MALL_CATEGORY_MAX_PAGES = 5;
const MALL_CATEGORY_PRODUCT_MAX_PAGES = 5;

// 获取商城分类真实数据。
export async function fetchCategoryData() {
  const [categoryResponse, productResponse] = await Promise.all([
    fetchAllBffMallCategories({}, {
      pageSize: MALL_CATEGORY_PAGE_SIZE,
      maxPages: MALL_CATEGORY_MAX_PAGES,
    }),
    fetchAllBffMallProducts({}, {
      pageSize: MALL_CATEGORY_PAGE_SIZE,
      maxPages: MALL_CATEGORY_PRODUCT_MAX_PAGES,
    }),
  ]);
  const mallCategories = (categoryResponse.list ?? []).filter(isRenderableMallCategory);
  const categories = mallCategories.map((category) => ({
    id: category.categoryId?.trim() || '',
    title: sanitizeMallRuntimeText(category.title),
  }));
  const activeCategory = categories[0];
  const rawProducts = (productResponse.list ?? []).filter(isRenderableMallProduct);
  const shortcuts = mallCategories.slice(0, 3).map(toMallCategoryItem);
  const productsByCategoryId = new Map<string, HkpProductSummary[]>();

  rawProducts.forEach((rawProduct) => {
    const summary = toMallProductSummary(rawProduct);

    (rawProduct.categoryIds ?? []).forEach((categoryId) => {
      const normalizedCategoryId = String(categoryId || '').trim();
      if (!normalizedCategoryId) return;

      const currentProducts = productsByCategoryId.get(normalizedCategoryId);

      if (currentProducts) {
        currentProducts.push(summary);
        return;
      }

      productsByCategoryId.set(normalizedCategoryId, [summary]);
    });
  });

  return {
    query: '',
    categories,
    activeCategoryId: activeCategory?.id || '',
    heroTitle: activeCategory?.title || '',
    heroSubtitle: activeCategory?.title ? '精选乐园周边' : '',
    heroImageSrc: sanitizeMallRuntimeUrl(mallCategories.find((category) => category.bannerUrl)?.bannerUrl) || '',
    shortcuts,
    panels: categories.map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: '可选商品',
      products: productsByCategoryId.get(category.id) ?? [],
    })),
  };
}
