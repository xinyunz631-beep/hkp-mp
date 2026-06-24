import { fetchBffCouponAvailable, getBffAvailableCouponList } from '@/core/services/bff-coupon-api';
import { fetchBffMallProduct, fetchBffMallReviews } from '@/core/services/bff-mall-api';
import {
  isMallAvailableCouponPreview,
  isRenderableMallProduct,
  toMallCouponSummary,
  toMallProductDetailData,
  toMallProductSummary,
} from './bff-adapter';

// 统一收口后端字符串字段，避免把空白推荐商品编号带进详情回读。
function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

// 获取商品详情真实数据，接口失败时由页面异常态承接。
export async function fetchProductDetailData(productId?: string) {
  if (!productId) throw new Error('缺少商品编号');
  const [product, reviewData] = await Promise.all([
    fetchBffMallProduct(productId),
    fetchBffMallReviews({ productId, page: 1, size: 3 }),
  ]);
  const couponResponse = await fetchBffCouponAvailable({
    sceneType: 'MALL',
    orderAmountCent: product.minPrice ?? product.maxPrice,
    itemIds: [productId],
    skuIds: (product.skus ?? []).map((sku) => sku.skuId || sku.skuCode || '').filter(Boolean),
  }).catch(() => undefined);
  const coupons = getBffAvailableCouponList(couponResponse)
    .filter(isMallAvailableCouponPreview)
    .map(toMallCouponSummary)
    .filter((coupon): coupon is NonNullable<ReturnType<typeof toMallCouponSummary>> => Boolean(coupon));
  const recommendProductIds = Array.from(new Set(
    (product.recommendProductIds ?? [])
      .map((id) => normalizeString(id))
      .filter((id) => id && id !== productId),
  )).slice(0, 6);
  const recommendProducts = recommendProductIds.length > 0
    ? await Promise.allSettled(recommendProductIds.map((id) => fetchBffMallProduct(id))).then((results) => (
      results
        .flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
        .filter(isRenderableMallProduct)
        .map(toMallProductSummary)
    ))
    : [];
  return toMallProductDetailData(product, reviewData, coupons, recommendProducts);
}
