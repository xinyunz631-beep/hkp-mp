import { resolveMockData } from '@/core/services/mock';
import { formatCurrency } from '@/core/utils/money';
import { resolveAftersaleOrder } from './aftersale-context';
import { aftersaleApplyData, type OrderAftersaleApplyData } from './mock-data';

export type { OrderAftersaleApplyData } from './mock-data';

interface FetchAftersaleApplyOptions {
  orderId?: string;
  typeText?: string;
}

function resolveAftersaleReasons(typeText?: string) {
  if (typeText === '换货') {
    return ['商品破损', '规格不合适', '少件漏发', '其他原因'];
  }

  if (typeText === '退货退款') {
    return ['商品破损', '商品与描述不符', '拍错规格', '其他原因'];
  }

  return ['不想要了', '地址信息填写有误', '重复购买', '其他原因'];
}

// 获取售后申请页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchAftersaleApplyData(options: FetchAftersaleApplyOptions = {}) {
  const order = resolveAftersaleOrder(options.orderId) ?? aftersaleApplyData.order;
  const selectedTypeText = options.typeText || aftersaleApplyData.selectedTypeText;
  const reasons = resolveAftersaleReasons(selectedTypeText);

  return resolveMockData<OrderAftersaleApplyData>({
    ...aftersaleApplyData,
    order,
    selectedTypeText,
    reasons,
    defaultReason: reasons[0],
    refundAmountText: formatCurrency(order.totalAmount),
    serviceTipText: selectedTypeText === '换货'
      ? '提交后商家会核实商品情况并安排换货。'
      : '提交后平台会在 1-2 个工作日内完成审核。',
  });
}
