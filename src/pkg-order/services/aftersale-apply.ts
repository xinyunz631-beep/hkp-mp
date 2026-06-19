import type { OrderAftersaleApplyData } from './model';
import {
  fetchMallAftersaleOrder,
  mapAftersaleOrderSummary,
  resolveMallAftersaleAmountText,
} from './aftersale-context';

export type { OrderAftersaleApplyData } from './model';

interface FetchAftersaleApplyOptions {
  orderId?: string;
  typeText?: string;
}

function resolveAftersaleReasons(typeText?: string) {
  if (typeText === '仅退款') {
    return ['不想要了', '地址填写有误', '重复下单', '其他原因'];
  }

  return ['商品破损', '商品与描述不符', '物流异常', '其他原因'];
}

export async function fetchAftersaleApplyData(
  options: FetchAftersaleApplyOptions = {},
): Promise<OrderAftersaleApplyData> {
  const order = await fetchMallAftersaleOrder(options.orderId);
  const selectedTypeText = options.typeText || '申请退款';
  const reasons = resolveAftersaleReasons(selectedTypeText);

  return {
    order: mapAftersaleOrderSummary(order),
    selectedTypeText,
    reasons,
    defaultReason: reasons[0],
    refundAmountText: resolveMallAftersaleAmountText(order),
    contactName: order.contactName || '当前订单联系人',
    contactMobile: order.contactPhone || '当前订单手机号',
    placeholderText: '请补充退款说明，帮助平台和商家更快处理当前订单',
    uploadHintText: '当前暂不支持上传图片凭证，如需补充凭证请联系商家客服',
    serviceTipText: '当前仅支持申请退款，退货或换货请联系商家客服处理。',
    submitButtonText: '提交退款申请',
  };
}
