import { resolveMockData } from '@/core/services/mock';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';

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
}

// 获取商城分类页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCategoryData() {
  return resolveMockData<MallCategoryData>({
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
    activeCategoryId: 'recommend',
    heroTitle: '热销推荐',
    heroSubtitle: '好礼等你来袭',
    heroImageSrc: '',
    shortcuts: [
      { id: 'all', title: '全部商品', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
      { id: 'curated', title: '精选好物', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallRecommend },
      { id: 'hot', title: '网红爆款', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallRecommend },
    ],
  });
}
