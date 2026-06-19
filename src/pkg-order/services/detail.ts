import {
  fetchBffOrderDetail,
  getBffTicketVoucherText,
  isBffTicketVoucherReady,
  type BffOrder,
  type BffTicketVoucher,
} from '@/core/services/bff-order-api';
import type { OrderDetailData, OrderDetailFieldData, OrderTicketInstanceData } from './model';

export type { OrderDetailData } from './model';

export interface FetchDetailDataOptions {
  showErrorToast?: boolean;
}

function formatCent(value?: number) {
  return `¥${((value || 0) / 100).toFixed(2)}`;
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}

// 归一订单主状态，避免后端履约中间态直接暴露为内部状态码。
function resolveStatusText(status?: string, sceneType?: string) {
  const normalizedStatus = String(status || '').toUpperCase();

  if (['PENDING_PAYMENT', 'PAYING'].includes(normalizedStatus)) return '待付款';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) return sceneType === 'HOTEL' ? '待入住' : '待使用';
  if (['PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus)) return '部分使用';
  if (['FULFILLED', 'USED', 'COMPLETED'].includes(normalizedStatus)) return '已完成';
  if (['CANCELED', 'CANCELLED'].includes(normalizedStatus)) return '已取消';
  if (['REFUNDING', 'REFUNDED'].includes(normalizedStatus)) return '退款中';
  return status || '处理中';
}

function resolvePrimaryAction(status?: string): OrderDetailData['primaryActionType'] {
  const normalizedStatus = String(status || '').toUpperCase();
  if (['PENDING_PAYMENT', 'PAYING'].includes(normalizedStatus)) return 'pay';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) return 'refund';
  return 'none';
}

function resolveRefundButtonText(primaryActionType: OrderDetailData['primaryActionType']) {
  if (primaryActionType === 'pay') return '继续支付';
  if (primaryActionType === 'refund') return '申请退款';
  return '';
}

// 归一票码状态，展示核销进度而不是第三方原始状态值。
function resolveTicketStatusText(status?: string) {
  const normalizedStatus = status?.toLowerCase();
  if (normalizedStatus === 'unused' || normalizedStatus === 'wait_use' || normalizedStatus === 'waituse') return '待入园';
  if (['part_used', 'partiallyused', 'partially_used', 'partial_used'].includes(normalizedStatus || '')) return '部分核销';
  if (['used', 'fulfilled', 'completed', 'success'].includes(normalizedStatus || '')) return '已核销';
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
  const voucherInstances = (order.ticketVouchers || [])
    .filter(isBffTicketVoucherReady)
    .map((voucher) => mapTicketVoucher(order, voucher))
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

function mapTicketVoucher(order: BffOrder, voucher: BffTicketVoucher): OrderTicketInstanceData | undefined {
  const ticketNo = getBffTicketVoucherText(voucher, 'ticketCode') || getBffTicketVoucherText(voucher, 'voucherCode');
  const qrImageSrc = getBffTicketVoucherText(voucher, 'qrImage')
    || getBffTicketVoucherText(voucher, 'codeImage')
    || getBffTicketVoucherText(voucher, 'qrCodeUrl');
  const qrCodePayload = getBffTicketVoucherText(voucher, 'qrCodePayload')
    || getBffTicketVoucherText(voucher, 'voucherCode')
    || getBffTicketVoucherText(voucher, 'ticketCode')
    || getBffTicketVoucherText(voucher, 'qrCodeUrl');

  if (!ticketNo && !qrCodePayload && !qrImageSrc) return undefined;

  return {
    ticketNo,
    qrCodePayload,
    qrImageSrc,
    productName: resolveTitle(order),
    skuName: order.items?.[0]?.skuId || '',
    statusText: resolveTicketStatusText(getBffTicketVoucherText(voucher, 'ticketStatus')),
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
    sceneType: order.sceneType,
    orderStatus: order.orderStatus,
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
export async function fetchDetailData(orderId?: string, options: FetchDetailDataOptions = {}) {
  if (!orderId) throw new Error('缺少订单编号');
  const order = await fetchBffOrderDetail(orderId, {
    showErrorToast: options.showErrorToast,
  });
  return mapOrderToDetail(order);
}
