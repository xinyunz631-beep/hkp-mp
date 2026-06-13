import { fetchBffOrderDetail, type BffOrder } from '@/core/services/bff-order-api';
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

function formatCentAmount(amountCent?: number) {
  return `¥${(Number(amountCent || 0) / 100).toFixed(2)}`;
}

function formatDateTime(value?: string) {
  if (!value) return '';
  return value.replace('T', ' ').slice(0, 16);
}

function resolveBffOrderStatusText(status?: string) {
  if (!status) return '订单处理中';
  if (/PAY|UNPAID|CREATED|PENDING/i.test(status)) return '待付款';
  if (/PAID|RECEIVE|USE|CONFIRM/i.test(status)) return '待使用';
  if (/CANCEL/i.test(status)) return '已取消';
  if (/REFUND/i.test(status)) return '退款中';
  if (/FINISH|COMPLETE|DONE/i.test(status)) return '已完成';

  return '订单处理中';
}

// 从后端智游宝出票结果里选择可展示的二维码或图片地址。
function resolveVoucherImage(voucher: NonNullable<BffOrder['ticketVouchers']>[number]) {
  return voucher.codeImage || voucher.qrImage || voucher.qrCodeUrl || '';
}

// 归一订单详情页展示的票码文本，缺少真实票码时只展示序号名称。
function resolveVoucherCode(voucher: NonNullable<BffOrder['ticketVouchers']>[number], index: number) {
  const code = voucher.ticketCode || voucher.voucherCode;
  return code ? String(code) : `入园凭证${index + 1}`;
}

function mapBffOrderDetail(order: BffOrder): OrderDetailData {
  const products = order.items ?? [];
  const ticketVouchers = (order.ticketVouchers ?? []).map((voucher, index) => ({
    id: resolveVoucherCode(voucher, index),
    codeText: resolveVoucherCode(voucher, index),
    imageUrl: resolveVoucherImage(voucher),
  }));
  const totalQuantity = products.reduce((total, item) => total + Number(item.quantity || 0), 0);
  const productSummary = products
    .map((item) => `${item.itemName || item.itemId || '订单项目'} x${item.quantity || 1}`)
    .join('\n');

  return {
    id: order.orderNo,
    statusText: resolveBffOrderStatusText(order.orderStatus),
    paidAmountText: formatCentAmount(order.payableAmountCent),
    primaryActionType: 'none',
    title: products[0]?.itemName || 'Hello Kitty Park 订单',
    quantityText: `x${totalQuantity || 1}`,
    productFields: [
      { label: '订单内容', value: productSummary || '订单内容待确认' },
      ...(order.context?.visitDate ? [{ label: '使用日期', value: order.context.visitDate }] : []),
    ],
    ticketFields: [
      { label: '支付方式', value: order.paymentChannel || '微信支付' },
      { label: '订单场景', value: order.sceneType || '园区订单' },
    ],
    ticketVouchers,
    contactFields: [
      { label: '联系人', value: order.contactName || '' },
      { label: '手机号', value: order.contactPhone || '' },
    ].filter((field) => field.value),
    amountFields: [
      { label: '订单金额', value: formatCentAmount(order.originalAmountCent) },
      ...(order.discountAmountCent ? [{ label: '优惠金额', value: `- ${formatCentAmount(order.discountAmountCent)}` }] : []),
      { label: '实付金额', value: formatCentAmount(order.payableAmountCent) },
    ],
    orderFields: [
      { label: '订单编号', value: order.orderNo },
      ...(order.createdAt ? [{ label: '下单时间', value: formatDateTime(order.createdAt) }] : []),
    ],
    refundButtonText: '',
  };
}

// 获取订单详情页面数据，真实订单号走 BFF，历史本地订单继续兼容展示。
export async function fetchDetailData(orderId?: string) {
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

  if (orderId) {
    return mapBffOrderDetail(await fetchBffOrderDetail(orderId));
  }

  return resolveMockData<OrderDetailData>(orderDetailData);
}
