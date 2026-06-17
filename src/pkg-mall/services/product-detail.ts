import { fetchBffMallProduct } from '@/core/services/bff-mall-api';
import { toMallProductDetailData } from './bff-adapter';

// 获取商品详情真实数据，接口失败时由页面异常态承接。
export async function fetchProductDetailData(productId?: string) {
  if (!productId) throw new Error('缺少商品编号');
  const product = await fetchBffMallProduct(productId);
  return toMallProductDetailData(product);
}
