import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import type { BffAvailableCouponView } from '@/core/services/bff-coupon-api';
import type { MallShippingRule } from '@/core/services/mall-checkout-draft';
import type { HkpCouponSummary, HkpProductSummary, HkpSkuGroup } from '@/core/types/hkp';
import {
  extractMallRuntimeHtmlImageUrls,
  sanitizeMallRuntimeHtml,
  sanitizeMallRuntimeText,
  sanitizeMallRuntimeTextList,
  sanitizeMallRuntimeUrl,
  sanitizeMallRuntimeUrlList,
} from '@/core/utils/mall-runtime';
import type {
  BffMallCategory,
  BffMallGiftRule,
  BffMallProduct,
  BffMallReviewItem,
  BffMallReviewsData,
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

function firstMallText(...values: Array<string | undefined>) {
  return values.map((value) => sanitizeMallRuntimeText(value)).find(Boolean) ?? '';
}

function firstMallUrl(...values: Array<string | undefined>) {
  return values.map((value) => sanitizeMallRuntimeUrl(value)).find(Boolean) ?? '';
}

function productIdOf(product: BffMallProduct) {
  return firstText(product.spuId, product.productCode);
}

function categoryIdOf(category: BffMallCategory) {
  return firstText(category.categoryId);
}

function productImageOf(product: BffMallProduct) {
  return firstMallUrl(product.mainImageUrl, product.galleryImages?.[0]?.url, product.shareImageUrl);
}

function productMarketPrice(product: BffMallProduct) {
  const marketCent = product.marketMinPrice ?? product.marketMaxPrice;
  return typeof marketCent === 'number' && marketCent > 0 ? centToYuan(marketCent) : undefined;
}

function formatYuan(amountCent = 0) {
  const amount = amountCent / 100;
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number) {
  if (typeof discountPercent !== 'number' || !Number.isFinite(discountPercent) || discountPercent <= 0) return '';
  const discount = discountPercent > 10 ? discountPercent / 10 : discountPercent;
  const text = Number.isInteger(discount) ? String(discount) : discount.toFixed(1).replace(/0+$/, '').replace(/\.$/, '');
  return `${text}折`;
}

function normalizeShippingRule(rule?: BffMallShippingRule): MallShippingRule {
  const shippingMode = firstText(rule?.shippingMode);
  if (!shippingMode) {
    return {
      mode: 'unsupported',
      reasonText: firstMallText(rule?.reasonText, '当前商品暂不可配送，请稍后再试'),
    };
  }
  if (shippingMode === 'pickup') {
    return {
      mode: 'unsupported',
      reasonText: firstMallText(rule?.reasonText, '当前商城只支持第三方配送'),
    };
  }
  if (shippingMode === 'none') {
    return {
      mode: 'none',
      reasonText: firstMallText(rule?.reasonText, '无需物流'),
    };
  }
  return {
    mode: 'express',
    freightAmount: centToYuan(rule?.freightAmount),
    supportedRegionKeywords: rule?.supportedRegionKeywords,
    unsupportedRegionKeywords: rule?.unsupportedRegionKeywords,
    reasonText: firstMallText(rule?.reasonText) || undefined,
  };
}

export function isRenderableMallProduct(product: BffMallProduct) {
  return Boolean(productIdOf(product) && firstMallText(product.title));
}

export function isRenderableMallCategory(category: BffMallCategory) {
  return Boolean(categoryIdOf(category) && firstMallText(category.title));
}

export function isRenderableMallRecommendation(recommendation: BffMallRecommendation) {
  return Boolean(firstMallText(recommendation.title));
}

export function toMallProductSummary(product: BffMallProduct): HkpProductSummary {
  const id = productIdOf(product);
  const tags = sanitizeMallRuntimeTextList(product.tags);
  return {
    id,
    title: firstMallText(product.title),
    subtitle: firstMallText(product.subtitle, tags[0]),
    image: { src: productImageOf(product) },
    price: centToYuan(product.minPrice),
    marketPrice: productMarketPrice(product),
    tag: tags[0],
    salesText: firstMallText(product.salesText),
  };
}

export function toMallCategoryItem(category: BffMallCategory): MallCategoryItem {
  const id = categoryIdOf(category);
  return {
    id,
    title: firstMallText(category.title) || id,
    iconSrc: firstMallUrl(category.iconUrl, category.bannerUrl),
    path: `${MINI_PACKAGE_ROUTES.mallProducts}?categoryId=${encodeURIComponent(id)}`,
  };
}

export function toMallBannerItem(category: BffMallCategory): MallBannerItem | undefined {
  const bannerUrl = sanitizeMallRuntimeUrl(category.bannerUrl);
  if (!bannerUrl) return undefined;
  const id = categoryIdOf(category);
  return {
    id: `banner-${id}`,
    title: firstMallText(category.title) || id,
    subtitle: (category.linkedProductCount ?? 0) > 0 ? `${category.linkedProductCount} 件好物可选` : '',
    imageSrc: bannerUrl,
    path: `${MINI_PACKAGE_ROUTES.mallProducts}?categoryId=${encodeURIComponent(id)}`,
  };
}

function buildMallRecommendationPath(recommendation: BffMallRecommendation) {
  const basePath = MINI_PACKAGE_ROUTES.mallProducts;
  const keyword = firstText(recommendation.keyword);

  if (recommendation.sourceType === 'manual') {
    const recommendationId = firstText(recommendation.poolId);
    return recommendationId ? `${basePath}?recommendationId=${encodeURIComponent(recommendationId)}` : basePath;
  }

  if (recommendation.sourceType === 'search' && keyword) {
    return `${basePath}?keyword=${encodeURIComponent(keyword)}`;
  }

  if (recommendation.sourceType === 'category' && keyword) {
    return `${basePath}?categoryId=${encodeURIComponent(keyword)}`;
  }

  if (recommendation.sourceType === 'coupon' && keyword) {
    return `${basePath}?couponId=${encodeURIComponent(keyword)}`;
  }

  return basePath;
}

export function toMallPromoCard(recommendation: BffMallRecommendation, index: number): MallPromoCard {
  const title = firstMallText(recommendation.title);
  const subtitle = sanitizeMallRuntimeText(recommendation.keyword);
  const id = firstText(recommendation.poolId, title, `recommend-${index}`);
  return {
    id,
    title: title || id,
    subtitle,
    imageSrc: '',
    accent: index % 3 === 0 ? 'purple' : index % 3 === 1 ? 'orange' : 'pink',
    path: buildMallRecommendationPath(recommendation),
  };
}

function couponDiscountCent(coupon: BffAvailableCouponView) {
  return typeof coupon.discountAmount === 'number' ? coupon.discountAmount : coupon.discountAmountCent ?? 0;
}

export function isMallAvailableCouponPreview(coupon: BffAvailableCouponView) {
  return coupon.available !== false && coupon.status === 'AVAILABLE';
}

export function toMallCouponSummary(coupon: BffAvailableCouponView): HkpCouponSummary {
  const thresholdAmount = centToYuan(coupon.thresholdAmountCent);
  const discountAmountCent = couponDiscountCent(coupon);
  const discountAmount = centToYuan(discountAmountCent);
  const validDate = coupon.validEndAt ? coupon.validEndAt.slice(0, 10) : '';
  const available = isMallAvailableCouponPreview(coupon);

  return {
    id: coupon.couponNo,
    title: coupon.couponName || coupon.couponNo || '优惠券',
    amountText: discountAmount > 0 ? `¥${formatYuan(discountAmountCent)}` : (formatDiscountPercent(coupon.discountPercent) || '优惠券'),
    thresholdText: thresholdAmount > 0 ? `满¥${thresholdAmount.toFixed(2)}可用` : '无门槛',
    validityText: validDate ? `有效期至 ${validDate}` : '按券规则生效',
    status: available ? 'available' : 'disabled',
    tag: available ? (coupon.reason || '可用') : (coupon.unavailableReason || coupon.reason || '暂不可用'),
  };
}

function buildAttributeLines(product: BffMallProduct) {
  const lines: string[] = [];
  const brandName = firstMallText(product.brandName);
  if (brandName) lines.push(`品牌：${brandName}`);
  Object.entries(product.paramGroups ?? {}).forEach(([name, value]) => {
    const nextValue = sanitizeMallRuntimeText(value);
    if (name?.trim() && nextValue) lines.push(`${name.trim()}：${nextValue}`);
  });
  return lines;
}

function buildShippingSummary(rule?: BffMallShippingRule) {
  if (!rule) return '';
  const shippingMode = firstText(rule.shippingMode);
  if (!shippingMode) return firstMallText(rule.reasonText);
  if (shippingMode === 'none') return firstMallText(rule.reasonText, '无需物流');
  if (shippingMode === 'pickup') return firstMallText(rule.reasonText, '当前商城不支持自提，请以实际可售配置为准');
  const freightAmount = centToYuan(rule.freightAmount);
  return freightAmount > 0 ? `第三方配送 ¥${freightAmount.toFixed(2)}` : '第三方配送 包邮';
}

function toMallSkuGroups(product: BffMallProduct): HkpSkuGroup[] {
  return (product.specGroups ?? [])
    .slice()
    .sort((prev, next) => (prev.sortOrder ?? 0) - (next.sortOrder ?? 0))
    .map((group) => ({
      id: firstText(group.groupId, group.title),
      title: firstMallText(group.title) || firstText(group.groupId),
      selectedId: group.options?.find((option) => !option.disabled)?.optionId,
      options: (group.options ?? []).map((option) => ({
        id: firstText(option.optionId, option.label),
        label: firstMallText(option.label) || firstText(option.optionId),
        disabled: option.disabled,
        disabledReason: firstMallText(option.disabledReason) || undefined,
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
    imageSrc: firstMallUrl(sku.imageUrl, productImageOf(product)),
    skuText: firstMallText(sku.skuText, product.subtitle),
    giftText: firstMallText(sku.giftText) || undefined,
    shippingRule: normalizeShippingRule(product.shippingRule),
  };
}

function toMallReviewItem(review: BffMallReviewItem): MallReviewItem {
  return {
    id: firstText(review.reviewId, review.itemId, review.createdAt, 'review'),
    author: review.anonymous ? '匿名用户' : firstMallText(review.userName),
    rating: typeof review.rating === 'number' && Number.isFinite(review.rating) && review.rating > 0 ? review.rating : undefined,
    content: firstMallText(review.content),
    tags: sanitizeMallRuntimeTextList(review.tags),
    imageSrcs: sanitizeMallRuntimeUrlList(review.imageUrls),
    createdAt: firstText(review.createdAt),
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
  reviewData?: BffMallReviewsData,
  coupons: HkpCouponSummary[] = [],
  recommendations: HkpProductSummary[] = [],
): MallProductDetailData {
  const summary = toMallProductSummary(product);
  const gallery = Array.from(new Set([
    productImageOf(product),
    ...(product.galleryImages ?? []).map((image) => sanitizeMallRuntimeUrl(image.url)),
  ].filter(Boolean)));
  const detailHtml = sanitizeMallRuntimeHtml(product.detailHtml);
  const detailHtmlImageUrls = extractMallRuntimeHtmlImageUrls(detailHtml);
  const detailImages = Array.from(new Set([
    ...(product.detailImages ?? []).map((image) => sanitizeMallRuntimeUrl(image.url)),
    ...detailHtmlImageUrls,
  ].filter(Boolean)));
  const attributeLines = buildAttributeLines(product);
  const reviews = (reviewData?.items ?? []).map(toMallReviewItem);
  const couponHintText = product.couponIds?.length ? '下单时以结算页可用优惠为准' : '';
  return {
    product: summary,
    merchantName: firstMallText(product.merchantName),
    gallery,
    coupons,
    skuGroups: toMallSkuGroups(product),
    skuVariants: toMallSkuVariants(product),
    promoText: firstMallText(product.promotionText, couponHintText),
    reviewCountText: typeof reviewData?.totalCount === 'number' && reviewData.totalCount > 0 ? String(reviewData.totalCount) : '',
    reviews,
    recommendProducts: recommendations,
    detailImages,
    detailHtml,
    servicePhone: firstMallText(product.servicePhone),
    attributeLines,
    shippingSummary: buildShippingSummary(product.shippingRule),
    afterSaleRule: firstMallText(product.afterSaleRule),
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
  return firstMallText(firstGift.title);
}
