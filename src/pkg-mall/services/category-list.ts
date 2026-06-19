import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { fetchBffMallCategories } from '@/core/services/bff-mall-api';

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

// 获取分类商品真实数据。
export async function fetchCategoryListData() {
  const response = await fetchBffMallCategories({ page: 1, size: 100 });
  const categories = (response.list ?? []).map((category) => ({
    id: category.categoryId || category.title || '',
    title: category.title || category.categoryId || '商品分类',
  })).filter((category) => category.id);
  const activeCategory = categories[0];
  const brands = (response.list ?? []).map((category) => {
    const id = category.categoryId || category.title || '';
    return {
      id,
      title: category.title || category.categoryId || '商品分类',
      imageSrc: category.iconUrl || category.bannerUrl || '',
      path: `${MINI_PACKAGE_ROUTES.mallProducts}?categoryId=${encodeURIComponent(id)}`,
    };
  }).filter((item) => item.id);

  return {
    query: '',
    categories,
    activeCategoryId: activeCategory?.id || '',
    sectionTitle: activeCategory?.title || '商品分类',
    brands,
  };
}
