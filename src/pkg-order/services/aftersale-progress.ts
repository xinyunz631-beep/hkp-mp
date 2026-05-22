import { resolveMockData } from '@/core/services/mock';
import { formatCurrency } from '@/core/utils/money';
import { resolveAftersaleOrder } from './aftersale-context';
import { aftersaleProgressData, type OrderAftersaleProgressData } from './mock-data';

export type { OrderAftersaleProgressData } from './mock-data';

interface FetchAftersaleProgressOptions {
  orderId?: string;
  typeText?: string;
  reasonText?: string;
}

// 获取售后进度页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchAftersaleProgressData(options: FetchAftersaleProgressOptions = {}) {
  const order = resolveAftersaleOrder(options.orderId) ?? aftersaleProgressData.order;
  const typeText = options.typeText || aftersaleProgressData.typeText;
  const reasonText = options.reasonText || aftersaleProgressData.reasonText;

  return resolveMockData<OrderAftersaleProgressData>({
    ...aftersaleProgressData,
    order,
    serviceNo: options.orderId ? `SH${order.id.replace(/\W/g, '').slice(-12).toUpperCase()}` : aftersaleProgressData.serviceNo,
    typeText,
    refundAmountText: formatCurrency(order.totalAmount),
    reasonText,
    progress: aftersaleProgressData.progress.map((step, index) => (
      index === 0
        ? { ...step, detailText: `已提交${typeText}申请，等待平台审核。` }
        : step
    )),
  });
}
