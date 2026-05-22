import { resolveMockData } from '@/core/services/mock';
import { mallProductDetailData, mallProducts } from './mock-data';

// 获取商品详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchProductDetailData(productId?: string) {
  const matchedProduct = mallProducts.find((product) => product.id === productId);

  return resolveMockData({
    ...mallProductDetailData,
    product: matchedProduct ?? mallProductDetailData.product,
  });
}
