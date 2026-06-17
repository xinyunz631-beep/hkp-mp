import { cancelBffOrder, fetchBffOrderDetail, type BffOrder } from '@/core/services/bff-order-api';
import type { HkpOrderSummary } from '@/core/types/hkp';
import type { OrderCancelData } from './mock-data';

export type { OrderCancelData } from './mock-data';

function formatCent(value?: number) {
  return Number(((value || 0) / 100).toFixed(2));
}

function resolveOrderTitle(order: BffOrder) {
  const firstItem = order.items?.[0];
  return firstItem?.itemName
    || firstItem?.attributes?.roomTitle
    || firstItem?.attributes?.ratePlanTitle
    || order.context?.roomTitle
    || `${order.sceneType || ''}订单`;
}

function mapOrderSummary(order: BffOrder): HkpOrderSummary {
  const firstItem = order.items?.[0];
  return {
    id: order.orderNo,
    statusText: '待付款',
    merchantName: 'Hello Kitty Park',
    products: [
      {
        id: firstItem?.itemId || order.orderNo,
        title: resolveOrderTitle(order),
        subtitle: firstItem?.skuId || firstItem?.attributes?.ratePlanId,
        image: { src: '' },
        price: formatCent(firstItem?.unitPriceCent || order.payableAmountCent),
        quantity: firstItem?.quantity || 1,
      },
    ],
    totalAmount: formatCent(order.payableAmountCent),
    countText: `共${firstItem?.quantity || 1}件`,
  };
}

// 获取取消订单页面真实数据，缺少订单号或接口失败时由页面异常态承接。
export async function fetchCancelData(orderId?: string) {
  if (!orderId) throw new Error('缺少订单编号');
  const order = await fetchBffOrderDetail(orderId);
  return {
    order: mapOrderSummary(order),
    reasons: ['行程变化', '重复购买', '信息填写错误', '其他原因'],
    tips: [
      '取消成功后，库存和优惠锁将由系统自动释放。',
      '已支付订单请在订单详情中提交退款申请。',
    ],
    submitButtonText: '提交取消申请',
  };
}

export function submitOrderCancel(orderId: string, reason: string) {
  return cancelBffOrder(orderId, { reason });
}
