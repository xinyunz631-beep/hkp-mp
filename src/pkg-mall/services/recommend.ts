import { resolveMockData } from '@/core/services/mock';
import { mallProducts } from './mock-data';
import type { HkpFilterTab } from '@/core/types/hkp';

export type MallRecommendProduct = (typeof mallProducts)[number] & {
  labels: string[];
};

export interface MallRecommendData {
  query: string;
  tabs: HkpFilterTab[];
  products: MallRecommendProduct[];
}

// 获取推荐商品页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchRecommendData() {
  return resolveMockData<MallRecommendData>({
    query: 'Hello Kitty公仔',
    tabs: [
      { key: 'comprehensive', text: '综合' },
      { key: 'sales', text: '销量' },
      { key: 'price', text: '价格' },
      { key: 'filter', text: '筛选' },
    ],
    products: mallProducts.map((product, index) => ({
      ...product,
      price: [169.9, 219.9, 129.8, 148.9][index] ?? product.price,
      salesText: ['1000人付款', '999人付款', '689人付款', '799人付款'][index] ?? product.salesText,
      labels: index < 2 ? ['满件减', '领券'] : [],
    })),
  });
}
