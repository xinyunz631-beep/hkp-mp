import { exchangeBffCoupon } from '@/core/services/bff-api';
import {
  fetchBffCrmP1Exchanges,
  fetchBffCrmP1Item,
  type BffCrmP1ConfigItem,
} from '@/core/services/bff-crm-api';

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
  exchangeCode?: string;
}

export interface MemberExchangeListData {
  products: MemberExchangeProduct[];
}

export interface MemberExchangeDetailData {
  product: MemberExchangeProduct;
  memberKCoins: number;
}

interface ExchangeExtraPayload {
  exchangeCode?: string;
  memberKCoins?: number;
}

function readExchangeExtraPayload(item: BffCrmP1ConfigItem): ExchangeExtraPayload {
  if (!item.extraPayload) return {};

  try {
    return JSON.parse(item.extraPayload) as ExchangeExtraPayload;
  } catch {
    return {};
  }
}

function toExchangeProduct(item: BffCrmP1ConfigItem): MemberExchangeProduct {
  const price = item.pointsCost || 0;
  const extraPayload = readExchangeExtraPayload(item);

  return {
    id: item.itemNo,
    title: item.itemName,
    imageSrc: item.imageUrl || '',
    kCoinPrice: price,
    originalKCoinPrice: item.originalPriceCent ? Math.round(item.originalPriceCent / 100) : price,
    exchangedCount: Math.max(Number(item.stockTotal || 0) - Number(item.stockAvailable || 0), 0),
    stock: Number(item.stockAvailable || 0),
    detailHtml: `<div><p>${item.description || item.subtitle || '兑换商品以实际配置为准。'}</p></div>`,
    liked: false,
    exchangeCode: extraPayload.exchangeCode,
  };
}

// 获取会员兑换专区真实入口，接口失败直接进入页面异常态。
export async function fetchMemberExchangeListData() {
  const products = (await fetchBffCrmP1Exchanges()).map(toExchangeProduct);
  return { products };
}

// 获取兑换商品详情，不再按本地默认商品兜底。
export async function fetchMemberExchangeDetailData(productId = '') {
  if (!productId) {
    throw new Error('兑换商品暂不可用');
  }

  const item = await fetchBffCrmP1Item(productId);
  const product = toExchangeProduct(item);
  const extraPayload = readExchangeExtraPayload(item);

  return {
    product,
    memberKCoins: extraPayload.memberKCoins || 0,
  };
}

// 使用后端提供的真实兑换码兑换优惠券；没有兑换码时不得模拟成功。
export function submitMemberExchangeProduct(product: MemberExchangeProduct) {
  if (!product.exchangeCode) {
    throw new Error('当前商品暂不可兑换');
  }

  return exchangeBffCoupon(product.exchangeCode);
}
