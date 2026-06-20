import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { fetchAllBffMallCategories } from '@/core/services/bff-mall-api';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import { isRenderableMallCategory } from './bff-adapter';

export interface MallCategoryBrandItem {
  id: string;
  title: string;
  imageSrc: string;
  path: string;
}

export interface MallCategoryListData {
  query: string;
  categories: Array<{ id: string; title: string }>;
  activeCategoryId: string;
  sectionTitle: string;
  brands: MallCategoryBrandItem[];
}

const MALL_CATEGORY_LIST_PAGE_SIZE = 100;
const MALL_CATEGORY_LIST_MAX_PAGES = 5;

// 获取分类商品真实数据。
export async function fetchCategoryListData() {
  const response = await fetchAllBffMallCategories({}, {
    pageSize: MALL_CATEGORY_LIST_PAGE_SIZE,
    maxPages: MALL_CATEGORY_LIST_MAX_PAGES,
  });
  const mallCategories = (response.list ?? []).filter(isRenderableMallCategory);
  const categories = mallCategories.map((category) => ({
    id: category.categoryId?.trim() || '',
    title: sanitizeMallRuntimeText(category.title),
  }));
  const activeCategory = categories[0];
  const brands = mallCategories.map((category) => {
    const id = category.categoryId?.trim() || '';
    return {
      id,
      title: sanitizeMallRuntimeText(category.title),
      imageSrc: sanitizeMallRuntimeUrl(category.iconUrl) || sanitizeMallRuntimeUrl(category.bannerUrl) || '',
      path: `${MINI_PACKAGE_ROUTES.mallProducts}?categoryId=${encodeURIComponent(id)}`,
    };
  });

  return {
    query: '',
    categories,
    activeCategoryId: activeCategory?.id || '',
    sectionTitle: activeCategory?.title || '',
    brands,
  };
}
