import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import { getCache, setCache } from '@/core/utils/cache';

export interface LocalOrderField {
  label: string;
  value: string;
}

export interface LocalOrderHomeItem {
  id: string;
  title: string;
  subtitle?: string;
  extraText?: string;
  imageSrc: string;
  quantity: number;
  priceText: string;
  actionText: string;
}

export interface LocalOrderRecord {
  id: string;
  source: 'ticket' | 'mall' | 'hotel' | 'dining';
  tabKey: string;
  dateText: string;
  statusText: string;
  paidAmountText: string;
  title: string;
  quantityText: string;
  totalText: string;
  productFields: LocalOrderField[];
  ticketFields: LocalOrderField[];
  contactFields: LocalOrderField[];
  amountFields: LocalOrderField[];
  orderFields: LocalOrderField[];
  refundButtonText: string;
  homeItems: LocalOrderHomeItem[];
  createdAt: string;
}

// 生成本地订单编号，后续接真实接口时由服务端订单号替代。
export function createLocalOrderId(prefix = 'HKP') {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${Date.now()}${random}`;
}

// 生成本地展示时间，用于订单详情和订单列表 mock 闭环。
export function createLocalOrderTime() {
  const date = new Date();
  const pad = (value: number) => `${value}`.padStart(2, '0');

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes()),
  ].join('');
}

// 读取本地订单列表，失败时返回空数组，避免页面层重复兜底。
export function listLocalOrders() {
  return getCache<LocalOrderRecord[]>(MINI_STORAGE_KEYS.localOrders) ?? [];
}

// 按订单编号读取本地订单，供订单详情页优先展示刚提交的订单。
export function getLocalOrder(orderId?: string) {
  if (!orderId) return undefined;
  return listLocalOrders().find((order) => order.id === orderId);
}

// 保存本地订单并去重置顶，模拟真实支付成功后的订单中心状态。
export function saveLocalOrder(record: LocalOrderRecord) {
  const orders = listLocalOrders().filter((order) => order.id !== record.id);
  setCache(MINI_STORAGE_KEYS.localOrders, [record, ...orders]);
  return record;
}
