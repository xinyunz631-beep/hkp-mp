import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import type { MallShippingRule } from '@/core/services/mall-checkout-draft';
import type { HkpCouponSummary, HkpProductSummary, HkpSkuGroup } from '@/core/types/hkp';
import type {
  BffMallCategory,
  BffMallGiftRule,
  BffMallProduct,
  BffMallRecommendation,
  BffMallShippingRule,
  BffMallSku,
} from '@/core/services/bff-mall-api';
import type {
  MallBannerItem,
  MallCategoryItem,
  MallProductDetailData,
  MallPromoCard,
  MallReviewItem,
  MallSkuVariant,
} from './mock-data';

function centToYuan(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Number((value / 100).toFixed(2));
}

function firstText(...values: Array<string | undefined>) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim() ?? '';
}

function productIdOf(product: BffMallProduct) {
  return firstText(product.spuId, product.productCode);
}

function productImageOf(product: BffMallProduct) {
  return firstText(product.mainImageUrl, product.galleryImages?.[0]?.url, product.shareImageUrl);
}

function productMarketPrice(product: BffMallProduct) {
  const marketCent = product.marketMinPrice ?? product.marketMaxPrice;
  return typeof marketCent === 'number' && marketCent > 0 ? centToYuan(marketCent) : undefined;
}

function normalizeShippingRule(rule?: BffMallShippingRule): MallShippingRule {
  const shippingMode = String(rule?.shippingMode || 'express');
  if (shippingMode === 'pickup') {
    return {
      mode: 'pickupOnly',
      reasonText: rule?.reasonText || '该商品仅支持乐园门店自提',
    };
  }
  if (shippingMode === 'none') {
    return {
      mode: 'unsupported',
      reasonText: rule?.reasonText || '该商品暂不支持配送',
    };
  }
  return {
    mode: 'express',
    freightAmount: centToYuan(rule?.freightAmount),
    supportedRegionKeywords: rule?.supportedRegionKeywords,
    unsupportedRegionKeywords: rule?.unsupportedRegionKeywords,
    reasonText: rule?.reasonText,
  };
}

export function toMallProductSummary(product: BffMallProduct): HkpProductSummary {
  const id = productIdOf(product);
  return {
    id,
    title: product.title || '乐园商品',
    subtitle: product.subtitle || product.tags?.[0] || '',
    image: { src: productImageOf(product) },
    price: centToYuan(product.minPrice),
    marketPrice: productMarketPrice(product),
    tag: product.tags?.[0],
    salesText: product.salesText || '',
  };
}

export function toMallCategoryItem(category: BffMallCategory): MallCategoryItem {
  const id = firstText(category.categoryId, category.title);
  return {
    id,
    title: category.title || '商品分类',
    iconSrc: firstText(category.iconUrl, category.bannerUrl),
    path: `${MINI_PACKAGE_ROUTES.mallProducts}?categoryId=${encodeURIComponent(id)}`,
  };
}

export function toMallBannerItem(category: BffMallCategory): MallBannerItem | undefined {
  if (!category.bannerUrl) return undefined;
  const id = firstText(category.categoryId, category.title);
  return {
    id: `banner-${id}`,
    title: category.title || '乐园好物',
    subtitle: (category.linkedProductCount ?? 0) > 0 ? `${category.linkedProductCount} 件好物可选` : '精选周边上新',
    imageSrc: category.bannerUrl,
    path: `${MINI_PACKAGE_ROUTES.mallProducts}?categoryId=${encodeURIComponent(id)}`,
  };
}

export function toMallPromoCard(recommendation: BffMallRecommendation, index: number): MallPromoCard {
  const id = firstText(recommendation.poolId, recommendation.title, `recommend-${index}`);
  const couponQuery = recommendation.sourceType === 'coupon' && recommendation.keyword
    ? `?couponId=${encodeURIComponent(recommendation.keyword)}`
    : '';
  return {
    id,
    title: recommendation.title || '精选好物',
    subtitle: recommendation.keyword || '游客喜欢的乐园周边',
    imageSrc: '',
    accent: index % 3 === 0 ? 'purple' : index % 3 === 1 ? 'orange' : 'pink',
    path: `${MINI_PACKAGE_ROUTES.mallProducts}${couponQuery}`,
  };
}

function toMallCouponSummary(couponId: string): HkpCouponSummary {
  return {
    id: couponId,
    title: '商品可用优惠',
    amountText: '优惠券',
    thresholdText: '下单时自动匹配',
    validityText: '以券规则为准',
    status: 'available',
  };
}

function toMallSkuGroups(product: BffMallProduct): HkpSkuGroup[] {
  return (product.specGroups ?? [])
    .slice()
    .sort((prev, next) => (prev.sortOrder ?? 0) - (next.sortOrder ?? 0))
    .map((group) => ({
      id: firstText(group.groupId, group.title),
      title: group.title || '规格',
      selectedId: group.options?.find((option) => !option.disabled)?.optionId,
      options: (group.options ?? []).map((option) => ({
        id: firstText(option.optionId, option.label),
        label: option.label || '默认',
        disabled: option.disabled,
        disabledReason: option.disabledReason,
      })),
    }))
    .filter((group) => group.id && group.options.length > 0);
}

function toMallSkuVariant(product: BffMallProduct, sku: BffMallSku): MallSkuVariant {
  const skuId = firstText(sku.skuId, sku.skuCode, productIdOf(product));
  return {
    id: skuId,
    optionIds: sku.optionIds ?? {},
    price: centToYuan(sku.price ?? product.minPrice),
    stock: Math.max(0, Number(sku.stock ?? 0)),
    imageSrc: firstText(sku.imageUrl, productImageOf(product)),
    skuText: sku.skuText || product.subtitle || '默认规格',
    giftText: sku.giftText,
    shippingRule: normalizeShippingRule(product.shippingRule),
  };
}

export function toMallSkuVariants(product: BffMallProduct): MallSkuVariant[] {
  const skus = product.skus ?? [];
  if (skus.length > 0) {
    return skus.map((sku) => toMallSkuVariant(product, sku));
  }

  return [{
    id: productIdOf(product),
    optionIds: {},
    price: centToYuan(product.minPrice),
    stock: 1,
    imageSrc: productImageOf(product),
    skuText: product.subtitle || '默认规格',
    shippingRule: normalizeShippingRule(product.shippingRule),
  }];
}

export function toMallProductDetailData(
  product: BffMallProduct,
  recommendations: HkpProductSummary[] = [],
): MallProductDetailData {
  const summary = toMallProductSummary(product);
  const gallery = [
    productImageOf(product),
    ...(product.galleryImages ?? []).map((image) => image.url || ''),
  ].filter(Boolean);
  const detailImages = (product.detailImages ?? []).map((image) => image.url || '').filter(Boolean);
  const coupons = (product.couponIds ?? []).map(toMallCouponSummary);
  const reviews: MallReviewItem[] = [];
  return {
    product: summary,
    gallery,
    coupons,
    skuGroups: toMallSkuGroups(product),
    skuVariants: toMallSkuVariants(product),
    promoText: product.promotionText || '',
    reviewCountText: '0',
    reviews,
    recommendProducts: recommendations,
    detailImages,
    detailHtml: product.detailHtml || '',
  };
}

export function toGiftText(gifts: BffMallGiftRule[]) {
  const firstGift = gifts[0];
  if (!firstGift) return '';
  if (firstGift.thresholdAmount && firstGift.thresholdAmount > 0) {
    return `满¥${centToYuan(firstGift.thresholdAmount)}赠`;
  }
  if (firstGift.thresholdQuantity && firstGift.thresholdQuantity > 0) {
    return `满${firstGift.thresholdQuantity}件赠`;
  }
  return firstGift.title || '';
}
