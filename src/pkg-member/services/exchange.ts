import {
  fetchBffCrmP1Exchanges,
  fetchBffCrmP1Item,
  type BffCrmP1ConfigItem,
} from '@/core/services/bff-crm-api';
import {
  exchangeBffKcoin,
  fetchBffKcoinBalance,
  type BffKcoinExchangeResponse,
} from '@/core/services/bff-coupon-api';

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

export interface SubmitMemberExchangeParams {
  itemNo: string;
  quantity: number;
}

function toExchangeProduct(item: BffCrmP1ConfigItem): MemberExchangeProduct {
  const price = item.pointsCost || 0;

  return {
    id: item.itemNo,
    title: item.itemName,
    imageSrc: item.imageUrl || '',
    kCoinPrice: price,
    originalKCoinPrice: price,
    exchangedCount: Math.max(Number(item.stockTotal || 0) - Number(item.stockAvailable || 0), 0),
    stock: Number(item.stockAvailable || 0),
    detailHtml: `<div><p>${item.description || item.subtitle || '兑换商品以实际配置为准。'}</p></div>`,
    liked: false,
  };
}

export function fetchMemberExchangeListData() {
  return fetchBffCrmP1Exchanges().then((items) => ({
    products: items.map(toExchangeProduct),
  }));
}

export async function fetchMemberExchangeDetailData(productId = ''): Promise<MemberExchangeDetailData> {
  if (!productId) throw new Error('缺少兑换商品编号');
  const [item, balance] = await Promise.all([
    fetchBffCrmP1Item(productId),
    fetchBffKcoinBalance(),
  ]);
  return {
    product: toExchangeProduct(item),
    memberKCoins: Number(balance.availablePoints ?? balance.pointsBalance ?? 0),
  };
}

function createExchangeIdempotencyKey(itemNo: string) {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KEX-${itemNo}-${Date.now()}-${random}`;
}

// 提交 K 币兑换，后端由登录态推导会员身份。
export function submitMemberKcoinExchange(params: SubmitMemberExchangeParams): Promise<BffKcoinExchangeResponse> {
  return exchangeBffKcoin({
    itemNo: params.itemNo,
    quantity: params.quantity,
    idempotencyKey: createExchangeIdempotencyKey(params.itemNo),
  });
}
