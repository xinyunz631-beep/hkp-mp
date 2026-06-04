import {
  fetchBffCrmP1Exchanges,
  fetchBffCrmP1Item,
  type BffCrmP1ConfigItem,
} from '@/core/services/bff-crm-api';
import { resolveMockData, withServiceFallback } from '@/core/services/mock';

export interface MemberExchangeProduct {
  id: string;
  title: string;
  imageSrc: string;
  kCoinPrice: number;
  originalKCoinPrice: number;
  exchangedCount: number;
  stock: number;
  detailHtml: string;
  liked: boolean;
}

export interface MemberExchangeListData {
  products: MemberExchangeProduct[];
}

export interface MemberExchangeDetailData {
  product: MemberExchangeProduct;
  memberKCoins: number;
}

const exchangeImageSrc = 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg';

const exchangeProducts: MemberExchangeProduct[] = [
  {
    id: '6000000000001001',
    title: 'KT城堡酒店公主系列圆形小挎包',
    imageSrc: exchangeImageSrc,
    kCoinPrice: 169,
    originalKCoinPrice: 169,
    exchangedCount: 184,
    stock: 101,
    detailHtml: '<div><p>一经兑换，概不退换</p></div>',
    liked: false,
  },
  {
    id: '6000000000001002',
    title: 'KT城堡酒店公主系列毛绒双肩包',
    imageSrc: exchangeImageSrc,
    kCoinPrice: 199,
    originalKCoinPrice: 199,
    exchangedCount: 128,
    stock: 86,
    detailHtml: '<div><p>兑换商品以实际库存为准，一经兑换，概不退换。</p></div>',
    liked: false,
  },
  {
    id: '6000000000001003',
    title: 'MM精灵森林限量款采用珍珠手链',
    imageSrc: exchangeImageSrc,
    kCoinPrice: 499,
    originalKCoinPrice: 499,
    exchangedCount: 72,
    stock: 45,
    detailHtml: '<div><p>限量周边兑换后不支持退换，请确认库存和数量后提交。</p></div>',
    liked: false,
  },
  {
    id: '6000000000001004',
    title: 'KT精灵森林限量款采用银色项链',
    imageSrc: exchangeImageSrc,
    kCoinPrice: 699,
    originalKCoinPrice: 699,
    exchangedCount: 51,
    stock: 28,
    detailHtml: '<div><p>商品兑换成功后将进入订单处理流程，详情以会员中心记录为准。</p></div>',
    liked: false,
  },
  {
    id: '6000000000001005',
    title: 'MM精灵森林限量款采用双人项链',
    imageSrc: exchangeImageSrc,
    kCoinPrice: 699,
    originalKCoinPrice: 699,
    exchangedCount: 63,
    stock: 32,
    detailHtml: '<div><p>请在兑换前确认收货信息，兑换后不支持撤销。</p></div>',
    liked: false,
  },
  {
    id: '6000000000001006',
    title: 'KT精灵森林限定银色手镯',
    imageSrc: exchangeImageSrc,
    kCoinPrice: 899,
    originalKCoinPrice: 899,
    exchangedCount: 39,
    stock: 19,
    detailHtml: '<div><p>限定商品数量有限，兑换完成后库存实时扣减。</p></div>',
    liked: false,
  },
];

const defaultExchangeProduct = exchangeProducts[0];
const exchangeProductMap = exchangeProducts.reduce<Record<string, MemberExchangeProduct>>((map, product) => {
  map[product.id] = product;
  return map;
}, {});

function toExchangeProduct(item: BffCrmP1ConfigItem): MemberExchangeProduct {
  const price = item.pointsCost || 0;

  return {
    id: item.itemNo,
    title: item.itemName,
    imageSrc: item.imageUrl || exchangeImageSrc,
    kCoinPrice: price,
    originalKCoinPrice: price,
    exchangedCount: Math.max(Number(item.stockTotal || 0) - Number(item.stockAvailable || 0), 0),
    stock: Number(item.stockAvailable || 0),
    detailHtml: `<div><p>${item.description || item.subtitle || '兑换商品以实际配置为准。'}</p></div>`,
    liked: false,
  };
}

export function fetchMemberExchangeListData() {
  return withServiceFallback(async () => {
    const products = (await fetchBffCrmP1Exchanges()).map(toExchangeProduct);
    return {
      products,
    };
  }, {
    products: exchangeProducts,
  });
}

export function fetchMemberExchangeDetailData(productId = '') {
  const fallbackData = {
    product: exchangeProductMap[productId] ?? defaultExchangeProduct,
    memberKCoins: 1288,
  };

  if (!productId) return resolveMockData<MemberExchangeDetailData>(fallbackData);

  return withServiceFallback(async () => {
    const item = await fetchBffCrmP1Item(productId);
    return {
      product: toExchangeProduct(item),
      memberKCoins: 1288,
    };
  }, fallbackData);
}
