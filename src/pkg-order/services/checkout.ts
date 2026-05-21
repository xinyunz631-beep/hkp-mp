import { resolveMockData } from '@/core/services/mock';
import {
  createLocalOrderId,
  createLocalOrderTime,
  saveLocalOrder,
  type LocalOrderRecord,
} from '@/core/services/local-order';
import { orderCheckoutData, type OrderCheckoutData } from './mock-data';
import { formatOrderAddress, getDefaultOrderAddress } from './address';

export type { OrderCheckoutData } from './mock-data';

// 获取确认订单页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCheckoutData() {
  return resolveMockData<OrderCheckoutData>({
    ...orderCheckoutData,
    address: getDefaultOrderAddress() ?? orderCheckoutData.address,
  });
}

// 模拟商城确认订单支付成功，写入本地订单中心。
export function submitOrderCheckoutOrder(data: OrderCheckoutData) {
  const orderId = createLocalOrderId('MALL-');
  const now = createLocalOrderTime();
  const firstProduct = data.products[0];
  const hasCouponDiscount = data.discountAmount > 0 && data.couponText.trim().length > 0;
  const record: LocalOrderRecord = {
    id: orderId,
    source: 'mall',
    tabKey: 'pendingShip',
    dateText: now.split(' ')[0],
    statusText: '待发货',
    paidAmountText: `¥${data.totalAmount.toFixed(2)}`,
    title: firstProduct?.title || '乐园商城订单',
    quantityText: `x${data.products.reduce((total, item) => total + item.quantity, 0)}`,
    totalText: `共${data.products.length}件商品 合计:¥${data.totalAmount.toFixed(2)}`,
    productFields: [
      { label: '收货人', value: `${data.address.name} ${data.address.mobile}` },
      { label: '收货地址', value: formatOrderAddress(data.address) },
      { label: '配送方式', value: data.shippingText },
    ],
    ticketFields: [
      { label: '支付方式', value: data.paymentMethodText },
      { label: '发货说明', value: '商家将在 48 小时内安排发货' },
      { label: '售后规则', value: '未发货支持取消，发货后支持申请售后' },
    ],
    contactFields: [
      { label: '联系人', value: data.address.name },
      { label: '手机号', value: data.address.mobile },
    ],
    amountFields: [
      ...data.amountFields,
      ...(hasCouponDiscount ? [{ label: '优惠券', value: data.couponText }] : []),
      { label: '实付款', value: `¥${data.totalAmount.toFixed(2)}` },
    ],
    orderFields: [
      { label: '订单编号', value: orderId },
      { label: '下单时间', value: now },
      { label: '支付方式', value: data.paymentMethodText },
      { label: '支付时间', value: now },
    ],
    refundButtonText: '申请售后',
    homeItems: data.products.map((product) => ({
      id: `${orderId}-${product.id}`,
      title: product.title,
      subtitle: product.specText,
      extraText: product.giftText,
      imageSrc: product.imageSrc,
      quantity: product.quantity,
      priceText: product.priceText,
      actionText: '查看详情',
    })),
    createdAt: now,
  };

  return saveLocalOrder(record);
}
