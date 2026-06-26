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
    detailHtml: item.description || item.subtitle || '',
    liked: false,
  };
}

// 兑换专区只允许承接 EXCHANGE 域商品，避免详情直达误把领券中心 COUPON 卡片提交给 K 币兑换。
function isExchangeItem(item: BffCrmP1ConfigItem) {
  return String(item.itemType || '').toUpperCase() === 'EXCHANGE';
}

// 详情页直达时也必须校验商品域；真正的写入拦截仍以后端 item_type=EXCHANGE 为准。
function assertExchangeItem(item: BffCrmP1ConfigItem) {
  if (!isExchangeItem(item)) {
    throw new Error('当前商品不可兑换');
  }
}

export function fetchMemberExchangeListData() {
  return fetchBffCrmP1Exchanges().then((items) => ({
    products: items.filter(isExchangeItem).map(toExchangeProduct),
  }));
}

export async function fetchMemberExchangeDetailData(productId = ''): Promise<MemberExchangeDetailData> {
  if (!productId) throw new Error('缺少兑换商品编号');
  const [item, balance] = await Promise.all([
    fetchBffCrmP1Item(productId),
    fetchBffKcoinBalance(),
  ]);
  assertExchangeItem(item);
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
