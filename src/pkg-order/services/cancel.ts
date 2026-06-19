import { cancelBffOrder, fetchBffOrderDetail, type BffOrder } from '@/core/services/bff-order-api';
import type { HkpOrderSummary } from '@/core/types/hkp';
import type { OrderCancelData } from './model';

export type { OrderCancelData } from './model';

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

function resolveOrderStatusText(order: BffOrder) {
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();
  if (['PENDING_PAYMENT', 'PAYING'].includes(normalizedStatus)) return '待付款';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) return order.sceneType === 'HOTEL' ? '待入住' : '待使用';
  if (['PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus)) return '部分使用';
  if (['FULFILLED', 'USED', 'COMPLETED'].includes(normalizedStatus)) return '已完成';
  if (['CANCELED', 'CANCELLED'].includes(normalizedStatus)) return '已取消';
  if (['REFUNDING', 'REFUNDED'].includes(normalizedStatus)) return '退款中';
  return order.orderStatus || '处理中';
}

function resolveMerchantName(order: BffOrder) {
  const merchantName = String(
    order.context?.merchantName
      || order.items?.[0]?.attributes?.merchantName
      || order.items?.[0]?.attributes?.shopName
      || '',
  ).trim();
  if (merchantName) return merchantName;
  if (order.sceneType === 'MALL') return '商城订单';
  if (order.sceneType === 'HOTEL') return '酒店商户';
  if (order.sceneType === 'TICKET') return '票务商户';
  return '订单商户';
}

function mapOrderSummary(order: BffOrder): HkpOrderSummary {
  const firstItem = order.items?.[0];
  const quantity = Number(firstItem?.quantity);
  const normalizedQuantity = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  return {
    id: order.orderNo,
    statusText: resolveOrderStatusText(order),
    merchantName: resolveMerchantName(order),
    products: [
      {
        id: firstItem?.itemId || order.orderNo,
        title: resolveOrderTitle(order),
        subtitle: firstItem?.skuId || firstItem?.attributes?.ratePlanId,
        image: { src: '' },
        price: formatCent(firstItem?.unitPriceCent || order.payableAmountCent),
        quantity: normalizedQuantity,
      },
    ],
    totalAmount: formatCent(order.payableAmountCent),
    countText: normalizedQuantity > 0 ? `共${normalizedQuantity}件` : '',
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
