import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import type { MallShippingRule } from '@/core/services/mall-checkout-draft';
import type {
  HkpCouponSummary,
  HkpFilterTab,
  HkpProductSummary,
  HkpSkuGroup,
  HkpSkuVariantBase,
} from '@/core/types/hkp';

const mallImageAssets = {
  hero: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80',
  heroGift: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=1200&q=80',
  heroMember: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=1200&q=80',
  plush: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=900&q=80',
  doll: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=900&q=80',
  toy: 'https://images.unsplash.com/photo-1566577134665-7d16aa2f0091?auto=format&fit=crop&w=900&q=80',
  shirt: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
  stationery: 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?auto=format&fit=crop&w=900&q=80',
  mug: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80',
  bag: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80',
  gift: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80',
};

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
  skuVariants: MallSkuVariant[];
  promoText: string;
  reviewCountText: string;
  reviews: MallReviewItem[];
  recommendProducts: HkpProductSummary[];
  detailImages: string[];
  detailHtml: string;
}

export interface MallSkuVariant extends HkpSkuVariantBase {
  id: string;
  optionIds: Record<string, string>;
  price: number;
  stock: number;
  imageSrc: string;
  skuText: string;
  giftText?: string;
  shippingRule?: MallShippingRule;
}

export interface MallCartItem extends HkpProductSummary {
  productId?: string;
  skuId?: string;
  quantity: number;
  checked: boolean;
  skuText: string;
  merchantName: string;
  promotionTags: string[];
  giftText?: string;
  canRefund?: boolean;
  canAfterSale?: boolean;
  shippingRule?: MallShippingRule;
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
    title: 'Hello Kitty 乐园限定毛绒公仔',
    subtitle: '20cm / 亲肤毛绒',
    image: { src: mallImageAssets.plush },
    price: 189.9,
    marketPrice: 219.9,
    tag: '新品',
    salesText: '已售 1280',
  },
  {
    id: 'kitty-cake-set',
    title: '凯蒂猫甜心礼盒套装',
    subtitle: '公仔+徽章+礼袋',
    image: { src: mallImageAssets.gift },
    price: 99,
    marketPrice: 129,
    tag: '热卖',
    salesText: '已售 856',
  },
  {
    id: 'park-plush-doll',
    title: '乐园家族大号陪伴玩偶',
    subtitle: '40cm / 抱枕款',
    image: { src: mallImageAssets.doll },
    price: 199,
    marketPrice: 249,
    salesText: '已售 640',
  },
  {
    id: 'my-melody-plush',
    title: 'My Melody 粉色限定玩偶',
    subtitle: '限定粉色款',
    image: { src: mallImageAssets.toy },
    price: 99,
    marketPrice: 129,
    salesText: '已售 512',
  },
  {
    id: 'kitty-park-shirt',
    title: 'Hello Kitty乐园限定亲子T恤服装',
    subtitle: '儿童款 / 成人款',
    image: { src: mallImageAssets.shirt },
    price: 159,
    marketPrice: 199,
    tag: '乐园限定',
    salesText: '已售 468',
  },
  {
    id: 'kitty-stationery-set',
    title: 'Hello Kitty学习文具套装礼盒',
    subtitle: '铅笔盒+贴纸+手账本',
    image: { src: mallImageAssets.stationery },
    price: 69,
    marketPrice: 89,
    tag: '新品',
    salesText: '已售 392',
  },
  {
    id: 'kitty-mug-home',
    title: '凯蒂猫甜心马克杯家居伴手礼',
    subtitle: '陶瓷杯 320ml',
    image: { src: mallImageAssets.mug },
    price: 79,
    marketPrice: 99,
    salesText: '已售 280',
  },
  {
    id: 'kitty-kids-bag',
    title: '凯蒂猫儿童斜挎包乐园出游包',
    subtitle: '粉色小号',
    image: { src: mallImageAssets.bag },
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
    id: 'character',
    title: '角色',
    selectedId: 'kitty',
    options: [
      { id: 'kitty', label: 'Hello Kitty' },
      { id: 'melody', label: 'My Melody' },
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
  {
    id: 'package',
    title: '套装',
    selectedId: 'standard',
    options: [
      { id: 'standard', label: '单只公仔' },
      { id: 'gift', label: '礼盒装' },
      { id: 'family', label: '亲子双只装' },
    ],
  },
];

export const mallSkuVariants: MallSkuVariant[] = [
  {
    id: 'kitty-20-standard',
    optionIds: { character: 'kitty', size: '20cm', package: 'standard' },
    price: 189.9,
    stock: 18,
    imageSrc: mallImageAssets.plush,
    skuText: 'Hello Kitty / 20cm / 单只公仔',
    shippingRule: { mode: 'express', freightAmount: 0, supportedRegionKeywords: ['上海', '浙江', '江苏'] },
  },
  {
    id: 'kitty-30-gift',
    optionIds: { character: 'kitty', size: '30cm', package: 'gift' },
    price: 239.9,
    stock: 9,
    imageSrc: mallImageAssets.gift,
    skuText: 'Hello Kitty / 30cm / 礼盒装',
    giftText: '赠品 精美钥匙扣一个',
    shippingRule: { mode: 'express', freightAmount: 0, supportedRegionKeywords: ['上海', '浙江', '江苏'] },
  },
  {
    id: 'kitty-40-family',
    optionIds: { character: 'kitty', size: '40cm', package: 'family' },
    price: 329.9,
    stock: 5,
    imageSrc: mallImageAssets.doll,
    skuText: 'Hello Kitty / 40cm / 亲子双只装',
    shippingRule: { mode: 'express', freightAmount: 12, supportedRegionKeywords: ['上海', '浙江'] },
  },
  {
    id: 'melody-20-standard',
    optionIds: { character: 'melody', size: '20cm', package: 'standard' },
    price: 169.9,
    stock: 12,
    imageSrc: mallImageAssets.toy,
    skuText: 'My Melody / 20cm / 单只公仔',
    shippingRule: { mode: 'express', freightAmount: 0, supportedRegionKeywords: ['上海', '浙江', '江苏'] },
  },
  {
    id: 'melody-30-gift',
    optionIds: { character: 'melody', size: '30cm', package: 'gift' },
    price: 219.9,
    stock: 0,
    imageSrc: mallImageAssets.gift,
    skuText: 'My Melody / 30cm / 礼盒装',
    shippingRule: { mode: 'express', freightAmount: 0, supportedRegionKeywords: ['上海', '浙江'] },
  },
  {
    id: 'cinnamoroll-20-gift',
    optionIds: { character: 'cinnamoroll', size: '20cm', package: 'gift' },
    price: 229.9,
    stock: 7,
    imageSrc: mallImageAssets.gift,
    skuText: 'Cinnamoroll / 20cm / 礼盒装',
    giftText: '赠品 角色贴纸一套',
    shippingRule: { mode: 'express', freightAmount: 8, supportedRegionKeywords: ['上海', '浙江', '江苏'] },
  },
  {
    id: 'cinnamoroll-30-family',
    optionIds: { character: 'cinnamoroll', size: '30cm', package: 'family' },
    price: 299.9,
    stock: 3,
    imageSrc: mallImageAssets.doll,
    skuText: 'Cinnamoroll / 30cm / 亲子双只装',
    shippingRule: { mode: 'pickupOnly', reasonText: '该套装体积较大，仅支持乐园门店自提' },
  },
];

export const mallHomeData: MallHomeData = {
  banners: [
    {
      id: 'banner-1',
      title: '秀场看不停',
      subtitle: '带你进入 HelloKitty 大家族，欢乐一整天！',
      imageSrc: mallImageAssets.hero,
      path: MINI_PACKAGE_ROUTES.mallProductDetail,
    },
    {
      id: 'banner-2',
      title: '甜心上新',
      subtitle: '限定礼盒与乐园伴手礼同步上架',
      imageSrc: mallImageAssets.heroGift,
      path: MINI_PACKAGE_ROUTES.mallProducts,
    },
    {
      id: 'banner-3',
      title: '会员专享价',
      subtitle: '收藏的人气商品今日限时折扣',
      imageSrc: mallImageAssets.heroMember,
      path: MINI_PACKAGE_ROUTES.mallFavorites,
    },
  ],
  categories: [
    { id: 'recommend', title: '推荐', iconSrc: mallImageAssets.plush, path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'new', title: '新品', iconSrc: mallImageAssets.gift, path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'toy', title: '玩具', iconSrc: mallImageAssets.toy, path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'clothes', title: '服装', iconSrc: mallImageAssets.shirt, path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'stationery', title: '文具', iconSrc: mallImageAssets.stationery, path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'digital', title: '数码', iconSrc: mallImageAssets.mug, path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'home', title: '家居', iconSrc: mallImageAssets.mug, path: MINI_PACKAGE_ROUTES.mallProducts },
    { id: 'more', title: '更多', iconSrc: mallImageAssets.bag, path: MINI_PACKAGE_ROUTES.mallCategory },
  ],
  promos: [
    {
      id: 'special-price',
      title: '特价商品',
      subtitle: '货真价实，物美价廉',
      imageSrc: mallImageAssets.plush,
      accent: 'purple',
      path: MINI_PACKAGE_ROUTES.mallProducts,
    },
    {
      id: 'member-only',
      title: '会员专享',
      subtitle: '满100减30',
      imageSrc: mallImageAssets.gift,
      accent: 'orange',
      path: MINI_PACKAGE_ROUTES.memberCoupons,
    },
    {
      id: 'coupon-exchange',
      title: '券兑换',
      subtitle: '100元超值兑换',
      imageSrc: mallImageAssets.mug,
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
  gallery: [mallImageAssets.plush, mallImageAssets.gift, mallImageAssets.doll, mallImageAssets.toy],
  coupons: mallCoupons,
  skuGroups: mallSkuGroups,
  skuVariants: mallSkuVariants,
  promoText: '满2件，总价打8折',
  reviewCountText: '5236',
  reviews: [
    {
      id: 'review-1',
      author: 'G**A',
      content: '非常好！很精致！和卖家图片一样，不过英伦猫咋没礼盒呢？',
      tags: ['质量好(820)', '适合人群(82)'],
      imageSrcs: [mallImageAssets.plush, mallImageAssets.gift],
    },
  ],
  recommendProducts: mallProducts.slice(0, 3).map((product, index) => ({
    ...product,
    price: [259.9, 219.9, 198.9][index] ?? product.price,
  })),
  detailImages: [mallImageAssets.plush, mallImageAssets.gift, mallImageAssets.doll],
  detailHtml: `
    <div style="padding:24rpx 0;color:#333;font-size:26rpx;line-height:1.8;">
      <h3 style="font-size:30rpx;font-weight:500;margin:0 0 18rpx;">Hello Kitty 乐园限定毛绒公仔</h3>
      <p style="margin:0 0 16rpx;">精选亲肤短绒面料，手感柔软，适合作为乐园游玩纪念、生日礼物和亲子伴手礼。</p>
      <p style="margin:0 0 16rpx;">商品支持多角色、多尺寸和礼盒套装组合，下单前请确认规格、收货地址与配送方式。</p>
      <p style="margin:0;color:#db2777;">温馨提示：部分大件套装仅支持乐园门店自提，请以提交订单页展示为准。</p>
    </div>
  `,
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
