import { resolveMockData } from '@/core/services/mock';

export interface MallCouponApplicableProductsData {
  couponId: string;
  productIds: string[];
}

const couponApplicableProductIds: Record<string, string[]> = {
  '7000000000001002': ['sanrio-icebox-sticker', 'kitty-cake-set', 'kitty-stationery-set', 'kitty-kids-bag'],
  '7000000000001003': ['sanrio-icebox-sticker', 'kitty-cake-set', 'kitty-stationery-set', 'kitty-kids-bag'],
};

// 按券查询适用商品，真实接口接入后只替换这里的请求和字段归一。
export function fetchCouponApplicableProductsData(couponId: string) {
  const nextCouponId = String(couponId || '').trim();

  return resolveMockData<MallCouponApplicableProductsData>({
    couponId: nextCouponId,
    productIds: couponApplicableProductIds[nextCouponId] ?? [],
  });
}
