import { resolveMockData } from '@/core/services/mock';
import { listLocalOrders } from '@/core/services/local-order';
import { orderHomeData, type OrderHomeData } from './mock-data';

export type { OrderHomeData } from './mock-data';

// 获取订单首页数据，后续接真实接口时在这里统一处理字段归一和失败兜底。
export function fetchOrderHomeData() {
  const localOrders = listLocalOrders();
  const localOrderIds = new Set(localOrders.map((order) => order.id));
  const localSections = localOrders.map((order) => ({
    id: order.id,
    tabKey: order.tabKey,
    dateText: order.dateText,
    statusText: order.statusText,
    totalText: order.totalText,
    items: order.homeItems,
  }));
  const staticSections = orderHomeData.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !localOrderIds.has(item.orderId ?? item.id)),
    }))
    .filter((section) => section.items.length > 0);

  return resolveMockData<OrderHomeData>({
    ...orderHomeData,
    sections: [...localSections, ...staticSections],
  });
}
