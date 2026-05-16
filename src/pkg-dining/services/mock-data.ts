import type { HkpProductSummary, HkpSkuGroup } from '@/core/types/hkp';

export const diningPackages: HkpProductSummary[] = [
  {
    id: 'family-dessert-set',
    title: '亲子甜点套餐',
    subtitle: '蛋糕、饮品和限定餐垫',
    image: { src: '' },
    price: 168,
    tag: '人气',
  },
  {
    id: 'kitty-lunch-set',
    title: '主题午餐套餐',
    subtitle: '园内餐厅可用',
    image: { src: '' },
    price: 98,
  },
];

export const diningSkuGroups: HkpSkuGroup[] = [
  {
    id: 'time',
    title: '取餐时间',
    selectedId: 'lunch',
    options: [
      { id: 'lunch', label: '午餐' },
      { id: 'dinner', label: '晚餐' },
    ],
  },
];

export const diningHomeData = {
  banners: [''],
  merchants: [
    {
      id: 'kitty-cafe',
      title: 'Hello Kitty Cafe',
      image: { src: '' },
      distanceText: '乐园入口旁',
    },
  ],
};

export const diningMerchantData = {
  merchant: diningHomeData.merchants[0],
  packages: diningPackages,
  skuGroups: diningSkuGroups,
};

export const diningCheckoutData = {
  merchant: diningHomeData.merchants[0],
  products: diningPackages.slice(0, 1),
  totalAmount: diningPackages[0].price,
};
