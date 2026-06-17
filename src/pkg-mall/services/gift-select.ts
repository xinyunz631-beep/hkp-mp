import { fetchBffMallAvailableGifts, fetchBffMallProducts } from '@/core/services/bff-mall-api';
import type { HkpProductSummary } from '@/core/types/hkp';
import { toMallProductSummary } from './bff-adapter';

export interface MallGiftSelectData {
  gifts: HkpProductSummary[];
}

// 获取赠品选择真实数据，赠品规则未配置时返回空态。
export async function fetchGiftSelectData() {
  const [giftResponse, productResponse] = await Promise.all([
    fetchBffMallAvailableGifts({ page: 1, size: 50 }),
    fetchBffMallProducts({ page: 1, size: 100 }),
  ]);
  const giftProductIds = new Set(
    (giftResponse.list ?? [])
      .flatMap((gift) => gift.giftProductIds ?? [])
      .filter(Boolean),
  );
  const gifts = (productResponse.list ?? [])
    .filter((product) => {
      const productId = product.spuId || product.productCode;
      return productId && giftProductIds.has(productId);
    })
    .map(toMallProductSummary);

  return { gifts };
}
