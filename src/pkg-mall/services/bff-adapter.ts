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
} from './types';

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
      mode: 'unsupported',
      reasonText: rule?.reasonText || '当前商城只支持第三方配送',
    };
  }
  if (shippingMode === 'none') {
    return {
      mode: 'none',
      reasonText: rule?.reasonText || '无需物流',
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
    title: firstText(product.title, id, '商品'),
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
    title: firstText(category.title, category.categoryId, '商品分类'),
    iconSrc: firstText(category.iconUrl, category.bannerUrl),
    path: `${MINI_PACKAGE_ROUTES.mallProducts}?categoryId=${encodeURIComponent(id)}`,
  };
}

export function toMallBannerItem(category: BffMallCategory): MallBannerItem | undefined {
  if (!category.bannerUrl) return undefined;
  const id = firstText(category.categoryId, category.title);
  return {
    id: `banner-${id}`,
    title: firstText(category.title, category.categoryId, '商品分类'),
    subtitle: (category.linkedProductCount ?? 0) > 0 ? `${category.linkedProductCount} 件好物可选` : '',
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
    title: firstText(recommendation.title, recommendation.keyword, '精选推荐'),
    subtitle: recommendation.keyword || '',
    imageSrc: '',
    accent: index % 3 === 0 ? 'purple' : index % 3 === 1 ? 'orange' : 'pink',
    path: `${MINI_PACKAGE_ROUTES.mallProducts}${couponQuery}`,
  };
}

function buildAttributeLines(product: BffMallProduct) {
  const lines: string[] = [];
  const brandName = firstText(product.brandName);
  if (brandName) lines.push(`品牌：${brandName}`);
  Object.entries(product.paramGroups ?? {}).forEach(([name, value]) => {
    if (name?.trim() && value?.trim()) lines.push(`${name.trim()}：${value.trim()}`);
  });
  return lines;
}

function buildShippingSummary(rule?: BffMallShippingRule) {
  if (!rule) return '';
  const shippingMode = String(rule.shippingMode || 'express');
  if (shippingMode === 'none') return rule.reasonText || '无需物流';
  if (shippingMode === 'pickup') return rule.reasonText || '当前商城不支持自提，请以实际可售配置为准';
  const freightAmount = centToYuan(rule.freightAmount);
  return freightAmount > 0 ? `第三方配送 ¥${freightAmount.toFixed(2)}` : '第三方配送 包邮';
}

function toMallSkuGroups(product: BffMallProduct): HkpSkuGroup[] {
  return (product.specGroups ?? [])
    .slice()
    .sort((prev, next) => (prev.sortOrder ?? 0) - (next.sortOrder ?? 0))
    .map((group) => ({
      id: firstText(group.groupId, group.title),
      title: firstText(group.title, group.groupId, '规格'),
      selectedId: group.options?.find((option) => !option.disabled)?.optionId,
      options: (group.options ?? []).map((option) => ({
        id: firstText(option.optionId, option.label),
        label: firstText(option.label, option.optionId, '选项'),
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
    skuText: firstText(sku.skuText, product.subtitle),
    giftText: sku.giftText,
    shippingRule: normalizeShippingRule(product.shippingRule),
  };
}

export function toMallSkuVariants(product: BffMallProduct): MallSkuVariant[] {
  const skus = product.skus ?? [];
  if (skus.length > 0) {
    return skus.map((sku) => toMallSkuVariant(product, sku));
  }
  return [];
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
  const coupons: HkpCouponSummary[] = [];
  const attributeLines = buildAttributeLines(product);
  const reviews: MallReviewItem[] = [];
  const couponHintText = product.couponIds?.length ? '下单时以结算页可用优惠为准' : '';
  return {
    product: summary,
    merchantName: firstText(product.merchantName),
    gallery,
    coupons,
    skuGroups: toMallSkuGroups(product),
    skuVariants: toMallSkuVariants(product),
    promoText: firstText(product.promotionText, couponHintText),
    reviewCountText: '',
    reviews,
    recommendProducts: recommendations,
    detailImages,
    detailHtml: product.detailHtml || '',
    servicePhone: firstText(product.servicePhone),
    attributeLines,
    shippingSummary: buildShippingSummary(product.shippingRule),
    afterSaleRule: firstText(product.afterSaleRule),
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
