import type { MallShippingRule } from '@/core/services/mall-checkout-draft';
import type {
  HkpCouponSummary,
  HkpFilterTab,
  HkpProductSummary,
  HkpSkuGroup,
  HkpSkuVariantBase,
} from '@/core/types/hkp';

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
  discountText?: string;
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
  merchantName?: string;
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
  servicePhone?: string;
  attributeLines?: string[];
  shippingSummary?: string;
  afterSaleRule?: string;
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
