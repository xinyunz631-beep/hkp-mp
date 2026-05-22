import { resolveMockData } from '@/core/services/mock';
import { mallProductListData } from './mock-data';
import { filterMallProductsByKeyword } from './search';

interface FetchProductsDataOptions {
  keyword?: string;
  categoryId?: string;
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

// 获取商品列表页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchProductsData(options: FetchProductsDataOptions = {}) {
  const keyword = (options.keyword || '').trim();
  const categoryProducts = filterMallProductsByCategory(mallProductListData.products, options.categoryId);
  const products = filterMallProductsByKeyword(categoryProducts, keyword);

  return resolveMockData({
    ...mallProductListData,
    keyword,
    products,
  });
}
