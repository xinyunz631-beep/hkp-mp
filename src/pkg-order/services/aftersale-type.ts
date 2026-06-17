import { resolveMockData } from '@/core/services/mock';
import { formatCurrency } from '@/core/utils/money';
import { resolveAftersaleOrder } from './aftersale-context';
import { aftersaleTypeData, type OrderAftersaleTypeData } from './mock-data';

export type { OrderAftersaleTypeData } from './mock-data';

function createAftersaleTypes(order: OrderAftersaleTypeData['order']) {
  const refundAmountText = formatCurrency(order.totalAmount);
  if (order.statusText === '待发货') {
    return [{
      key: 'refund-only',
      title: '仅退款',
      desc: '商品尚未发货，提交后商家会尽快审核',
      amountText: `预计退款 ${refundAmountText}`,
      tagText: '推荐',
    }];
  }

  return [
    {
      key: 'return-refund',
      title: '退货退款',
      desc: '收到商品后需要寄回时使用',
      amountText: `最高可退 ${refundAmountText}`,
      tagText: '推荐',
    },
    {
      key: 'exchange',
      title: '换货',
      desc: '商品破损、少件或规格不合适时使用',
      amountText: '审核通过后安排换货',
    },
  ];
}

// 获取售后类型页面数据，后续接真实接口时在这里处理字段归一和异常态/空态转译。
export function fetchAftersaleTypeData(orderId?: string) {
  const order = resolveAftersaleOrder(orderId) ?? aftersaleTypeData.order;

  return resolveMockData<OrderAftersaleTypeData>({
    ...aftersaleTypeData,
    order,
    tipText: order.statusText === '待发货'
      ? '商品尚未发货，当前优先支持仅退款。'
      : '根据商品状态可选择退货退款或换货，提交后平台会协助处理。',
    types: createAftersaleTypes(order),
  });
}
