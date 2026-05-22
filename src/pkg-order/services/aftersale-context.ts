import { getLocalOrder } from '@/core/services/local-order';
import type { HkpOrderSummary } from '@/core/types/hkp';
import { orderList } from './mock-data';

function parseAmountText(amountText: string) {
  return Number(amountText.replace(/[^\d.]/g, '')) || 0;
}

function resolveMerchantName(source: string) {
  if (source === 'mall') return '乐园商城';
  if (source === 'hotel') return 'Hello Kitty 城堡酒店';
  if (source === 'ticket') return 'Hello Kitty Park';
  return 'Hello Kitty Park';
}

// 根据订单编号恢复售后链路所需订单摘要；本地订单优先，静态订单兜底。
export function resolveAftersaleOrder(orderId?: string): HkpOrderSummary | undefined {
  const localOrder = getLocalOrder(orderId);
  if (localOrder) {
    return {
      id: localOrder.id,
      merchantName: resolveMerchantName(localOrder.source),
      statusText: localOrder.statusText,
      products: localOrder.homeItems.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.extraText,
        image: { src: item.imageSrc },
        skuText: item.subtitle,
        price: parseAmountText(item.priceText),
        quantity: item.quantity,
      })),
      totalAmount: parseAmountText(localOrder.paidAmountText),
      countText: localOrder.quantityText,
      primaryActionText: localOrder.refundButtonText || undefined,
    };
  }

  return orderList.find((order) => order.id === orderId);
}
