import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import type { HkpCouponSummary, HkpProductSummary, HkpSkuGroup } from '@/core/types/hkp';

export interface MallCategoryItem {
  id: string;
  title: string;
  iconSrc: string;
  path: string;
}

export interface MallHomeData {
  banners: string[];
  categories: MallCategoryItem[];
  products: HkpProductSummary[];
}

export interface MallProductListData {
  tabs: Array<{ key: string; text: string; count?: number }>;
  products: HkpProductSummary[];
}

export interface MallProductDetailData {
  product: HkpProductSummary;
  gallery: string[];
  coupons: HkpCouponSummary[];
  skuGroups: HkpSkuGroup[];
}

export interface MallCartData {
  items: Array<HkpProductSummary & { quantity: number; checked: boolean }>;
  totalAmount: number;
}

export const mallProducts: HkpProductSummary[] = [
  {
    id: 'sanrio-icebox-sticker',
    title: '新国风冰箱贴盲盒',
    subtitle: 'Hello Kitty Park 十周年限定',
    image: { src: '' },
    price: 59,
    marketPrice: 69,
    tag: '新品',
    salesText: '已售 1280',
  },
  {
    id: 'kitty-cake-set',
    title: '乐园限定甜点礼盒',
    subtitle: '适合入园伴手礼',
    image: { src: '' },
    price: 128,
    marketPrice: 168,
    tag: '热卖',
    salesText: '已售 856',
  },
  {
    id: 'park-plush-doll',
    title: '主题角色毛绒挂件',
    subtitle: '多角色可选',
    image: { src: '' },
    price: 89,
    salesText: '已售 640',
  },
];

export const mallCoupons: HkpCouponSummary[] = [
  {
    id: 'mall-20-off',
    title: '商城通用券',
    amountText: '¥20',
    thresholdText: '满 199 可用',
    validityText: '有效期至 2026-06-30',
    status: 'available',
    tag: '可领取',
  },
];

export const mallSkuGroups: HkpSkuGroup[] = [
  {
    id: 'style',
    title: '款式',
    selectedId: 'kitty',
    options: [
      { id: 'kitty', label: 'Hello Kitty' },
      { id: 'kuromi', label: 'Kuromi' },
      { id: 'cinnamoroll', label: 'Cinnamoroll' },
    ],
  },
  {
    id: 'bundle',
    title: '规格',
    selectedId: 'single',
    options: [
      { id: 'single', label: '单件' },
      { id: 'set', label: '三件套' },
    ],
  },
];

export const mallHomeData: MallHomeData = {
  banners: [''],
  categories: [
    { id: 'category', title: '分类', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallCategory },
    { id: 'favorites', title: '收藏', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallFavorites },
    { id: 'cart', title: '购物车', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallCart },
  ],
  products: mallProducts,
};

export const mallProductListData: MallProductListData = {
  tabs: [
    { key: 'all', text: '全部', count: mallProducts.length },
    { key: 'new', text: '新品' },
    { key: 'hot', text: '热卖' },
  ],
  products: mallProducts,
};

export const mallProductDetailData: MallProductDetailData = {
  product: mallProducts[0],
  gallery: ['', '', ''],
  coupons: mallCoupons,
  skuGroups: mallSkuGroups,
};

export const mallCartData: MallCartData = {
  items: mallProducts.slice(0, 2).map((item, index) => ({
    ...item,
    checked: true,
    quantity: index + 1,
  })),
  totalAmount: mallProducts[0].price + mallProducts[1].price * 2,
};
