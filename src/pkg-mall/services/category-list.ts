import { resolveMockData } from '@/core/services/mock';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';

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

// 获取分类商品页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCategoryListData() {
  return resolveMockData<MallCategoryListData>({
    query: '凯迪猫',
    categories: [
      { id: 'new', title: '新品' },
      { id: 'recommend', title: '推荐' },
      { id: 'digital-home', title: '数码家居' },
      { id: 'home-life', title: '家居生活' },
      { id: 'toy', title: '玩具积木' },
      { id: 'wear', title: '服装童装' },
      { id: 'mother', title: '亲子母婴' },
      { id: 'care', title: '个护清洁' },
      { id: 'stationery', title: '文具办公' },
      { id: 'travel', title: '旅行户外' },
    ],
    activeCategoryId: 'digital-home',
    sectionTitle: '数码家电',
    brands: [
      { id: 'canon', title: '佳能', imageSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
      { id: 'sony', title: '宾得', imageSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
      { id: 'nikon', title: '尼康', imageSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    ],
  });
}
