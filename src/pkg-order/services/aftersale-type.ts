import type { OrderAftersaleTypeData } from './model';
import {
  canApplyMallRefund,
  fetchMallAftersaleOrder,
  mapAftersaleOrderSummary,
  resolveMallAftersaleAmountText,
} from './aftersale-context';

export type { OrderAftersaleTypeData } from './model';

export async function fetchAftersaleTypeData(orderId?: string): Promise<OrderAftersaleTypeData> {
  const order = await fetchMallAftersaleOrder(orderId);
  const canRefund = canApplyMallRefund(order);

  return {
    order: mapAftersaleOrderSummary(order),
    tipText: canRefund
      ? '当前仅支持申请退款，最终退款金额和处理结果以审核结果为准。'
      : '当前订单已进入退款处理流程或暂不支持再次申请，退货或换货请联系商家客服协助。',
    types: [{
      key: 'refund-request',
      title: order.orderStatus === 'FULFILLING' ? '申请退款' : '仅退款',
      desc: '当前仅开放退款申请入口，其他售后方式请联系商家客服。',
      amountText: `预计退款 ${resolveMallAftersaleAmountText(order)}`,
      tagText: canRefund ? '当前支持' : '以审核结果为准',
    }],
  };
}
