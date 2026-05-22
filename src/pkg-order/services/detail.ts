import { resolveMockData } from '@/core/services/mock';
import { getLocalOrder } from '@/core/services/local-order';
import { orderDetailData, orderList, type OrderDetailData } from './mock-data';

export type { OrderDetailData } from './mock-data';

// 为预置待支付订单提供静态详情，避免列表静态数据落到默认已完成详情。
function createStaticPendingPayDetail(orderId?: string): OrderDetailData | undefined {
  const pendingOrder = orderList.find((order) => order.id === orderId && order.statusText === '待付款');
  const pendingProduct = pendingOrder?.products[0];
  if (!pendingOrder || !pendingProduct) return undefined;

  return {
    id: pendingOrder.id,
    statusText: pendingOrder.statusText,
    paidAmountText: `¥${pendingOrder.totalAmount.toFixed(2)}`,
    primaryActionType: 'pay',
    payExpireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    title: pendingProduct.title,
    quantityText: `x${pendingProduct.quantity}`,
    productFields: [
      { label: '商品信息', value: pendingProduct.title },
      { label: '规格', value: pendingProduct.skuText ?? '默认规格' },
    ],
    ticketFields: [
      { label: '支付方式', value: '微信支付' },
      { label: '支付提示', value: '请在30分钟内完成支付，超时订单将自动关闭' },
    ],
    contactFields: [
      { label: '收货人', value: '晓晓 15512345697' },
      { label: '收货地址', value: '上海市浦东新区张江路368号开文大厦22号楼1201室' },
    ],
    amountFields: [
      { label: '商品金额', value: `¥${pendingOrder.totalAmount.toFixed(2)}` },
      { label: '运费', value: '¥0.00' },
      { label: '应付金额', value: `¥${pendingOrder.totalAmount.toFixed(2)}` },
    ],
    orderFields: [
      { label: '订单编号', value: pendingOrder.id },
      { label: '下单时间', value: '2026-05-16 15:20' },
      { label: '支付剩余时间', value: '请在30分钟内完成支付' },
    ],
    refundButtonText: pendingOrder.primaryActionText ?? '继续支付',
  };
}

// 获取订单详情页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchDetailData(orderId?: string) {
  const localOrder = getLocalOrder(orderId);
  if (localOrder) {
    return resolveMockData<OrderDetailData>({
      id: localOrder.id,
      statusText: localOrder.statusText,
      paidAmountText: localOrder.paidAmountText,
      primaryActionType: localOrder.primaryActionType,
      payExpireAt: localOrder.payExpireAt,
      title: localOrder.title,
      quantityText: localOrder.quantityText,
      productFields: localOrder.productFields,
      ticketFields: localOrder.ticketFields,
      contactFields: localOrder.contactFields,
      amountFields: localOrder.amountFields,
      orderFields: localOrder.orderFields,
      refundButtonText: localOrder.refundButtonText,
    });
  }

  const staticPendingPayDetail = createStaticPendingPayDetail(orderId);
  if (staticPendingPayDetail) {
    return resolveMockData<OrderDetailData>(staticPendingPayDetail);
  }

  return resolveMockData<OrderDetailData>(orderDetailData);
}
