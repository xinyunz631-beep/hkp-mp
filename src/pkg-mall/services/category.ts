import { resolveMockData } from '@/core/services/mock';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import type { HkpProductSummary } from '@/core/types/hkp';
import { mallProducts } from './mock-data';

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

const categoryHeroImageSrc = 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80';

function createPanel(id: string, title: string, subtitle: string, productOffset: number): MallCategoryPanelData {
  const products = [...mallProducts.slice(productOffset), ...mallProducts.slice(0, productOffset)].slice(0, 8);

  return {
    id,
    title,
    subtitle,
    products,
  };
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
    activeCategoryId: 'new',
    heroTitle: '热销推荐',
    heroSubtitle: '好礼等你来袭',
    heroImageSrc: categoryHeroImageSrc,
    shortcuts: [
      { id: 'all', title: '全部商品', iconSrc: mallProducts[0].image.src, path: MINI_PACKAGE_ROUTES.mallProducts },
      { id: 'curated', title: '精选好物', iconSrc: mallProducts[1].image.src, path: MINI_PACKAGE_ROUTES.mallRecommend },
      { id: 'hot', title: '网红爆款', iconSrc: mallProducts[2].image.src, path: MINI_PACKAGE_ROUTES.mallRecommend },
    ],
    panels: [
      createPanel('new', '新品上架', '乐园限定新品优先看', 0),
      createPanel('recommend', '热销推荐', '游客都在买的伴手礼', 0),
      createPanel('digital-home', '数码家居', '杯具、出游包与居家周边', 4),
      createPanel('home-life', '家居生活', '把乐园甜心氛围带回家', 5),
      createPanel('toy', '玩具积木', '毛绒、公仔与亲子玩具', 0),
      createPanel('wear', '服装童装', '亲子穿搭与乐园限定服饰', 3),
      createPanel('mother', '亲子母婴', '儿童出游轻便好物', 6),
      createPanel('care', '个护清洁', '出游护理与收纳小物', 5),
      createPanel('stationery', '文具办公', '手账、贴纸和学习套装', 4),
      createPanel('travel', '旅行户外', '斜挎包、礼袋和随身周边', 6),
    ],
  });
}
