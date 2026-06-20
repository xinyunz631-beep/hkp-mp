import type {
  BffOrderAftersaleFieldData,
  BffOrderAftersaleProgressStepData,
  BffOrderLogisticsData,
  BffOrderLogisticsTraceItem,
  BffOrderSummary,
} from '@/core/services/bff-order-api';
import type { HkpOrderSummary } from '@/core/types/hkp';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import type {
  OrderAftersaleFieldData,
  OrderAftersaleProgressStepData,
  OrderLogisticsData,
  OrderLogisticsTraceItem,
} from './model';

export function normalizeText(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function toOrderSummary(order?: BffOrderSummary): HkpOrderSummary {
  return {
    id: normalizeText(order?.id),
    statusText: normalizeText(order?.statusText),
    merchantName: sanitizeMallRuntimeText(order?.merchantName) || undefined,
    products: (order?.products || []).map((product) => ({
      id: normalizeText(product.id),
      title: sanitizeMallRuntimeText(product.title),
      subtitle: sanitizeMallRuntimeText(product.subtitle) || undefined,
      image: {
        src: sanitizeMallRuntimeUrl(product.image?.src),
        alt: sanitizeMallRuntimeText(product.image?.alt) || undefined,
      },
      skuText: sanitizeMallRuntimeText(product.skuText) || undefined,
      price: normalizeNumber(product.price),
      quantity: normalizeNumber(product.quantity),
    })),
    totalAmount: normalizeNumber(order?.totalAmount),
    countText: normalizeText(order?.countText) || undefined,
    primaryActionText: normalizeText(order?.primaryActionText) || undefined,
    secondaryActionText: normalizeText(order?.secondaryActionText) || undefined,
  };
}

function toLogisticsTraceItem(item?: BffOrderLogisticsTraceItem): OrderLogisticsTraceItem {
  return {
    id: normalizeText(item?.id),
    timeText: normalizeText(item?.timeText),
    detailText: normalizeText(item?.detailText),
  };
}

export function toLogisticsData(data?: BffOrderLogisticsData): OrderLogisticsData {
  return {
    productImageSrc: sanitizeMallRuntimeUrl(data?.productImageSrc),
    statusText: normalizeText(data?.statusText),
    companyText: sanitizeMallRuntimeText(data?.companyText),
    trackingNumberText: normalizeText(data?.trackingNumberText),
    hotlineText: normalizeText(data?.hotlineText),
    quantityText: normalizeText(data?.quantityText),
    totalAmountText: normalizeText(data?.totalAmountText),
    confirmButtonText: normalizeText(data?.confirmButtonText) || undefined,
    traces: (data?.traces || []).map(toLogisticsTraceItem),
  };
}

export function toAftersaleField(item?: BffOrderAftersaleFieldData): OrderAftersaleFieldData {
  return {
    label: sanitizeMallRuntimeText(item?.label),
    value: sanitizeMallRuntimeText(item?.value),
  };
}

export function toAftersaleProgressStep(item?: BffOrderAftersaleProgressStepData): OrderAftersaleProgressStepData {
  return {
    id: normalizeText(item?.id),
    title: sanitizeMallRuntimeText(item?.title),
    timeText: normalizeText(item?.timeText),
    detailText: sanitizeMallRuntimeText(item?.detailText) || undefined,
  };
}
