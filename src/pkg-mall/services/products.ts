import { resolveMockData } from '@/core/services/mock';
import { fetchCouponApplicableProductsData } from './coupon-products';
import { mallProductListData } from './mock-data';
import { filterMallProductsByKeyword } from './search';

interface FetchProductsDataOptions {
  keyword?: string;
  categoryId?: string;
  couponId?: string;
}

const mallProductCategoryMap: Record<string, string[]> = {
  new: ['sanrio-icebox-sticker', 'kitty-stationery-set'],
  recommend: ['sanrio-icebox-sticker', 'kitty-cake-set', 'park-plush-doll', 'my-melody-plush'],
  'digital-home': ['kitty-mug-home', 'kitty-kids-bag'],
  'home-life': ['kitty-mug-home', 'kitty-stationery-set', 'kitty-cake-set'],
  toy: ['sanrio-icebox-sticker', 'kitty-cake-set', 'park-plush-doll', 'my-melody-plush'],
  wear: ['kitty-park-shirt', 'kitty-kids-bag'],
  mother: ['kitty-kids-bag', 'park-plush-doll'],
  care: ['kitty-mug-home', 'kitty-stationery-set'],
  stationery: ['kitty-stationery-set'],
  travel: ['kitty-kids-bag', 'kitty-cake-set'],
};

function filterMallProductsByCategory(products: typeof mallProductListData.products, categoryId?: string) {
  if (!categoryId) return products;

  const productIds = mallProductCategoryMap[categoryId];
  if (!productIds || productIds.length === 0) return products;

  return products.filter((product) => productIds.includes(product.id));
}

function filterMallProductsByProductIds(products: typeof mallProductListData.products, productIds?: string[]) {
  if (!productIds) return products;
  if (productIds.length === 0) return [];

  const productIdSet = new Set(productIds);

  return products.filter((product) => productIdSet.has(product.id));
}

// 获取商品列表页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export async function fetchProductsData(options: FetchProductsDataOptions = {}) {
  const keyword = (options.keyword || '').trim();
  const couponProductsData = options.couponId
    ? await fetchCouponApplicableProductsData(options.couponId)
    : undefined;
  const categoryProducts = filterMallProductsByCategory(mallProductListData.products, options.categoryId);
  const couponProducts = filterMallProductsByProductIds(categoryProducts, couponProductsData?.productIds);
  const products = filterMallProductsByKeyword(couponProducts, keyword);

  return resolveMockData({
    ...mallProductListData,
    keyword,
    products,
  });
}
