import { fetchBffOrderAftersaleDraft } from '@/core/services/bff-order-api';
import { normalizeText, toOrderSummary } from './bff-adapter';
import type { OrderAftersaleApplyData } from './model';

export type { OrderAftersaleApplyData } from './model';

interface FetchAftersaleApplyOptions {
  orderId?: string;
  typeText?: string;
}

export async function fetchAftersaleApplyData(
  options: FetchAftersaleApplyOptions = {},
): Promise<OrderAftersaleApplyData> {
  if (!options.orderId) throw new Error('缺少订单编号');

  const data = await fetchBffOrderAftersaleDraft(options.orderId, { typeText: options.typeText });

  return {
    order: toOrderSummary(data.order),
    selectedTypeText: normalizeText(data.selectedTypeText),
    reasons: (data.reasons || []).map((item) => normalizeText(item)).filter(Boolean),
    defaultReason: normalizeText(data.defaultReason),
    refundAmountText: normalizeText(data.refundAmountText),
    contactName: normalizeText(data.contactName),
    contactMobile: normalizeText(data.contactMobile),
    placeholderText: normalizeText(data.placeholderText),
    uploadHintText: normalizeText(data.uploadHintText),
    serviceTipText: normalizeText(data.serviceTipText),
    submitButtonText: normalizeText(data.submitButtonText),
  };
}
