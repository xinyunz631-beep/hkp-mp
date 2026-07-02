import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import {
  getBffCouponAmountCent,
  getBffCouponReason,
  getBffCouponThresholdCent,
  getBffCouponTitle,
  isBffCouponAvailable,
  type BffAvailableCouponView,
} from '@/core/services/bff-coupon-api';
import type { MallShippingRule } from '@/core/services/mall-checkout-draft';
import type { HkpCouponSummary, HkpProductSummary, HkpSkuGroup } from '@/core/types/hkp';
import { centToYuan, parseNumberLike } from '@/core/utils/money';
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
  MallReviewItem,
  MallSkuVariant,
} from './types';

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
  const marketCent = parseNumberLike(product.marketMinPrice ?? product.marketMaxPrice);
  return typeof marketCent === 'number' && marketCent > 0 ? centToYuan(marketCent) : undefined;
}

function productSalesText(product: BffMallProduct) {
  const salesCount = parseNumberLike(product.salesCount);
  if (typeof salesCount === 'number' && salesCount > 0) {
    return `已售${Math.floor(salesCount)}`;
  }
  return firstMallText(product.salesText);
}

function formatYuan(amountCent: unknown = 0) {
  const amount = centToYuan(amountCent);
  if (Number.isInteger(amount)) return String(amount);
  return amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

// 格式化后端百分比折扣字段，85 表示 8.5 折。
function formatDiscountPercent(discountPercent?: number | string) {
  const normalizedDiscountPercent = parseNumberLike(discountPercent);
  if (typeof normalizedDiscountPercent !== 'number' || normalizedDiscountPercent <= 0) return '';
  const discount = normalizedDiscountPercent > 10 ? normalizedDiscountPercent / 10 : normalizedDiscountPercent;
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
    freeShippingThreshold: centToYuan(rule?.freeShippingThreshold),
    templateId: firstText(rule?.deliveryTemplateId),
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
    salesText: productSalesText(product),
    favorited: product.favorited === true,
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

function couponDiscountCent(coupon: BffAvailableCouponView) {
  return getBffCouponAmountCent(coupon);
}

export function isMallAvailableCouponPreview(coupon: BffAvailableCouponView) {
  return isBffCouponAvailable(coupon);
}

export function toMallCouponSummary(coupon: BffAvailableCouponView): HkpCouponSummary | undefined {
  const couponNo = typeof coupon.couponNo === 'string' ? coupon.couponNo.trim() : '';
  const title = getBffCouponTitle(coupon);
  const thresholdAmount = centToYuan(getBffCouponThresholdCent(coupon));
  const discountAmountCent = couponDiscountCent(coupon);
  const discountAmount = centToYuan(discountAmountCent);
  const validDate = coupon.validEndAt ? coupon.validEndAt.slice(0, 10) : '';
  const available = isMallAvailableCouponPreview(coupon);
  const amountText = discountAmount > 0
    ? `¥${formatYuan(discountAmountCent)}`
    : formatDiscountPercent(coupon.discountPercent ?? coupon.discountRate);

  if (!couponNo || !title || !amountText) return undefined;

  return {
    id: couponNo,
    title,
    amountText,
    thresholdText: thresholdAmount > 0 ? `满¥${thresholdAmount.toFixed(2)}可用` : '无门槛',
    validityText: validDate ? `有效期至 ${validDate}` : '按券规则生效',
    status: available ? 'available' : 'disabled',
    tag: getBffCouponReason(coupon),
    minimumAmount: thresholdAmount,
    discountAmount,
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
  const availability = (product.skuAvailability ?? []).find((item) => (
    firstText(item.skuId, item.skuCode) === skuId
  ));
  const unavailableReason = firstMallText(
    availability?.unavailableReason,
    ...(availability?.unavailableReasons ?? []),
  );
  const availableStock = typeof availability?.availableStock === 'number'
    ? availability.availableStock
    : sku.stock;
  const stock = availability?.canBuy === false ? 0 : Math.max(0, Number(availableStock ?? 0));
  return {
    id: skuId,
    optionIds: sku.optionIds ?? {},
    price: centToYuan(sku.price ?? product.minPrice),
    stock,
    imageSrc: firstMallUrl(sku.imageUrl, productImageOf(product)),
    skuText: firstMallText(sku.skuText, product.subtitle),
    giftText: firstMallText(sku.giftText) || undefined,
    shippingRule: normalizeShippingRule(product.shippingRule),
    unavailableReason: unavailableReason || undefined,
  };
}

function toMallReviewItem(review: BffMallReviewItem): MallReviewItem {
  const rating = parseNumberLike(review.rating);
  return {
    id: firstText(review.reviewId, review.itemId, review.createdAt, 'review'),
    author: review.anonymous ? '匿名用户' : firstMallText(review.userName),
    rating: typeof rating === 'number' && rating > 0 ? rating : undefined,
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
  const unavailableReasons = sanitizeMallRuntimeTextList(product.unavailableReasons);
  return {
    product: summary,
    merchantName: firstMallText(product.merchantName),
    gallery,
    coupons,
    skuGroups: toMallSkuGroups(product),
    skuVariants: toMallSkuVariants(product),
    promoText: firstMallText(product.promotionText, couponHintText),
    reviewCountText: (() => {
      const totalCount = parseNumberLike(reviewData?.totalCount);
      return typeof totalCount === 'number' && totalCount > 0 ? String(totalCount) : '';
    })(),
    reviews,
    recommendProducts: recommendations,
    detailImages,
    detailHtml,
    servicePhone: firstMallText(product.servicePhone),
    attributeLines,
    shippingSummary: buildShippingSummary(product.shippingRule),
    afterSaleRule: firstMallText(product.afterSaleRule),
    canBuy: product.canBuy !== false && unavailableReasons.length === 0,
    unavailableReasons,
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
