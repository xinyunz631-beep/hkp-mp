import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { fetchBffMallCategories, fetchBffMallProducts } from '@/core/services/bff-mall-api';
import type { HkpProductSummary } from '@/core/types/hkp';
import { toMallCategoryItem, toMallProductSummary } from './bff-adapter';

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

// 获取商城分类真实数据。
export async function fetchCategoryData() {
  const [categoryResponse, productResponse] = await Promise.all([
    fetchBffMallCategories({ page: 1, size: 100 }),
    fetchBffMallProducts({ page: 1, size: 100 }),
  ]);
  const categories = (categoryResponse.list ?? []).map((category) => ({
    id: category.categoryId || category.title || '',
    title: category.title || category.categoryId || '商品分类',
  })).filter((category) => category.id);
  const activeCategory = categories[0];
  const products = (productResponse.list ?? []).map(toMallProductSummary);
  const shortcuts = (categoryResponse.list ?? []).slice(0, 3).map(toMallCategoryItem);

  return {
    query: '',
    categories,
    activeCategoryId: activeCategory?.id || '',
    heroTitle: activeCategory?.title || '商品分类',
    heroSubtitle: activeCategory?.title ? '精选乐园周边' : '',
    heroImageSrc: categoryResponse.list?.find((category) => category.bannerUrl)?.bannerUrl || '',
    shortcuts: shortcuts.length > 0 ? shortcuts : [
      { id: 'all', title: '全部商品', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    ],
    panels: categories.map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: '可选商品',
      products: products.filter((product) => (
        product.id && productResponse.list?.find((rawProduct) => {
          const rawProductId = rawProduct.spuId || rawProduct.productCode;
          return rawProductId === product.id && rawProduct.categoryIds?.includes(category.id);
        })
      )),
    })),
  };
}
