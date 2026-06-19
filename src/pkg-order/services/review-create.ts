import { fetchBffOrderDetail } from '@/core/services/bff-order-api';
import type { OrderReviewCreateData } from './model';

export const ORDER_REVIEW_UNAVAILABLE_MESSAGE = '当前暂不支持提交或查看商品评价';

export type { OrderReviewCreateData } from './model';

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function fetchReviewCreateData(orderId?: string): Promise<OrderReviewCreateData> {
  const fallbackData: OrderReviewCreateData = {
    productImageSrc: '',
    productTitle: '',
    hintText: '',
    tags: [],
    defaultTagKey: '',
    placeholderText: '',
    maxLength: 0,
    images: [],
    anonymousText: '匿名评价',
    submitButtonText: '暂未开放',
    unavailableReason: ORDER_REVIEW_UNAVAILABLE_MESSAGE,
  };

  if (!orderId) return fallbackData;

  try {
    const order = await fetchBffOrderDetail(orderId, { showErrorToast: false });
    const firstItem = order.items?.[0];

    return {
      ...fallbackData,
      productImageSrc: normalizeString(
        firstItem?.attributes?.imageUrl
          || firstItem?.attributes?.imageSrc
          || firstItem?.attributes?.mainImageUrl,
      ),
      productTitle: normalizeString(firstItem?.itemName) || firstItem?.itemId || '订单商品',
      hintText: '当前可先查看订单商品信息，评价功能暂未开放',
    };
  } catch {
    return fallbackData;
  }
}
