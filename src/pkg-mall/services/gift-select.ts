import { fetchAllBffMallAvailableGifts, fetchAllBffMallProducts } from '@/core/services/bff-mall-api';
import type { HkpProductSummary } from '@/core/types/hkp';
import { isRenderableMallProduct, toMallProductSummary } from './bff-adapter';

export interface MallGiftSelectData {
  gifts: HkpProductSummary[];
}

const MALL_GIFT_SELECT_PAGE_SIZE = 100;
const MALL_GIFT_SELECT_MAX_PAGES = 5;
const MALL_GIFT_RULE_PAGE_SIZE = 50;
const MALL_GIFT_RULE_MAX_PAGES = 5;

// 获取赠品选择真实数据，赠品规则未配置时返回空态。
export async function fetchGiftSelectData() {
  const [giftResponse, productResponse] = await Promise.all([
    fetchAllBffMallAvailableGifts({}, {
      pageSize: MALL_GIFT_RULE_PAGE_SIZE,
      maxPages: MALL_GIFT_RULE_MAX_PAGES,
    }),
    fetchAllBffMallProducts({}, {
      pageSize: MALL_GIFT_SELECT_PAGE_SIZE,
      maxPages: MALL_GIFT_SELECT_MAX_PAGES,
    }),
  ]);
  const giftProductIds = new Set(
    (giftResponse.list ?? [])
      .flatMap((gift) => gift.giftProductIds ?? [])
      .filter(Boolean),
  );
  const gifts = (productResponse.list ?? [])
    .filter((product) => {
      const productId = product.spuId || product.productCode;
      return Boolean(productId && giftProductIds.has(productId) && isRenderableMallProduct(product));
    })
    .map(toMallProductSummary);

  return { gifts };
}
