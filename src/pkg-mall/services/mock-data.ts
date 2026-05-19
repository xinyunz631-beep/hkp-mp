import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import type { HkpCouponSummary, HkpFilterTab, HkpProductSummary, HkpSkuGroup } from '@/core/types/hkp';

export interface MallCategoryItem {
  id: string;
  title: string;
  iconSrc: string;
  path: string;
}

export interface MallBannerItem {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  path: string;
}

export interface MallPromoCard {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  accent: 'purple' | 'orange' | 'pink';
  path: string;
}

export interface MallHomeData {
  banners: MallBannerItem[];
  categories: MallCategoryItem[];
  promos: MallPromoCard[];
  products: HkpProductSummary[];
}

export interface MallProductListData {
  tabs: HkpFilterTab[];
  products: HkpProductSummary[];
  discountText: string;
  discountAmount: number;
  previewAmount: number;
  keyword?: string;
}

export interface MallReviewItem {
  id: string;
  author: string;
  content: string;
  tags: string[];
  imageSrcs: string[];
}

export interface MallProductDetailData {
  product: HkpProductSummary;
  gallery: string[];
  coupons: HkpCouponSummary[];
  skuGroups: HkpSkuGroup[];
  promoText: string;
  reviews: MallReviewItem[];
  recommendProducts: HkpProductSummary[];
  detailImages: string[];
}

export interface MallCartItem extends HkpProductSummary {
  quantity: number;
  checked: boolean;
  skuText: string;
  merchantName: string;
  promotionTags: string[];
  giftText?: string;
}

export interface MallCartMerchantGroup {
  id: string;
  merchantName: string;
  promotionTags: string[];
  items: MallCartItem[];
}

export interface MallCartData {
  groups: MallCartMerchantGroup[];
  recommendProducts: HkpProductSummary[];
  totalAmount: number;
}

export const mallProducts: HkpProductSummary[] = [
  {
    id: 'sanrio-icebox-sticker',
    title: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩具公仔玩偶毛绒玩具',
    subtitle: '20cm',
    image: { src: '' },
    price: 189.9,
    marketPrice: 219.9,
    tag: '新品',
    salesText: '已售 1280',
  },
  {
    id: 'kitty-cake-set',
    title: '凯蒂猫情人节生日礼物公仔玩偶毛绒玩具',
    subtitle: '30cm',
    image: { src: '' },
    price: 99,
    marketPrice: 129,
    tag: '热卖',
    salesText: '已售 856',
  },
  {
    id: 'park-plush-doll',
    title: '凯蒂猫情人节生日礼物公仔玩偶毛绒玩具',
    subtitle: '公仔大号',
    image: { src: '' },
    price: 199,
    marketPrice: 249,
    salesText: '已售 640',
  },
  {
    id: 'my-melody-plush',
    title: '凯蒂猫情人节生日礼物公仔玩偶毛绒玩具',
    subtitle: '限定粉色款',
    image: { src: '' },
    price: 99,
    marketPrice: 129,
    salesText: '已售 512',
  },
  {
    id: 'kitty-park-shirt',
    title: 'Hello Kitty乐园限定亲子T恤服装',
    subtitle: '儿童款 / 成人款',
    image: { src: '' },
    price: 159,
    marketPrice: 199,
    tag: '乐园限定',
    salesText: '已售 468',
  },
  {
    id: 'kitty-stationery-set',
    title: 'Hello Kitty学习文具套装礼盒',
    subtitle: '铅笔盒+贴纸+手账本',
    image: { src: '' },
    price: 69,
    marketPrice: 89,
    tag: '新品',
    salesText: '已售 392',
  },
  {
    id: 'kitty-mug-home',
    title: '凯蒂猫甜心马克杯家居伴手礼',
    subtitle: '陶瓷杯 320ml',
    image: { src: '' },
    price: 79,
    marketPrice: 99,
    salesText: '已售 280',
  },
  {
    id: 'kitty-kids-bag',
    title: '凯蒂猫儿童斜挎包乐园出游包',
    subtitle: '粉色小号',
    image: { src: '' },
    price: 129,
    marketPrice: 169,
    tag: '热卖',
    salesText: '已售 336',
  },
];

export const mallCoupons: HkpCouponSummary[] = [
  {
    id: 'mall-20-off',
    title: '商城通用优惠券',
    amountText: '满100减15',
    thresholdText: '全场指定商品可用',
    validityText: '有效期至 2026-06-30',
    status: 'available',
    tag: '可领取',
  },
  {
    id: 'mall-40-off',
    title: '商城加码券',
    amountText: '满200减40',
    thresholdText: 'Hello Kitty 专区可用',
    validityText: '有效期至 2026-06-30',
    status: 'available',
    tag: '限时',
  },
];

export const mallSkuGroups: HkpSkuGroup[] = [
  {
    id: 'color',
    title: '颜色',
    selectedId: 'kitty',
    options: [
      { id: 'kitty', label: 'Hello Kitty' },
      { id: 'kuromi', label: 'Kuromi' },
      { id: 'cinnamoroll', label: 'Cinnamoroll' },
    ],
  },
  {
    id: 'size',
    title: '尺码',
    selectedId: '20cm',
    options: [
      { id: '20cm', label: '20cm' },
      { id: '30cm', label: '30cm' },
      { id: '40cm', label: '40cm' },
    ],
  },
];

export const mallHomeData: MallHomeData = {
  banners: [
    {
      id: 'banner-1',
      title: '秀场看不停',
      subtitle: '带你进入 HelloKitty 大家族，欢乐一整天！',
      imageSrc: '',
      path: MINI_PACKAGE_ROUTES.mallProductDetail,
    },
    {
      id: 'banner-2',
      title: '甜心上新',
      subtitle: '限定礼盒与乐园伴手礼同步上架',
      imageSrc: '',
      path: MINI_PACKAGE_ROUTES.mallProducts,
    },
    {
      id: 'banner-3',
      title: '会员专享价',
      subtitle: '收藏的人气商品今日限时折扣',
      imageSrc: '',
      path: MINI_PACKAGE_ROUTES.mallFavorites,
    },
  ],
  categories: [
    { id: 'recommend', title: '推荐', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'new', title: '新品', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'toy', title: '玩具', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'clothes', title: '服装', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'stationery', title: '文具', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'digital', title: '数码', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'home', title: '家居', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'more', title: '更多', iconSrc: '', path: MINI_PACKAGE_ROUTES.mallCategory },
  ],
  promos: [
    {
      id: 'special-price',
      title: '特价商品',
      subtitle: '货真价实，物美价廉',
      imageSrc: '',
      accent: 'purple',
      path: MINI_PACKAGE_ROUTES.mallProducts,
    },
    {
      id: 'member-only',
      title: '会员专享',
      subtitle: '满100减30',
      imageSrc: '',
      accent: 'orange',
      path: MINI_PACKAGE_ROUTES.memberCoupons,
    },
    {
      id: 'coupon-exchange',
      title: '券兑换',
      subtitle: '100元超值兑换',
      imageSrc: '',
      accent: 'pink',
      path: MINI_PACKAGE_ROUTES.mallGiftSelect,
    },
  ],
  products: mallProducts.slice(0, 4),
};

export const mallProductListData: MallProductListData = {
  tabs: [
    { key: 'comprehensive', text: '综合' },
    { key: 'sales', text: '销量' },
    { key: 'price', text: '价格' },
    { key: 'filter', text: '筛选' },
  ],
  products: mallProducts.map((product) => ({
    ...product,
    price: 189.9,
    marketPrice: 219.9,
  })),
  discountText: '满300元减30元',
  discountAmount: 30,
  previewAmount: 399,
};

export const mallProductDetailData: MallProductDetailData = {
  product: mallProducts[0],
  gallery: ['', '', '', ''],
  coupons: mallCoupons,
  skuGroups: mallSkuGroups,
  promoText: '满2件，总价打8折',
  reviews: [
    {
      id: 'review-1',
      author: 'G**A',
      content: '非常好！很精致！和卖家图片一样，不过英伦猫咋没礼盒呢？',
      tags: ['质量好(820)', '适合人群(82)'],
      imageSrcs: ['', ''],
    },
  ],
  recommendProducts: mallProducts.slice(0, 3).map((product, index) => ({
    ...product,
    price: [259.9, 219.9, 198.9][index] ?? product.price,
  })),
  detailImages: ['', '', ''],
};

export const mallCartData: MallCartData = {
  groups: [
    {
      id: 'merchant-1',
      merchantName: 'Hello Kitty纪念品商店',
      promotionTags: ['满减:满300减50', '满100送赠品', '满2件8.0折'],
      items: [
        {
          ...mallProducts[0],
          merchantName: 'Hello Kitty纪念品商店',
          promotionTags: ['满减:满300减50', '满100送赠品', '满2件8.0折'],
          checked: true,
          quantity: 1,
          skuText: '尺寸：20cm',
          giftText: '赠品 精美钥匙扣一个',
        },
      ],
    },
    {
      id: 'merchant-2',
      merchantName: '森林王国',
      promotionTags: [],
      items: [
        {
          ...mallProducts[1],
          merchantName: '森林王国',
          promotionTags: [],
          checked: true,
          quantity: 1,
          skuText: '成人套餐4选1 用餐日期2019-10-24',
        },
      ],
    },
  ],
  recommendProducts: mallProducts.map((product, index) => ({
    ...product,
    price: [169.9, 219.9, 129.8, 148.9][index] ?? product.price,
    salesText: ['1000人付款', '999人付款', '689人付款', '799人付款'][index],
  })),
  totalAmount: 189.9,
};
