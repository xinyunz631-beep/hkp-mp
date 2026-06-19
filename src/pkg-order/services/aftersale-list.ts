import type { OrderAftersaleListData, OrderAftersaleRecordData } from './model';
import {
  fetchMallAftersaleOrders,
  mapAftersaleOrderSummary,
  resolveMallAftersaleAmountText,
  resolveMallAftersaleDateText,
  resolveMallAftersaleServiceNo,
  resolveMallAftersaleStatusDesc,
  resolveMallAftersaleStatusText,
  resolveMallAftersaleTypeText,
} from './aftersale-context';

export type { OrderAftersaleListData } from './model';

function mapRecordTabKey(statusText: string) {
  return statusText === '退款成功' ? 'refund' : 'processing';
}

function mapAftersaleRecord(order: Awaited<ReturnType<typeof fetchMallAftersaleOrders>>[number]): OrderAftersaleRecordData {
  const statusText = resolveMallAftersaleStatusText(order);

  return {
    id: order.orderNo,
    tabKey: mapRecordTabKey(statusText),
    serviceNo: resolveMallAftersaleServiceNo(order),
    typeText: resolveMallAftersaleTypeText(order),
    statusText,
    statusDesc: resolveMallAftersaleStatusDesc(order),
    amountText: resolveMallAftersaleAmountText(order),
    createdAt: resolveMallAftersaleDateText(order),
    buttonText: '查看进度',
    order: mapAftersaleOrderSummary(order),
  };
}

export async function fetchAftersaleListData(): Promise<OrderAftersaleListData> {
  const records = (await fetchMallAftersaleOrders()).map(mapAftersaleRecord);
  const processingCount = records.filter((record) => record.tabKey === 'processing').length;
  const refundCount = records.filter((record) => record.tabKey === 'refund').length;

  return {
    tabs: [
      { key: 'all', text: '全部', count: records.length },
      { key: 'processing', text: '处理中', count: processingCount },
      { key: 'refund', text: '退款成功', count: refundCount },
    ],
    records,
  };
}
