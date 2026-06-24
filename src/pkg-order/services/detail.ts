import {
  fetchBffOrderDetail,
  getBffTicketVoucherText,
  type BffOrder,
  type BffTicketVoucher,
} from '@/core/services/bff-order-api';
import {
  fetchBffMallMyReviews,
  type BffMallMemberReviewsData,
} from '@/core/services/bff-mall-api';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { formatCentCurrency } from '@/core/utils/money';
import { sanitizeMallRuntimeText } from '@/core/utils/mall-runtime';
import { formatOrderDateTime } from './time';
import type {
  OrderDetailData,
  OrderDetailFieldData,
  OrderTicketInstanceData,
} from './model';
import { mapOrderCouponFields } from './coupon-facts';

export type { OrderDetailData } from './model';

export interface FetchDetailDataOptions {
  showErrorToast?: boolean;
}

function formatCent(value?: number | string) {
  return formatCentCurrency(value);
}

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatDateTime(value?: string) {
  return formatOrderDateTime(value, '-');
}

function hasMallLogisticsContext(order: BffOrder) {
  if (order.sceneType !== 'MALL') return false;
  return Boolean(normalizeString(
    order.context?.trackingNumber
      || order.context?.waybillNo
      || order.context?.logisticsNo
      || order.context?.deliveryNo
      || order.items?.[0]?.attributes?.trackingNumber
      || order.items?.[0]?.attributes?.waybillNo,
  ));
}

// 判断订单是否仍处于待支付阶段，避免后端新增超时关单后继续展示支付动作。
function isPendingPaymentStatus(status?: string) {
  return ['PENDING', 'PENDING_PAYMENT', 'UNPAID', 'PAYING'].includes(String(status || '').toUpperCase());
}

// 判断订单是否已经关闭，统一承接超时关单、人工取消和过期终态。
function isClosedStatus(status?: string) {
  return ['CLOSED', 'EXPIRED', 'TIMEOUT', 'TIMEOUT_CLOSED', 'AUTO_CLOSED'].includes(String(status || '').toUpperCase());
}

// 判断订单是否属于已完成终态，商城评价入口必须和订单列表保持同一套口径。
function isCompletedStatus(status?: string) {
  return ['FULFILLED', 'USED', 'COMPLETED', 'SUCCESS'].includes(String(status || '').toUpperCase());
}

// 判断商城订单是否允许展示会员确认收货入口，最终可确认性以后端接口校验为准。
function canConfirmMallReceive(order: BffOrder) {
  if (order.sceneType !== 'MALL') return false;
  if (!hasMallLogisticsContext(order)) return false;
  return ['PAID', 'FULFILLING', 'WAIT_USE', 'WAIT_RECEIVE', 'PENDING_RECEIVE', 'SHIPPED', 'DELIVERING', 'DELIVERED']
    .includes(String(order.orderStatus || '').toUpperCase());
}

// 用订单更新时间生成详情状态版本，供静默轮询判断是否需要刷新。
function resolveStatusVersion(order: BffOrder) {
  const timestamp = Date.parse(order.updatedAt || '');
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

// 归一订单主状态，避免后端履约中间态直接暴露为内部状态码。
function resolveStatusText(order: BffOrder) {
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();

  if (isPendingPaymentStatus(normalizedStatus)) return '待付款';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) {
    if (order.sceneType === 'HOTEL') return '待入住';
    if (order.sceneType === 'MALL') {
      return normalizedStatus === 'FULFILLING' || hasMallLogisticsContext(order) ? '待收货' : '待发货';
    }
    return '待使用';
  }
  if (['PART_USED', 'PARTIALLY_USED', 'PARTIALLYUSED'].includes(normalizedStatus)) return '部分使用';
  if (isCompletedStatus(normalizedStatus)) return '已完成';
  if (['CANCELED', 'CANCELLED'].includes(normalizedStatus)) return '已取消';
  if (isClosedStatus(normalizedStatus)) return '已关闭';
  if (['REFUNDING', 'REFUND_PENDING', 'REFUND_PROCESSING'].includes(normalizedStatus)) return '退款中';
  if (normalizedStatus === 'REFUNDED') return '已退款';
  return order.orderStatus || '处理中';
}

function resolvePrimaryAction(order: BffOrder): OrderDetailData['primaryActionType'] {
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();
  if (isPendingPaymentStatus(normalizedStatus)) return 'pay';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) {
    return order.sceneType === 'MALL' ? 'aftersale' : 'refund';
  }
  return 'none';
}

function resolvePaymentFact(order: BffOrder, key: string) {
  return normalizeString(order[key as keyof BffOrder] as string | undefined)
    || normalizeString(order.context?.[key]);
}

function resolveRefundButtonText(primaryActionType: OrderDetailData['primaryActionType']) {
  if (primaryActionType === 'pay') return '继续支付';
  if (primaryActionType === 'aftersale') return '申请售后';
  if (primaryActionType === 'refund') return '申请退款';
  return '';
}

// 已进入退款/返还阶段的订单，允许用户直接回到售后记录继续核对进度。
function resolveAftersaleEntryRoute(order: BffOrder) {
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();
  const hasRefundProgress = ['REFUNDING', 'REFUND_PENDING', 'REFUND_PROCESSING', 'REFUNDED'].includes(normalizedStatus)
    || Boolean(order.refundReturnedCouponNos?.length);

  if (!hasRefundProgress) return undefined;

  return `${MINI_PACKAGE_ROUTES.orderAftersaleList}?orderId=${encodeURIComponent(order.orderNo)}`;
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
  if (order.sceneType === 'MALL') {
    return sanitizeMallRuntimeText(firstItem?.itemName)
      || normalizeString(firstItem?.itemId || firstItem?.lineNo || order.orderNo);
  }
  return firstItem?.itemName
    || firstItem?.attributes?.roomTitle
    || firstItem?.attributes?.ratePlanTitle
    || order.context?.roomTitle
    || normalizeString(firstItem?.itemId || firstItem?.lineNo || order.orderNo);
}

function resolveQuantityText(order: BffOrder) {
  const count = order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  return count > 0 ? `x${count}` : '';
}

function resolveMerchantName(order: BffOrder) {
  return sanitizeMallRuntimeText(
    order.context?.merchantName
      || order.items?.[0]?.attributes?.merchantName
      || order.items?.[0]?.attributes?.shopName,
  );
}

function resolveMallSpecText(order: BffOrder) {
  const firstItem = order.items?.[0];
  return sanitizeMallRuntimeText(
    firstItem?.attributes?.specName
      || firstItem?.attributes?.skuName
      || firstItem?.skuId,
  );
}

function resolveAddressText(context: Record<string, string>) {
  return normalizeString(
    context.addressText
      || context.deliveryAddress
      || context.shippingAddress,
  );
}

function resolveLogisticsField(context: Record<string, string>, keyCandidates: string[]) {
  for (const key of keyCandidates) {
    const value = normalizeString(context[key]);
    if (value) return value;
  }
  return '';
}

// 从订单上下文、商品扩展和商品基础字段里按候选 key 提取业务展示值。
function resolveOrderText(order: BffOrder, keyCandidates: string[]) {
  const firstItem = order.items?.[0];
  const itemRecord = firstItem as Record<string, unknown> | undefined;

  for (const key of keyCandidates) {
    const contextValue = normalizeString(order.context?.[key]);
    if (contextValue) return contextValue;

    const attributeValue = normalizeString(firstItem?.attributes?.[key]);
    if (attributeValue) return attributeValue;

    const itemValue = itemRecord?.[key];
    if (typeof itemValue === 'string') {
      const normalizedItemValue = normalizeString(itemValue);
      if (normalizedItemValue) return normalizedItemValue;
    }
  }

  return '';
}

function compactFields<T extends { value: string }>(fields: T[]) {
  return fields.filter((field) => Boolean(field.value && field.value !== '-'));
}

function reviewLookupKey(orderNo?: string, itemId?: string) {
  return `${orderNo || ''}::${itemId || ''}`;
}

function buildReviewedMallItemSet(data?: BffMallMemberReviewsData) {
  return new Set((data?.items || [])
    .map((item) => reviewLookupKey(item.orderNo, item.itemId))
    .filter((value) => value !== '::'));
}

// 判断商城订单是否已经评价，避免详情页重复暴露评价入口。
function hasReviewedMallOrder(order: BffOrder, reviewedMallItems: Set<string>) {
  if (order.sceneType !== 'MALL') return true;
  const reviewableItemIds = (order.items || [])
    .map((item) => item.itemId || item.lineNo)
    .filter((itemId): itemId is string => Boolean(itemId));
  if (!reviewableItemIds.length) return false;
  return reviewableItemIds.every((itemId) => reviewedMallItems.has(reviewLookupKey(order.orderNo, itemId)));
}

// 按订单业态输出商品摘要字段，避免所有业态共用商城式字段。
function resolveSceneProductFields(order: BffOrder, title: string, merchantName: string, mallSpecText: string): OrderDetailFieldData[] {
  const firstItem = order.items?.[0];
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();

  if (normalizedSceneType === 'MALL') {
    return compactFields([
      { label: '商户名称', value: merchantName },
      { label: '商品名称', value: title },
      { label: '规格信息', value: mallSpecText },
      { label: '商品编码', value: firstItem?.itemId || '-' },
      { label: '规格编码', value: firstItem?.skuId || '-' },
    ]);
  }

  if (normalizedSceneType === 'HOTEL') {
    return compactFields([
      { label: '酒店名称', value: resolveOrderText(order, ['hotelName', 'merchantName', 'shopName']) || merchantName },
      { label: '房型', value: resolveOrderText(order, ['roomTitle', 'roomName', 'itemName']) || title },
      { label: '价格计划', value: resolveOrderText(order, ['ratePlanTitle', 'ratePlanName', 'skuName']) },
      { label: '房型编码', value: firstItem?.itemId || '-' },
      { label: '价格计划编码', value: firstItem?.skuId || firstItem?.attributes?.ratePlanId || '-' },
    ]);
  }

  if (normalizedSceneType === 'TICKET') {
    return compactFields([
      { label: '项目名称', value: title },
      { label: '票种', value: resolveOrderText(order, ['ticketTypeName', 'skuName', 'specName']) },
      { label: '商品编码', value: firstItem?.itemId || '-' },
      { label: '票种编码', value: firstItem?.skuId || '-' },
    ]);
  }

  return compactFields([
    { label: '订单业态', value: order.sceneType || '-' },
    { label: '商品信息', value: title },
    { label: '商品编码', value: firstItem?.itemId || '-' },
    { label: '规格编码', value: firstItem?.skuId || firstItem?.attributes?.ratePlanId || '-' },
  ]);
}

// 按订单业态输出履约字段，避免门票、酒店和物流信息混在同一个字段组里。
function resolveSceneFulfillmentFields(
  order: BffOrder,
  deliveryCompany: string,
  trackingNumber: string,
  logisticsStatusText: string,
): OrderDetailFieldData[] {
  const context = order.context || {};
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();

  if (normalizedSceneType === 'HOTEL') {
    return compactFields([
      { label: '入住日期', value: context.checkInDate && context.checkOutDate ? `${context.checkInDate} - ${context.checkOutDate}` : '' },
      { label: '房间数', value: context.roomCount ? `${context.roomCount}间` : '' },
      { label: '入住人', value: context.guestNames || '' },
      { label: '备注', value: order.remark || '' },
    ]);
  }

  if (normalizedSceneType === 'MALL') {
    return compactFields([
      { label: '快递公司', value: deliveryCompany || '' },
      { label: '物流单号', value: trackingNumber || '' },
      { label: '物流状态', value: logisticsStatusText || '' },
      { label: '备注', value: order.remark || '' },
    ]);
  }

  if (normalizedSceneType === 'TICKET') {
    return compactFields([
      { label: '使用日期', value: context.visitDate || '' },
      { label: '备注', value: order.remark || '' },
    ]);
  }

  return compactFields([
    { label: '使用日期', value: context.visitDate || '' },
    { label: '入住日期', value: context.checkInDate && context.checkOutDate ? `${context.checkInDate} - ${context.checkOutDate}` : '' },
    { label: '快递公司', value: deliveryCompany || '' },
    { label: '物流单号', value: trackingNumber || '' },
    { label: '备注', value: order.remark || '' },
  ]);
}

// 按业态暴露已支持的详情内动作，避免和底部支付/退款主动作混在一起。
function resolveSceneActions(order: BffOrder, reviewedMallItems?: Set<string>): OrderDetailData['sceneActions'] {
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  const normalizedStatus = String(order.orderStatus || '').toUpperCase();
  const actions: OrderDetailData['sceneActions'] = [];

  if (normalizedSceneType === 'MALL' && hasMallLogisticsContext(order)) {
    actions.push({
      text: '查看物流',
      route: `${MINI_PACKAGE_ROUTES.orderLogistics}?orderId=${encodeURIComponent(order.orderNo)}`,
      tone: 'default',
    });
  }

  if (canConfirmMallReceive(order)) {
    actions.push({
      text: '确认收货',
      actionType: 'confirmReceive',
      tone: 'primary',
    });
  }

  if (
    normalizedSceneType === 'MALL'
    && isCompletedStatus(normalizedStatus)
    && reviewedMallItems
    && !hasReviewedMallOrder(order, reviewedMallItems)
  ) {
    const firstItemId = normalizeString(order.items?.[0]?.itemId || order.items?.[0]?.lineNo);
    const itemQuery = firstItemId ? `&itemId=${encodeURIComponent(firstItemId)}` : '';
    actions.push({
      text: '评价晒单',
      route: `${MINI_PACKAGE_ROUTES.orderReviewCreate}?orderId=${encodeURIComponent(order.orderNo)}${itemQuery}`,
      tone: 'primary',
    });
  }

  return actions;
}

function mapTicketInstances(order: BffOrder): OrderTicketInstanceData[] {
  const voucherInstances = (order.ticketVouchers || [])
    .filter(isDisplayableTicketVoucher)
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

function getTicketVoucherNumber(voucher: BffTicketVoucher, key: string) {
  const directValue = voucher[key];
  const rawValue = voucher.rawFields?.[key];
  const value = typeof directValue === 'number' ? directValue : rawValue;

  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : undefined;
  }
  return undefined;
}

function resolveTicketVoucherStatusText(voucher: BffTicketVoucher) {
  return resolveTicketStatusText(
    getBffTicketVoucherText(voucher, 'ticketStatus')
      || getBffTicketVoucherText(voucher, 'status')
      || getBffTicketVoucherText(voucher, 'useStatus'),
  );
}

function isDisplayableTicketVoucher(voucher?: BffTicketVoucher) {
  if (!voucher) return false;
  const status = String(
    getBffTicketVoucherText(voucher, 'ticketStatus')
      || getBffTicketVoucherText(voucher, 'status')
      || getBffTicketVoucherText(voucher, 'useStatus')
      || '',
  ).toUpperCase();
  if (['FAILED', 'FAIL'].includes(status)) return false;

  return Boolean(
    getBffTicketVoucherText(voucher, 'ticketCode')
      || getBffTicketVoucherText(voucher, 'voucherCode')
      || getBffTicketVoucherText(voucher, 'qrCodePayload')
      || getBffTicketVoucherText(voucher, 'codeImage')
      || getBffTicketVoucherText(voucher, 'qrImage')
      || getBffTicketVoucherText(voucher, 'qrCodeUrl'),
  );
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
  const totalNum = getTicketVoucherNumber(voucher, 'totalNum');
  const usedNum = getTicketVoucherNumber(voucher, 'usedNum');

  if (!ticketNo && !qrCodePayload && !qrImageSrc) return undefined;

  return {
    ticketNo,
    qrCodePayload,
    qrImageSrc,
    productName: resolveTitle(order),
    skuName: order.items?.[0]?.skuId || '',
    statusText: resolveTicketVoucherStatusText(voucher),
    visitDate: order.context?.visitDate || '',
    validTimeText: '',
    useTimesText: typeof totalNum === 'number'
      ? `共 ${totalNum} 次${typeof usedNum === 'number' ? `，已用 ${usedNum} 次` : ''}`
      : '',
  };
}

function mapOrderToDetail(order: BffOrder, reviewedMallItems?: Set<string>): OrderDetailData {
  const firstItem = order.items?.[0];
  const context = order.context || {};
  const primaryActionType = resolvePrimaryAction(order);
  const title = resolveTitle(order);
  const merchantName = resolveMerchantName(order);
  const mallSpecText = resolveMallSpecText(order);
  const addressText = resolveAddressText(context);
  const deliveryCompany = resolveLogisticsField(context, ['deliveryCompany', 'logisticsCompany', 'expressCompany']);
  const trackingNumber = resolveLogisticsField(context, ['trackingNumber', 'waybillNo', 'logisticsNo', 'deliveryNo']);
  const logisticsStatusText = resolveLogisticsField(context, ['logisticsStatusText', 'deliveryStatusText', 'shipmentStatusText']);
  const aftersaleEntryRoute = resolveAftersaleEntryRoute(order);

  return {
    id: order.orderNo,
    sceneType: order.sceneType,
    orderStatus: order.orderStatus,
    updatedAt: order.updatedAt,
    statusVersion: resolveStatusVersion(order),
    payNo: resolvePaymentFact(order, 'payNo'),
    paymentStatus: resolvePaymentFact(order, 'paymentStatus'),
    statusText: resolveStatusText(order),
    paidAmountText: formatCent(order.payableAmountCent),
    primaryActionType,
    payExpireAt: order.payExpireAt,
    title,
    quantityText: resolveQuantityText(order),
    productFields: resolveSceneProductFields(order, title, merchantName, mallSpecText),
    ticketInstances: mapTicketInstances(order),
    fulfillmentFields: resolveSceneFulfillmentFields(order, deliveryCompany, trackingNumber, logisticsStatusText),
    couponFields: mapOrderCouponFields(order),
    contactFields: compactFields([
      { label: '联系人', value: order.contactName || '' },
      { label: '手机号', value: order.contactPhone || '' },
      { label: '收货地址', value: addressText || '' },
    ]),
    sceneActions: resolveSceneActions(order, reviewedMallItems),
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
      { label: '支付流水', value: resolvePaymentFact(order, 'payNo') },
      { label: '支付状态', value: resolvePaymentFact(order, 'paymentStatus') },
      { label: '支付时间', value: formatDateTime(resolvePaymentFact(order, 'paidAt')) },
      { label: '支付截止', value: formatDateTime(order.payExpireAt || resolvePaymentFact(order, 'payExpireAt')) },
      { label: '支付方式', value: order.paymentChannel || '' },
      { label: '渠道', value: order.channel || '' },
    ]),
    refundButtonText: resolveRefundButtonText(primaryActionType),
    aftersaleEntryRoute,
    aftersaleEntryText: aftersaleEntryRoute ? '查看售后' : undefined,
  };
}

// 只有商城完成态需要查询评价记录，避免其它业态详情页多一次无意义请求。
function shouldLoadMallReviewLookup(order: BffOrder) {
  return order.sceneType === 'MALL' && isCompletedStatus(order.orderStatus);
}

// 获取真实订单详情，接口失败时由页面异常态承接，不回退本地订单。
export async function fetchDetailData(orderId?: string, options: FetchDetailDataOptions = {}) {
  if (!orderId) throw new Error('缺少订单编号');
  const order = await fetchBffOrderDetail(orderId, {
    showErrorToast: options.showErrorToast,
  });
  const mallReviews = shouldLoadMallReviewLookup(order)
    ? await fetchBffMallMyReviews().catch(() => undefined)
    : undefined;
  return mapOrderToDetail(order, mallReviews ? buildReviewedMallItemSet(mallReviews) : undefined);
}
