import type {
  BffOrder,
  BffOrderAftersaleFieldData,
  BffOrderAftersaleProgressStepData,
  BffOrderLogisticsData,
  BffOrderLogisticsTraceItem,
  BffOrderSummary,
  BffOrderSummaryProduct,
} from '@/core/services/bff-order-api';
import type { HkpOrderSummary } from '@/core/types/hkp';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import type {
  OrderAftersaleFieldData,
  OrderAftersaleProgressStepData,
  OrderLogisticsData,
  OrderLogisticsTraceItem,
} from './model';
import { parseNumberLike } from '@/core/utils/money';
import { formatOrderDateTime } from './time';

export function normalizeText(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value?: number | string) {
  return parseNumberLike(value) ?? 0;
}

// 从后端 summary 的多种真实图片字段中取商品图，不补前端默认图。
function resolveSummaryProductImage(product?: BffOrderSummaryProduct) {
  return sanitizeMallRuntimeUrl(
    normalizeText(product?.image?.src)
      || normalizeText(product?.image?.url)
      || normalizeText(product?.image?.imageUrl)
      || normalizeText(product?.imageUrl)
      || normalizeText(product?.imageSrc)
      || normalizeText(product?.mainImageUrl)
      || normalizeText(product?.attributes?.imageUrl)
      || normalizeText(product?.attributes?.imageSrc)
      || normalizeText(product?.attributes?.mainImageUrl),
    { allowMockImage: true },
  );
}

// 从订单详情 item attributes 中读取真实商品图，用于售后进度页增强同一订单摘要。
function resolveDetailOrderImage(order?: BffOrder) {
  const firstItem = order?.items?.[0];
  return sanitizeMallRuntimeUrl(
    normalizeText(firstItem?.attributes?.imageUrl)
      || normalizeText(firstItem?.attributes?.imageSrc)
      || normalizeText(firstItem?.attributes?.mainImageUrl),
    { allowMockImage: true },
  );
}

export function toOrderSummary(order?: BffOrderSummary): HkpOrderSummary {
  return {
    id: normalizeText(order?.id),
    statusText: normalizeText(order?.statusText),
    merchantName: sanitizeMallRuntimeText(order?.merchantName) || undefined,
    products: (order?.products || [])
      .map((product) => ({
        id: normalizeText(product.id),
        title: sanitizeMallRuntimeText(product.title),
        subtitle: sanitizeMallRuntimeText(product.subtitle) || undefined,
        image: {
          src: resolveSummaryProductImage(product),
          alt: sanitizeMallRuntimeText(product.image?.alt || product.title) || undefined,
        },
        skuText: sanitizeMallRuntimeText(product.skuText) || undefined,
        price: normalizeNumber(product.price),
        quantity: normalizeNumber(product.quantity),
      }))
      .filter((product) => product.id || product.title || product.image.src),
    totalAmount: normalizeNumber(order?.totalAmount),
    countText: normalizeText(order?.countText) || undefined,
    primaryActionText: normalizeText(order?.primaryActionText) || undefined,
    secondaryActionText: normalizeText(order?.secondaryActionText) || undefined,
  };
}

// 合并订单详情里的真实图片字段；只增强缺失图片，不覆盖 BFF summary 已给出的展示数据。
export function mergeOrderSummaryWithDetail(summary: HkpOrderSummary, order?: BffOrder): HkpOrderSummary {
  const detailImageSrc = resolveDetailOrderImage(order);
  if (!detailImageSrc || summary.products[0]?.image.src) return summary;

  return {
    ...summary,
    products: summary.products.map((product, index) => (
      index === 0
        ? {
          ...product,
          image: {
            ...product.image,
            src: detailImageSrc,
          },
        }
        : product
    )),
  };
}

function toLogisticsTraceItem(item?: BffOrderLogisticsTraceItem): OrderLogisticsTraceItem {
  return {
    id: normalizeText(item?.id),
    timeText: formatOrderDateTime(item?.timeText),
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
  const valueText = sanitizeMallRuntimeText(item?.value);

  return {
    label: sanitizeMallRuntimeText(item?.label),
    value: formatOrderDateTime(valueText),
  };
}

export function toAftersaleProgressStep(item?: BffOrderAftersaleProgressStepData): OrderAftersaleProgressStepData {
  return {
    id: normalizeText(item?.id),
    title: sanitizeMallRuntimeText(item?.title),
    timeText: formatOrderDateTime(item?.timeText),
    detailText: sanitizeMallRuntimeText(item?.detailText) || undefined,
  };
}
