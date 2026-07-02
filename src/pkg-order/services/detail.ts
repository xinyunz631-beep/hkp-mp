import {
  fetchBffOrderDetail,
  fetchBffOrderLogistics,
  getBffTicketVoucherText,
  type BffOrder,
  type BffOrderLogisticsData,
  type BffOrderItem,
  type BffAnnualCard,
  type BffTicketVoucher,
} from '@/core/services/bff-order-api';
import {
  fetchBffMallMyReviews,
  type BffMallMemberReviewsData,
} from '@/core/services/bff-mall-api';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { formatCentCurrency, parseNumberLike } from '@/core/utils/money';
import { sanitizeMallRuntimeText } from '@/core/utils/mall-runtime';
import { formatOrderDateTime } from './time';
import type {
  OrderDetailData,
  OrderDetailFieldData,
  OrderTicketGroupData,
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

// 判断可选金额行是否确实有金额，0 元优惠/运费不进入订单详情展示。
function hasPositiveCentAmount(value?: number | string) {
  const amount = parseNumberLike(value);
  return typeof amount === 'number' && amount > 0;
}

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeUnknownText(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function normalizeLogisticsText(value?: string) {
  const text = normalizeString(value);
  return text && text !== '-' ? text : '';
}

function putLogisticsText(target: Record<string, string>, key: string, value?: string) {
  const text = normalizeLogisticsText(value);
  if (text) target[key] = text;
}

function formatDateTime(value?: string) {
  return formatOrderDateTime(value, '-');
}

function hasMallLogisticsContext(order: BffOrder) {
  if (String(order.sceneType || '').toUpperCase() !== 'MALL') return false;
  return Boolean(normalizeString(
    order.context?.trackingNumber
      || order.context?.waybillNo
      || order.context?.logisticsNo
      || order.context?.deliveryNo
      || order.context?.expressNo
      || order.items?.[0]?.attributes?.trackingNumber
      || order.items?.[0]?.attributes?.waybillNo
      || order.items?.[0]?.attributes?.expressNo,
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

// 判断订单是否包含年卡资产或年卡商品，年卡当前不开放会员端主动退款入口。
function hasAnnualCardOrderSignal(order: BffOrder) {
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  if (normalizedSceneType !== 'TICKET') return false;
  return Boolean(order.annualCards?.length)
    || (order.items || []).some((item) => hasAnnualCardItemSignal(item));
}

// 判断商城订单是否允许展示会员确认收货入口，最终可确认性以后端接口校验为准。
function canConfirmMallReceive(order: BffOrder) {
  if (String(order.sceneType || '').toUpperCase() !== 'MALL') return false;
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
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  const annualCardStatusText = resolveAnnualCardOrderStatusText(order);

  if (annualCardStatusText) return annualCardStatusText;

  if (isPendingPaymentStatus(normalizedStatus)) return '待付款';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) {
    if (normalizedSceneType === 'HOTEL') return '待入住';
    if (normalizedSceneType === 'MALL') {
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
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  if (isPendingPaymentStatus(normalizedStatus)) return 'pay';
  if (hasAnnualCardOrderSignal(order)) return 'none';
  if (['PAID', 'WAIT_USE', 'FULFILLING'].includes(normalizedStatus)) {
    return normalizedSceneType === 'MALL' ? 'aftersale' : 'refund';
  }
  return 'none';
}

function resolvePaymentFact(order: BffOrder, key: string) {
  return normalizeString(order[key as keyof BffOrder] as string | undefined)
    || normalizeString(order.context?.[key]);
}

function resolvePaymentChannelText(channel?: string) {
  const normalizedChannel = String(channel || '').toUpperCase();
  if (normalizedChannel === 'WECHAT') return '微信支付';
  if (normalizedChannel === 'ALIPAY') return '支付宝';
  return channel || '';
}

function resolveOrderChannelText(channel?: string) {
  const normalizedChannel = String(channel || '').toUpperCase();
  if (['MINI_PROGRAM', 'MINIPROGRAM', 'WECHAT_MINI_PROGRAM', 'WEAPP'].includes(normalizedChannel)) {
    return '微信小程序';
  }
  return channel || '';
}

function resolvePaymentStatusText(status?: string) {
  const normalizedStatus = String(status || '').toUpperCase();
  if (['PAID', 'SUCCESS', 'COMPLETED'].includes(normalizedStatus)) return '已支付';
  if (['PENDING', 'PENDING_PAYMENT', 'UNPAID'].includes(normalizedStatus)) return '待支付';
  if (normalizedStatus === 'PAYING') return '支付中';
  if (['FAILED', 'FAIL'].includes(normalizedStatus)) return '支付失败';
  if (normalizedStatus === 'REFUNDED') return '已退款';
  return status || '';
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

// 将年卡资产状态归一成订单详情可读文案，优先使用后端状态文案。
function resolveAnnualCardStatusText(status?: string, statusText?: string) {
  if (statusText) return statusText;
  const normalizedStatus = String(status || '').replace(/[-_\s]/g, '').toUpperCase();
  if (normalizedStatus.includes('PENDINGACTIVATION')) return '待激活';
  if (normalizedStatus.includes('ACTIVE')) return '已激活';
  if (normalizedStatus.includes('EXPIRED')) return '已过期';
  if (normalizedStatus.includes('REFUND')) return '已退款';
  if (normalizedStatus.includes('VOID') || normalizedStatus.includes('CANCEL')) return '已失效';
  return status || '';
}

// 纯年卡订单优先展示年卡资产状态，混合票券订单仍按订单主状态展示。
function resolveAnnualCardOrderStatusText(order: BffOrder) {
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  if (normalizedSceneType !== 'TICKET') return '';
  if (!order.annualCards?.length || order.ticketVouchers?.length) return '';
  const statusTexts = Array.from(new Set(order.annualCards.map((card) => resolveAnnualCardStatusText(card.status, card.statusText)).filter(Boolean)));
  return statusTexts.length === 1 ? statusTexts[0] : '';
}

function resolveTitle(order: BffOrder) {
  const firstItem = order.items?.[0];
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  if (normalizedSceneType === 'MALL') {
    return sanitizeMallRuntimeText(firstItem?.itemName)
      || normalizeString(firstItem?.itemId || firstItem?.lineNo || order.orderNo);
  }
  if (normalizedSceneType === 'HOTEL') {
    return resolveHotelTitle(order, firstItem);
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

function removeRepeatedTrailingChunk(source: string) {
  const parts = source.split(' ').filter(Boolean);
  if (parts.length < 2) return source;

  for (let index = 1; index < parts.length; index += 1) {
    const suffix = parts.slice(index).join(' ');
    const prefix = source.slice(0, source.length - suffix.length).trim();
    if (prefix.endsWith(suffix)) {
      return prefix;
    }
  }

  return source;
}

function removeDuplicateTextSegment(text: string, segment: string) {
  const source = normalizeString(text).replace(/\s+/g, ' ');
  const duplicate = normalizeString(segment).replace(/\s+/g, ' ');
  if (!source) return source;

  if (duplicate) {
    const repeatedSuffix = `${duplicate} ${duplicate}`;
    if (source.endsWith(repeatedSuffix)) {
      return source.slice(0, source.length - duplicate.length).trim();
    }

    if (source === repeatedSuffix) {
      return duplicate;
    }
  }

  return removeRepeatedTrailingChunk(source);
}

function resolveHotelRoomText(order: BffOrder) {
  return resolveOrderText(order, [
    'roomTitle',
    'roomName',
    'roomTypeName',
    'ratePlanTitle',
    'ratePlanName',
    'skuName',
    'specName',
  ]);
}

function resolveHotelTitle(order: BffOrder, firstItem?: BffOrderItem) {
  const rawTitle = normalizeString(firstItem?.itemName || '');
  const roomText = resolveHotelRoomText(order);
  const cleanedTitle = removeDuplicateTextSegment(rawTitle, roomText);

  return cleanedTitle
    || roomText
    || resolveOrderText(order, ['hotelName', 'merchantName', 'shopName'])
    || normalizeString(firstItem?.lineNo || order.orderNo);
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
    const value = normalizeLogisticsText(context[key]);
    if (value) return value;
  }
  return '';
}

function mergeMallLogisticsIntoOrder(order: BffOrder, logistics?: BffOrderLogisticsData) {
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  if (normalizedSceneType !== 'MALL' || !logistics) {
    return order;
  }

  const context = { ...(order.context || {}) };
  const companyText = normalizeLogisticsText(logistics.companyText);
  const trackingNumberText = normalizeLogisticsText(logistics.trackingNumberText);
  const statusText = normalizeLogisticsText(logistics.statusText);

  putLogisticsText(context, 'deliveryCompany', companyText);
  putLogisticsText(context, 'logisticsCompany', companyText);
  putLogisticsText(context, 'expressCompany', companyText);
  putLogisticsText(context, 'courierCompany', companyText);
  putLogisticsText(context, 'trackingNumber', trackingNumberText);
  putLogisticsText(context, 'waybillNo', trackingNumberText);
  putLogisticsText(context, 'logisticsNo', trackingNumberText);
  putLogisticsText(context, 'deliveryNo', trackingNumberText);
  putLogisticsText(context, 'expressNo', trackingNumberText);
  putLogisticsText(context, 'logisticsStatusText', statusText);
  putLogisticsText(context, 'deliveryStatusText', statusText);
  putLogisticsText(context, 'shipmentStatusText', statusText);
  putLogisticsText(context, 'trackingStatusText', statusText);

  return { ...order, context };
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

function resolveRecordText(record: Record<string, unknown> | undefined, keyCandidates: string[]) {
  if (!record) return '';

  for (const key of keyCandidates) {
    const value = normalizeUnknownText(record[key]);
    if (value) return value;
  }

  return '';
}

function resolveItemText(item: BffOrderItem | undefined, keyCandidates: string[]) {
  if (!item) return '';
  const itemRecord = item as Record<string, unknown>;

  for (const key of keyCandidates) {
    const attributeValue = normalizeString(item.attributes?.[key]);
    if (attributeValue) return attributeValue;

    const itemValue = normalizeUnknownText(itemRecord[key]);
    if (itemValue) return itemValue;
  }

  return '';
}

function resolveOrderItemText(order: BffOrder, item: BffOrderItem | undefined, keyCandidates: string[]) {
  const itemValue = resolveItemText(item, keyCandidates);
  if (itemValue) return itemValue;

  for (const key of keyCandidates) {
    const contextValue = normalizeString(order.context?.[key]);
    if (contextValue) return contextValue;
  }

  return '';
}

function resolveVoucherText(voucher: BffTicketVoucher, keyCandidates: string[]) {
  for (const key of keyCandidates) {
    const value = getBffTicketVoucherText(voucher, key)
      || normalizeUnknownText(voucher.rawFields?.[key])
      || normalizeUnknownText(voucher[key]);
    if (value) return value;
  }

  return '';
}

function pushAssociationValue(values: Set<string>, value: unknown) {
  const text = normalizeUnknownText(value);
  if (text) values.add(text);
}

function resolveItemAssociationValues(item: BffOrderItem) {
  const values = new Set<string>();
  const keys = [
    'lineNo',
    'orderLineNo',
    'orderItemLineNo',
    'itemLineNo',
    'itemId',
    'productId',
    'productCode',
    'ticketProductCode',
    'skuId',
    'skuCode',
    'goodsCode',
    'zhiyoubaoGoodsCode',
  ];

  keys.forEach((key) => {
    pushAssociationValue(values, item[key as keyof BffOrderItem]);
    pushAssociationValue(values, item.attributes?.[key]);
  });

  return values;
}

function resolveVoucherAssociationValues(voucher: BffTicketVoucher) {
  const values = new Set<string>();
  const keys = [
    'lineNo',
    'orderLineNo',
    'orderItemLineNo',
    'itemLineNo',
    'itemId',
    'productId',
    'productCode',
    'ticketProductCode',
    'skuId',
    'skuCode',
    'goodsCode',
    'zhiyoubaoGoodsCode',
    'subOrderCode',
  ];

  keys.forEach((key) => {
    pushAssociationValue(values, voucher[key]);
    pushAssociationValue(values, voucher.rawFields?.[key]);
  });

  return values;
}

function resolveAnnualCardAssociationValues(card: BffAnnualCard) {
  const values = new Set<string>();
  const keys = [
    'orderItemNo',
    'lineNo',
    'orderLineNo',
    'orderItemLineNo',
    'itemLineNo',
    'itemId',
    'productId',
    'productCode',
    'skuId',
    'skuCode',
    'cardId',
    'cardNo',
  ];

  keys.forEach((key) => {
    pushAssociationValue(values, card[key]);
    pushAssociationValue(values, card.rawFields?.[key]);
  });

  return values;
}

function hasAssociationOverlap(leftValues: Set<string>, rightValues: Set<string>) {
  for (const left of leftValues) {
    for (const right of rightValues) {
      if (left === right) return true;
      if (left.length >= 4 && right.length >= 4 && (left.includes(right) || right.includes(left))) {
        return true;
      }
    }
  }

  return false;
}

function hasAnnualCardItemSignal(item: BffOrderItem) {
  const values = [
    item.itemType,
    item.itemName,
    item.categoryId,
    item.attributes?.itemType,
    item.attributes?.categoryId,
    item.attributes?.categoryCode,
    item.attributes?.categorySection,
    item.attributes?.fulfillmentType,
    item.attributes?.productType,
  ].map((value) => normalizeUnknownText(value)).filter(Boolean);
  const normalizedText = values.join(' ').replace(/[-_\s]/g, '').toUpperCase();

  return normalizedText.includes('ANNUAL')
    || normalizedText.includes('YEARCARD')
    || normalizedText.includes('ANNUALPASS')
    || values.some((value) => value.includes('年卡'));
}

function resolveAnnualCardsForItem(order: BffOrder, item: BffOrderItem, annualCards: BffAnnualCard[]) {
  if (!annualCards.length) return [];

  const itemValues = resolveItemAssociationValues(item);
  const matchedCards = annualCards.filter((card) => hasAssociationOverlap(
    itemValues,
    resolveAnnualCardAssociationValues(card),
  ));

  if (matchedCards.length) return matchedCards;

  if ((order.items || []).length === 1 && annualCards.length === 1 && hasAnnualCardItemSignal(item)) {
    return annualCards;
  }

  return [];
}

function resolveMatchedAnnualCardSet(order: BffOrder) {
  const matchedCards = new Set<BffAnnualCard>();
  const annualCards = order.annualCards || [];

  (order.items || []).forEach((item) => {
    resolveAnnualCardsForItem(order, item, annualCards).forEach((card) => {
      matchedCards.add(card);
    });
  });

  return matchedCards;
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
  if (String(order.sceneType || '').toUpperCase() !== 'MALL') return true;
  const reviewableItemIds = (order.items || [])
    .map((item) => item.itemId || item.lineNo)
    .filter((itemId): itemId is string => Boolean(itemId));
  if (!reviewableItemIds.length) return false;
  return reviewableItemIds.every((itemId) => reviewedMallItems.has(reviewLookupKey(order.orderNo, itemId)));
}

function resolveReviewTargetItem(order: BffOrder, reviewedMallItems: Set<string>): BffOrderItem | undefined {
  const items = order.items || [];
  if (String(order.sceneType || '').toUpperCase() !== 'MALL' || !isCompletedStatus(order.orderStatus)) {
    return items[0];
  }

  return items.find((item) => {
    const itemId = item.itemId || item.lineNo;
    return Boolean(itemId && !reviewedMallItems.has(reviewLookupKey(order.orderNo, itemId)));
  }) || items[0];
}

// 按订单业态输出商品摘要字段，避免所有业态共用商城式字段。
function resolveSceneProductFields(order: BffOrder, title: string, merchantName: string, mallSpecText: string): OrderDetailFieldData[] {
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();

  if (normalizedSceneType === 'MALL') {
    return compactFields([
      { label: '商户名称', value: merchantName },
      { label: '商品名称', value: title },
      { label: '规格信息', value: mallSpecText },
    ]);
  }

  if (normalizedSceneType === 'HOTEL') {
    const hotelRoomText = resolveHotelRoomText(order);

    return compactFields([
      { label: '酒店名称', value: resolveOrderText(order, ['hotelName', 'merchantName', 'shopName']) || merchantName },
      { label: '房型', value: hotelRoomText || title },
      { label: '价格计划', value: resolveOrderText(order, ['ratePlanTitle', 'ratePlanName', 'skuName']) },
    ]);
  }

  if (normalizedSceneType === 'TICKET') {
    return compactFields([
      { label: '项目名称', value: title },
      { label: '票种', value: resolveOrderText(order, ['ticketTypeName', 'skuName', 'specName']) },
    ]);
  }

  return compactFields([
    { label: '订单业态', value: order.sceneType || '-' },
    { label: '商品信息', value: title },
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
    const reviewTargetItem = resolveReviewTargetItem(order, reviewedMallItems);
    const reviewTargetItemId = normalizeString(reviewTargetItem?.itemId || reviewTargetItem?.lineNo);
    const itemQuery = reviewTargetItemId ? `&itemId=${encodeURIComponent(reviewTargetItemId)}` : '';
    actions.push({
      text: '评价晒单',
      route: `${MINI_PACKAGE_ROUTES.orderReviewCreate}?orderId=${encodeURIComponent(order.orderNo)}${itemQuery}`,
      tone: 'primary',
    });
  }

  return actions;
}

const TICKET_VISIT_DATE_KEYS = [
  'visitDate',
  'visitDateText',
  'travelDate',
  'travelDateText',
  'useDate',
  'useDateText',
  'playDate',
  'date',
  'dateText',
];
const TICKET_ENTRY_TIME_KEYS = [
  'entryTime',
  'entryTimeText',
  'entryTimeRange',
  'admissionTime',
  'admissionTimeText',
  'admissionTimeRange',
  'admissionHours',
  'openTime',
  'openTimeText',
  'businessHours',
  'businessTime',
  'validTime',
  'validTimeText',
  'validPeriod',
  'availableTime',
  'useTime',
  'useTimeText',
  'serviceTime',
  'ticketEntryTime',
];
const TICKET_ENTRY_ADDRESS_KEYS = [
  'entryAddress',
  'entryAddressText',
  'admissionAddress',
  'admissionAddressText',
  'entryPlace',
  'gateAddress',
  'entranceAddress',
  'parkAddress',
  'venueAddress',
  'scenicAddress',
  'scenicSpotAddress',
];
const TICKET_USAGE_HTML_KEYS = [
  'usageInstructionHtml',
  'useInstructionHtml',
  'instructionHtml',
  'instructionsHtml',
  'usageNoticeHtml',
  'usageRuleHtml',
  'useRuleHtml',
  'ruleHtml',
  'rulesHtml',
  'detailHtml',
  'detailRichText',
  'richTextHtml',
  'richText',
  'noticeHtml',
  'ticketNoticeHtml',
];
const TICKET_CERTIFICATE_KEYS = [
  'certificateNo',
  'idCard',
  'idCardNo',
  'identityNo',
  'identityCardNo',
  'certNo',
  'certificateNumber',
  'travelerIdCard',
  'holderIdCard',
  'travelerIds',
];

function resolveTicketGroupId(item: BffOrderItem, index: number) {
  return item.lineNo || item.itemId || item.skuId || `ticket-item-${index}`;
}

function resolveTicketItemTitle(order: BffOrder, item: BffOrderItem | undefined, index: number) {
  return sanitizeMallRuntimeText(
    resolveItemText(item, ['itemName', 'title', 'productName', 'ticketName', 'skuName', 'specName'])
      || item?.itemName
      || (index === 0 ? resolveTitle(order) : '')
      || item?.itemId
      || item?.lineNo,
  );
}

function resolveTicketItemSubtitle(item: BffOrderItem | undefined) {
  return sanitizeMallRuntimeText(resolveItemText(item, ['skuName', 'specName', 'subtitle', 'audience', 'ticketTypeName']));
}

function resolveTicketEntryFields(order: BffOrder, item?: BffOrderItem): OrderDetailFieldData[] {
  return compactFields([
    { label: '使用日期', value: resolveOrderItemText(order, item, TICKET_VISIT_DATE_KEYS) },
    { label: '入园时间', value: resolveOrderItemText(order, item, TICKET_ENTRY_TIME_KEYS) },
    { label: '入园地址', value: resolveOrderItemText(order, item, TICKET_ENTRY_ADDRESS_KEYS) },
  ]);
}

function resolveTicketVoucherEntryFields(order: BffOrder, voucher: BffTicketVoucher): OrderDetailFieldData[] {
  return compactFields([
    { label: '使用日期', value: resolveVoucherText(voucher, TICKET_VISIT_DATE_KEYS) || order.context?.visitDate || '' },
    { label: '入园时间', value: resolveVoucherText(voucher, TICKET_ENTRY_TIME_KEYS) },
    { label: '入园地址', value: resolveVoucherText(voucher, TICKET_ENTRY_ADDRESS_KEYS) },
  ]);
}

function resolveTicketUsageInstructionHtml(order: BffOrder, item?: BffOrderItem) {
  const itemHtml = resolveItemText(item, TICKET_USAGE_HTML_KEYS);
  if (itemHtml) return itemHtml;

  if ((order.items || []).length <= 1) {
    return resolveRecordText(order.context, TICKET_USAGE_HTML_KEYS);
  }

  return '';
}

function resolveTicketVoucherUsageInstructionHtml(voucher: BffTicketVoucher) {
  return resolveVoucherText(voucher, TICKET_USAGE_HTML_KEYS);
}

function mergeTicketEntryFields(...fieldLists: Array<OrderDetailFieldData[] | undefined>) {
  const fieldMap = new Map<string, OrderDetailFieldData>();

  fieldLists.forEach((fields) => {
    fields?.forEach((field) => {
      if (!fieldMap.has(field.label) && field.value) {
        fieldMap.set(field.label, field);
      }
    });
  });

  return Array.from(fieldMap.values());
}

function resolveTicketFieldValue(fields: OrderDetailFieldData[] | undefined, label: string) {
  return fields?.find((field) => field.label === label)?.value || '';
}

function resolveTicketGroupEntryFields(
  order: BffOrder,
  item: BffOrderItem | undefined,
  vouchers: OrderTicketInstanceData[],
) {
  return mergeTicketEntryFields(
    resolveTicketEntryFields(order, item),
    ...vouchers.map((ticket) => ticket.entryFields),
  );
}

function resolveTicketGroupUsageInstructionHtml(
  order: BffOrder,
  item: BffOrderItem | undefined,
  vouchers: OrderTicketInstanceData[],
) {
  return resolveTicketUsageInstructionHtml(order, item)
    || vouchers.find((ticket) => ticket.usageInstructionHtml)?.usageInstructionHtml
    || '';
}

// 从年卡资产和透传字段中读取指定文案。
function resolveAnnualCardText(card: BffAnnualCard, keyCandidates: string[]) {
  for (const key of keyCandidates) {
    const value = normalizeUnknownText(card[key])
      || normalizeUnknownText(card.rawFields?.[key]);
    if (value) return value;
  }

  return '';
}

// 将年卡入园方式枚举转换为用户可读文本。
function resolveAnnualCardEntryMethods(card: BffAnnualCard) {
  const entryMethods = Array.isArray(card.entryMethods) ? card.entryMethods : [];
  const labels = entryMethods.map((method) => {
    const normalizedMethod = String(method).toUpperCase();
    if (normalizedMethod === 'ID_CARD') return '身份证';
    if (normalizedMethod === 'PHYSICAL_CARD') return '实体卡';
    if (normalizedMethod === 'QR_CODE') return '二维码';
    return String(method);
  }).filter(Boolean);

  return labels.join('、');
}

// 生成年卡有效期展示文案，未激活未返回时保持空字段。
function resolveAnnualCardValidityText(card: BffAnnualCard) {
  if (card.validFrom && card.validTo) return `${card.validFrom} 至 ${card.validTo}`;
  if (card.validTo) return `有效至 ${card.validTo}`;
  return '';
}

function uniqueText(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).join('、');
}

function resolveAnnualCardStatusSummary(cards: BffAnnualCard[]) {
  return uniqueText(cards.map((card) => resolveAnnualCardStatusText(card.status, card.statusText)));
}

function resolveAnnualCardEntryFields(cards: BffAnnualCard[]): OrderDetailFieldData[] {
  return compactFields([
    { label: '有效期', value: uniqueText(cards.map((card) => resolveAnnualCardValidityText(card))) },
    { label: '入园方式', value: uniqueText(cards.map((card) => resolveAnnualCardEntryMethods(card))) },
  ]);
}

function resolveAnnualCardUsageInstructionHtml(cards: BffAnnualCard[]) {
  for (const card of cards) {
    const usageInstructionHtml = normalizeString(card.usageInstructionHtml)
      || resolveAnnualCardText(card, TICKET_USAGE_HTML_KEYS);
    if (usageInstructionHtml) return usageInstructionHtml;
  }

  return '';
}

function resolveAnnualCardAction(card?: BffAnnualCard): OrderTicketGroupData['action'] {
  const cardId = normalizeString(card?.cardId || card?.cardNo);
  if (!cardId) return undefined;

  return {
    text: '查看年卡',
    route: `${MINI_PACKAGE_ROUTES.memberCardDetail}?cardId=${encodeURIComponent(cardId)}`,
    tone: 'default',
  };
}

// 将订单里的年卡资产映射成门票详情分组，复用票务详情展示结构。
function mapAnnualCardGroups(order: BffOrder, excludedCards = new Set<BffAnnualCard>()): OrderTicketGroupData[] {
  return (order.annualCards || []).filter((card) => !excludedCards.has(card)).map((card, index) => {
    const title = resolveAnnualCardText(card, ['productName', 'cardName', 'itemName']) || `年卡 ${index + 1}`;
    const usageInstructionHtml = resolveAnnualCardUsageInstructionHtml([card]);

    return {
      id: card.cardId || card.cardNo || `annual-card-${index}`,
      title,
      subtitle: resolveAnnualCardText(card, ['skuName', 'specName']),
      quantityText: 'x1',
      statusText: resolveAnnualCardStatusText(card.status, card.statusText),
      action: resolveAnnualCardAction(card),
      entryFields: compactFields([
        { label: '有效期', value: resolveAnnualCardValidityText(card) },
        { label: '入园方式', value: resolveAnnualCardEntryMethods(card) },
        { label: '详情', value: usageInstructionHtml },
      ]),
      usageInstructionHtml,
      vouchers: [],
    };
  });
}

function resolveTicketCertificateNo(order: BffOrder) {
  return resolveOrderText(order, TICKET_CERTIFICATE_KEYS)
    || resolveItemText(order.items?.[0], TICKET_CERTIFICATE_KEYS);
}

function resolveContactFields(order: BffOrder, addressText: string): OrderDetailFieldData[] {
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  if (normalizedSceneType === 'TICKET') {
    const firstAnnualCard = order.annualCards?.[0];
    return compactFields([
      { label: '联系人', value: order.contactName || firstAnnualCard?.holderName || '' },
      { label: '手机号', value: order.contactPhone || firstAnnualCard?.holderMobileMasked || firstAnnualCard?.holderMobile || '' },
      { label: '身份证', value: resolveTicketCertificateNo(order) || firstAnnualCard?.holderIdCardMasked || firstAnnualCard?.holderIdCard || '' },
    ]);
  }

  return compactFields([
    { label: '联系人', value: order.contactName || '' },
    { label: '手机号', value: order.contactPhone || '' },
    { label: '收货地址', value: addressText || '' },
  ]);
}

function resolveTicketVoucherGroupId(order: BffOrder, voucher: BffTicketVoucher, ticketItems: BffOrderItem[]) {
  if (!ticketItems.length) return undefined;
  if (ticketItems.length === 1) return resolveTicketGroupId(ticketItems[0], 0);

  const voucherValues = resolveVoucherAssociationValues(voucher);
  const matchedIndex = ticketItems.findIndex((item) => hasAssociationOverlap(
    voucherValues,
    resolveItemAssociationValues(item),
  ));

  return matchedIndex >= 0 ? resolveTicketGroupId(ticketItems[matchedIndex], matchedIndex) : undefined;
}

function mapTicketInstances(order: BffOrder): OrderTicketInstanceData[] {
  const ticketItems = order.items || [];
  const voucherInstances = (order.ticketVouchers || [])
    .filter(isDisplayableTicketVoucher)
    .map((voucher, index) => mapTicketVoucher(order, voucher, index, resolveTicketVoucherGroupId(order, voucher, ticketItems)))
    .filter((ticket): ticket is OrderTicketInstanceData => Boolean(ticket));
  if (voucherInstances.length) return voucherInstances;

  return (order.ticketInstances || []).map((ticket, index) => {
    const groupId = ticketItems.length === 1 ? resolveTicketGroupId(ticketItems[0], 0) : undefined;
    const ticketNo = ticket.ticketNo || '';
    const qrCodePayload = ticket.qrCodePayload || ticketNo;
    const statusKey = String(ticket.status || '').toUpperCase();
    const useTimesText = typeof ticket.remainingUseTimes === 'number'
      ? `剩余 ${ticket.remainingUseTimes} 次`
      : '';
    const validTimeText = ticket.validStartAt && ticket.validEndAt
      ? `${formatDateTime(ticket.validStartAt)} - ${formatDateTime(ticket.validEndAt)}`
      : '';

    return {
      id: ticketNo || qrCodePayload || `ticket-instance-${index}`,
      groupId,
      ticketNo,
      copyValue: ticketNo || qrCodePayload,
      qrCodePayload,
      productName: ticket.productName || resolveTitle(order),
      skuName: ticket.skuName || '',
      statusKey,
      statusText: resolveTicketStatusText(ticket.status),
      visitDate: ticket.visitDate || order.context?.visitDate || '',
      validTimeText,
      useTimesText,
      usedNum: ticket.usedTimes,
      entryFields: compactFields([
        { label: '使用日期', value: ticket.visitDate || order.context?.visitDate || '' },
        { label: '入园时间', value: validTimeText },
      ]),
      fields: compactFields([
        { label: '票码', value: ticketNo, copyValue: ticketNo },
        { label: '次数', value: useTimesText },
        { label: '有效期', value: validTimeText },
      ]),
    };
  }).filter((ticket) => ticket.ticketNo || ticket.qrCodePayload);
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

function mapTicketVoucher(
  order: BffOrder,
  voucher: BffTicketVoucher,
  index: number,
  groupId?: string,
): OrderTicketInstanceData | undefined {
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
  const statusKey = String(
    getBffTicketVoucherText(voucher, 'ticketStatus')
      || getBffTicketVoucherText(voucher, 'status')
      || getBffTicketVoucherText(voucher, 'useStatus')
      || '',
  ).toUpperCase();
  const useTimesText = typeof totalNum === 'number'
    ? `共 ${totalNum} 次${typeof usedNum === 'number' ? `，已用 ${usedNum} 次` : ''}`
    : '';
  const entryFields = resolveTicketVoucherEntryFields(order, voucher);
  const usageInstructionHtml = resolveTicketVoucherUsageInstructionHtml(voucher);

  if (!ticketNo && !qrCodePayload && !qrImageSrc) return undefined;

  return {
    id: ticketNo || qrCodePayload || qrImageSrc || `ticket-voucher-${index}`,
    groupId,
    ticketNo,
    copyValue: ticketNo || qrCodePayload,
    qrCodePayload,
    qrImageSrc,
    productName: resolveVoucherText(voucher, ['productName', 'ticketName', 'itemName', 'skuName']),
    skuName: resolveVoucherText(voucher, ['skuName', 'specName', 'ticketTypeName']),
    statusKey,
    statusText: resolveTicketVoucherStatusText(voucher),
    visitDate: resolveTicketFieldValue(entryFields, '使用日期'),
    validTimeText: resolveTicketFieldValue(entryFields, '入园时间'),
    useTimesText,
    usedNum,
    totalNum,
    entryFields,
    usageInstructionHtml,
    fields: compactFields([
      { label: '票码', value: ticketNo, copyValue: ticketNo },
      { label: '次数', value: useTimesText },
    ]),
  };
}

function mapTicketGroups(
  order: BffOrder,
  ticketInstances: OrderTicketInstanceData[],
  annualCards: BffAnnualCard[],
): OrderTicketGroupData[] {
  const ticketItems = order.items || [];
  const groups: OrderTicketGroupData[] = ticketItems.map((item, index) => {
    const id = resolveTicketGroupId(item, index);
    const vouchers = ticketInstances.filter((ticket) => ticket.groupId === id);
    const matchedAnnualCards = resolveAnnualCardsForItem(order, item, annualCards);
    const entryFields = resolveTicketGroupEntryFields(order, item, vouchers);
    const annualCardUsageInstructionHtml = resolveAnnualCardUsageInstructionHtml(matchedAnnualCards);
    const usageInstructionHtml = resolveTicketGroupUsageInstructionHtml(order, item, vouchers)
      || annualCardUsageInstructionHtml;

    return {
      id,
      title: resolveTicketItemTitle(order, item, index),
      subtitle: resolveTicketItemSubtitle(item),
      quantityText: item.quantity ? `x${item.quantity}` : '',
      statusText: resolveAnnualCardStatusSummary(matchedAnnualCards),
      action: resolveAnnualCardAction(matchedAnnualCards[0]),
      entryFields: mergeTicketEntryFields(entryFields, resolveAnnualCardEntryFields(matchedAnnualCards)),
      usageInstructionHtml,
      vouchers,
    };
  }).filter((group) => group.title || group.vouchers.length || group.usageInstructionHtml);

  const groupedVoucherIds = new Set(groups.flatMap((group) => group.vouchers.map((ticket) => ticket.id)));
  const ungroupedVouchers = ticketInstances.filter((ticket) => !groupedVoucherIds.has(ticket.id));

  ungroupedVouchers.forEach((ticket, index) => {
    groups.push({
      id: `ticket-voucher-group-${ticket.id || index}`,
      title: ticket.productName || '入园凭证',
      subtitle: ticket.skuName,
      quantityText: 'x1',
      statusText: ticket.statusText,
      entryFields: ticket.entryFields || compactFields([
        { label: '使用日期', value: ticket.visitDate },
        { label: '入园时间', value: ticket.validTimeText },
      ]),
      usageInstructionHtml: ticket.usageInstructionHtml,
      vouchers: [ticket],
    });
  });

  if (!groups.length && ticketInstances.length) {
    return [{
      id: 'ticket-vouchers',
      title: resolveTitle(order),
      quantityText: resolveQuantityText(order),
      entryFields: resolveTicketEntryFields(order, undefined),
      usageInstructionHtml: resolveTicketUsageInstructionHtml(order, undefined),
      vouchers: ticketInstances,
    }];
  }

  return groups;
}

function mapOrderToDetail(order: BffOrder, reviewedMallItems?: Set<string>): OrderDetailData {
  const context = order.context || {};
  const primaryActionType = resolvePrimaryAction(order);
  const title = resolveTitle(order);
  const merchantName = resolveMerchantName(order);
  const mallSpecText = resolveMallSpecText(order);
  const addressText = resolveAddressText(context);
  const deliveryCompany = resolveLogisticsField(context, ['deliveryCompany', 'logisticsCompany', 'expressCompany', 'courierCompany']);
  const trackingNumber = resolveLogisticsField(context, ['trackingNumber', 'waybillNo', 'logisticsNo', 'deliveryNo', 'expressNo']);
  const logisticsStatusText = resolveLogisticsField(context, ['logisticsStatusText', 'deliveryStatusText', 'shipmentStatusText', 'trackingStatusText']);
  const aftersaleEntryRoute = resolveAftersaleEntryRoute(order);
  const ticketInstances = mapTicketInstances(order);
  const matchedAnnualCards = resolveMatchedAnnualCardSet(order);
  const ticketGroups = [
    ...mapTicketGroups(order, ticketInstances, order.annualCards || []),
    ...mapAnnualCardGroups(order, matchedAnnualCards),
  ];
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  const paymentStatusText = resolvePaymentStatusText(resolvePaymentFact(order, 'paymentStatus'));
  const paymentChannelText = resolvePaymentChannelText(order.paymentChannel);
  const orderChannelText = resolveOrderChannelText(order.channel);
  const amountFields = compactFields([
    { label: '商品金额', value: formatCent(order.originalAmountCent) },
    hasPositiveCentAmount(order.discountAmountCent) ? { label: '优惠金额', value: `- ${formatCent(order.discountAmountCent)}` } : { label: '优惠金额', value: '' },
    normalizedSceneType !== 'TICKET' && hasPositiveCentAmount(order.freightAmountCent) ? { label: '运费', value: formatCent(order.freightAmountCent) } : { label: '运费', value: '' },
    { label: '实付款', value: formatCent(order.payableAmountCent) },
  ]);

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
    ticketInstances,
    ticketGroups,
    fulfillmentFields: resolveSceneFulfillmentFields(order, deliveryCompany, trackingNumber, logisticsStatusText),
    couponFields: mapOrderCouponFields(order),
    contactFields: resolveContactFields(order, addressText),
    sceneActions: resolveSceneActions(order, reviewedMallItems),
    amountFields,
    orderFields: compactFields([
      { label: '订单编号', value: order.orderNo, copyValue: order.orderNo },
      { label: '下单时间', value: formatDateTime(order.createdAt) },
      { label: '支付状态', value: paymentStatusText },
      { label: '支付时间', value: formatDateTime(resolvePaymentFact(order, 'paidAt')) },
      { label: '支付方式', value: paymentChannelText },
      { label: '渠道', value: orderChannelText },
    ]),
    refundButtonText: resolveRefundButtonText(primaryActionType),
    aftersaleEntryRoute,
    aftersaleEntryText: aftersaleEntryRoute ? '查看售后' : undefined,
  };
}

// 只有商城完成态需要查询评价记录，避免其它业态详情页多一次无意义请求。
function shouldLoadMallReviewLookup(order: BffOrder) {
  return String(order.sceneType || '').toUpperCase() === 'MALL' && isCompletedStatus(order.orderStatus);
}

// 获取真实订单详情，接口失败时由页面异常态承接，不回退本地订单。
export async function fetchDetailData(orderId?: string, options: FetchDetailDataOptions = {}) {
  if (!orderId) throw new Error('缺少订单编号');
  const order = await fetchBffOrderDetail(orderId, {
    showErrorToast: options.showErrorToast,
  });
  const normalizedSceneType = String(order.sceneType || '').toUpperCase();
  const [mallLogistics, mallReviews] = await Promise.all([
    normalizedSceneType === 'MALL'
      ? fetchBffOrderLogistics(order.orderNo, false).catch(() => undefined)
      : Promise.resolve(undefined),
    shouldLoadMallReviewLookup(order)
      ? fetchBffMallMyReviews().catch(() => undefined)
      : Promise.resolve(undefined),
  ]);
  const detailOrder = mergeMallLogisticsIntoOrder(order, mallLogistics);
  return mapOrderToDetail(detailOrder, mallReviews ? buildReviewedMallItemSet(mallReviews) : undefined);
}
