import { fetchBffOrderDetail, type BffOrder, type BffTicketVoucher } from '@/core/services/bff-order-api';
import type { OrderDetailData, OrderDetailFieldData, OrderTicketInstanceData } from './model';

export type { OrderDetailData } from './model';

function formatCent(value?: number) {
  return `¥${((value || 0) / 100).toFixed(2)}`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}

function resolveStatusText(status?: string, sceneType?: string) {
  if (['PENDING_PAYMENT', 'PAYING'].includes(status || '')) return '待付款';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(status || '')) return sceneType === 'HOTEL' ? '待入住' : '待使用';
  if (['FULFILLED', 'USED', 'COMPLETED'].includes(status || '')) return '已完成';
  if (['CANCELED', 'CANCELLED'].includes(status || '')) return '已取消';
  if (['REFUNDING', 'REFUNDED'].includes(status || '')) return '退款中';
  return status || '处理中';
}

function resolvePrimaryAction(status?: string): OrderDetailData['primaryActionType'] {
  if (['PENDING_PAYMENT', 'PAYING'].includes(status || '')) return 'pay';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(status || '')) return 'refund';
  return 'none';
}

function resolveRefundButtonText(primaryActionType: OrderDetailData['primaryActionType']) {
  if (primaryActionType === 'pay') return '继续支付';
  if (primaryActionType === 'refund') return '申请退款';
  return '';
}

function resolveTicketStatusText(status?: string) {
  const normalizedStatus = status?.toLowerCase();
  if (normalizedStatus === 'unused' || normalizedStatus === 'wait_use') return '待入园';
  if (normalizedStatus === 'partiallyused' || normalizedStatus === 'partially_used') return '部分核销';
  if (normalizedStatus === 'used') return '已核销';
  if (normalizedStatus === 'voided' || normalizedStatus === 'canceled' || normalizedStatus === 'cancelled') return '已作废';
  if (normalizedStatus === 'refunded') return '已退款';
  if (normalizedStatus === 'expired') return '已过期';
  return status || '待出票';
}

function resolveTitle(order: BffOrder) {
  const firstItem = order.items?.[0];
  return firstItem?.itemName
    || firstItem?.attributes?.roomTitle
    || firstItem?.attributes?.ratePlanTitle
    || order.context?.roomTitle
    || `${order.sceneType || ''}订单`;
}

function resolveQuantityText(order: BffOrder) {
  const count = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 1;
  return `x${count}`;
}

function compactFields(fields: OrderDetailFieldData[]) {
  return fields.filter((field) => Boolean(field.value && field.value !== '-'));
}

function mapTicketInstances(order: BffOrder): OrderTicketInstanceData[] {
  const voucherInstances = (order.ticketVouchers || []).map((voucher) => mapTicketVoucher(order, voucher))
    .filter((ticket): ticket is OrderTicketInstanceData => Boolean(ticket));
  if (voucherInstances.length) return voucherInstances;

  return (order.ticketInstances || []).map((ticket) => ({
    ticketNo: ticket.ticketNo || '',
    qrCodePayload: ticket.qrCodePayload || ticket.ticketNo || '',
    productName: ticket.productName || resolveTitle(order),
    skuName: ticket.skuName || '',
    statusText: resolveTicketStatusText(ticket.status),
    visitDate: ticket.visitDate || order.context?.visitDate || '',
    validTimeText: ticket.validStartAt && ticket.validEndAt
      ? `${formatDateTime(ticket.validStartAt)} - ${formatDateTime(ticket.validEndAt)}`
      : '',
    useTimesText: typeof ticket.remainingUseTimes === 'number'
      ? `剩余 ${ticket.remainingUseTimes} 次`
      : '',
  })).filter((ticket) => ticket.ticketNo || ticket.qrCodePayload);
}

function getVoucherText(voucher: BffTicketVoucher, key: keyof BffTicketVoucher) {
  const value = voucher[key];
  return typeof value === 'string' ? value : '';
}

function mapTicketVoucher(order: BffOrder, voucher: BffTicketVoucher): OrderTicketInstanceData | undefined {
  const ticketNo = getVoucherText(voucher, 'ticketCode') || getVoucherText(voucher, 'voucherCode');
  const qrImageSrc = getVoucherText(voucher, 'qrImage')
    || getVoucherText(voucher, 'codeImage')
    || getVoucherText(voucher, 'qrCodeUrl');
  const qrCodePayload = getVoucherText(voucher, 'voucherCode')
    || getVoucherText(voucher, 'ticketCode')
    || getVoucherText(voucher, 'qrCodeUrl');

  if (!ticketNo && !qrCodePayload && !qrImageSrc) return undefined;

  return {
    ticketNo,
    qrCodePayload,
    qrImageSrc,
    productName: resolveTitle(order),
    skuName: order.items?.[0]?.skuId || '',
    statusText: resolveTicketStatusText(getVoucherText(voucher, 'ticketStatus')),
    visitDate: order.context?.visitDate || '',
    validTimeText: '',
    useTimesText: typeof voucher.totalNum === 'number'
      ? `共 ${voucher.totalNum} 次${typeof voucher.usedNum === 'number' ? `，已用 ${voucher.usedNum} 次` : ''}`
      : '',
  };
}

function mapOrderToDetail(order: BffOrder): OrderDetailData {
  const firstItem = order.items?.[0];
  const context = order.context || {};
  const primaryActionType = resolvePrimaryAction(order.orderStatus);
  const sceneType = order.sceneType || '-';
  const title = resolveTitle(order);

  return {
    id: order.orderNo,
    statusText: resolveStatusText(order.orderStatus, order.sceneType),
    paidAmountText: formatCent(order.payableAmountCent),
    primaryActionType,
    payExpireAt: order.payExpireAt,
    title,
    quantityText: resolveQuantityText(order),
    productFields: compactFields([
      { label: '订单业态', value: sceneType },
      { label: '商品信息', value: title },
      { label: '商品编码', value: firstItem?.itemId || '-' },
      { label: '规格编码', value: firstItem?.skuId || firstItem?.attributes?.ratePlanId || '-' },
    ]),
    ticketInstances: mapTicketInstances(order),
    ticketFields: compactFields([
      { label: '入住日期', value: context.checkInDate && context.checkOutDate ? `${context.checkInDate} - ${context.checkOutDate}` : '' },
      { label: '房间数', value: context.roomCount ? `${context.roomCount}间` : '' },
      { label: '入住人', value: context.guestNames || '' },
      { label: '使用日期', value: context.visitDate || '' },
      { label: '备注', value: order.remark || '' },
    ]),
    contactFields: compactFields([
      { label: '联系人', value: order.contactName || '' },
      { label: '手机号', value: order.contactPhone || '' },
    ]),
    amountFields: [
      { label: '商品金额', value: formatCent(order.originalAmountCent) },
      { label: '优惠金额', value: `- ${formatCent(order.discountAmountCent)}` },
      { label: '运费', value: formatCent(order.freightAmountCent) },
      { label: '实付款', value: formatCent(order.payableAmountCent) },
    ],
    orderFields: compactFields([
      { label: '订单编号', value: order.orderNo },
      { label: '下单时间', value: formatDateTime(order.createdAt) },
      { label: '更新时间', value: formatDateTime(order.updatedAt) },
      { label: '支付方式', value: order.paymentChannel || '' },
      { label: '渠道', value: order.channel || '' },
    ]),
    refundButtonText: resolveRefundButtonText(primaryActionType),
  };
}

// 获取真实订单详情，接口失败时由页面异常态承接，不回退本地订单。
export async function fetchDetailData(orderId?: string) {
  if (!orderId) throw new Error('缺少订单编号');
  const order = await fetchBffOrderDetail(orderId);
  return mapOrderToDetail(order);
}
