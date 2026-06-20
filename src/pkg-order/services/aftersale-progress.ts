import { fetchBffOrderAftersaleProgress } from '@/core/services/bff-order-api';
import {
  normalizeText,
  toAftersaleField,
  toAftersaleProgressStep,
  toOrderSummary,
} from './bff-adapter';
import type { OrderAftersaleProgressData } from './model';

export type { OrderAftersaleProgressData } from './model';

interface FetchAftersaleProgressOptions {
  orderId?: string;
  typeText?: string;
  reasonText?: string;
}

export async function fetchAftersaleProgressData(
  options: FetchAftersaleProgressOptions = {},
): Promise<OrderAftersaleProgressData> {
  if (!options.orderId) throw new Error('缺少订单编号');

  const data = await fetchBffOrderAftersaleProgress(options.orderId, {
    typeText: options.typeText,
    reasonText: options.reasonText,
  });

  return {
    order: toOrderSummary(data.order),
    serviceNo: normalizeText(data.serviceNo),
    typeText: normalizeText(data.typeText),
    statusText: normalizeText(data.statusText),
    statusDesc: normalizeText(data.statusDesc),
    refundAmountText: normalizeText(data.refundAmountText),
    reasonText: normalizeText(data.reasonText),
    fields: (data.fields || []).map(toAftersaleField),
    progress: (data.progress || []).map(toAftersaleProgressStep),
    primaryButtonText: normalizeText(data.primaryButtonText),
    unavailableReason: normalizeText(data.unavailableReason) || undefined,
  };
}
