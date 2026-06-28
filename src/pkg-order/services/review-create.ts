import { uploadBffImage } from '@/core/services/bff-api';
import { fetchBffOrderDetail, fetchBffOrderReviewDraft, submitBffOrderReview } from '@/core/services/bff-order-api';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';
import type { OrderReviewCreateData } from './model';

export type { OrderReviewCreateData } from './model';

const DEFAULT_MAX_LENGTH = 200;

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

// 评价创建页只承接商城订单，门票、酒店和年卡订单不开放评价能力。
function isMallReviewOrder(sceneType?: string) {
  return String(sceneType || '').toUpperCase() === 'MALL';
}

function createBaseReviewData(orderId?: string, itemId?: string): OrderReviewCreateData {
  return {
    orderId: orderId || '',
    itemId: itemId || '',
    productImageSrc: '',
    productTitle: '',
    hintText: '',
    tags: [],
    defaultTagKey: '',
    placeholderText: '展开说说商品体验、配送和使用感受，帮助其他游客更快决策。',
    maxLength: DEFAULT_MAX_LENGTH,
    images: [],
    anonymousText: '匿名评价',
    submitButtonText: '提交评价',
  };
}

// 查询订单评价页草稿，缺字段时只展示真实空态或真实阻断态。
export async function fetchReviewCreateData(orderId?: string, itemId?: string): Promise<OrderReviewCreateData> {
  const baseData = createBaseReviewData(orderId, itemId);
  if (!orderId) {
    return {
      ...baseData,
      unavailableReason: '缺少订单编号',
    };
  }

  try {
    const order = await fetchBffOrderDetail(orderId, { showErrorToast: false });
    if (!isMallReviewOrder(order.sceneType)) {
      return {
        ...baseData,
        unavailableReason: '当前订单暂不支持评价',
      };
    }

    const draft = await fetchBffOrderReviewDraft(orderId, itemId, false);
    const submitTip = normalizeString(draft.submitTip) || '提交后将进入审核，审核通过后展示在商品详情页';
    return {
      ...baseData,
      orderId: normalizeString(draft.orderNo) || orderId,
      itemId: normalizeString(draft.itemId) || itemId || '',
      productImageSrc: sanitizeMallRuntimeUrl(draft.productImageUrl),
      productTitle: sanitizeMallRuntimeText(draft.productTitle),
      hintText: submitTip,
      unavailableReason: draft.alreadySubmitted ? '该商品已提交评价，请勿重复提交' : undefined,
    };
  } catch (error) {
    return {
      ...baseData,
      unavailableReason: error instanceof Error ? error.message : '评价入口加载失败，请稍后再试',
    };
  }
}

interface SubmitReviewCreatePayload {
  orderId: string;
  itemId: string;
  rating: number;
  tagKey: string;
  reviewText: string;
  reviewImages: string[];
  anonymous: boolean;
}

// 提交真实订单评价：先上传图片，再提交评价正文、标签和匿名态。
export async function submitReviewCreateData(payload: SubmitReviewCreatePayload) {
  const imageResults = await Promise.all(payload.reviewImages.map((filePath) => uploadBffImage(filePath)));
  const response = await submitBffOrderReview({
    orderNo: payload.orderId,
    itemId: payload.itemId,
    rating: payload.rating,
    tags: payload.tagKey ? [payload.tagKey] : [],
    content: payload.reviewText.trim(),
    imageUrls: imageResults.map((item) => item.imageUrl).filter(Boolean),
    anonymous: payload.anonymous,
  });

  return {
    reviewId: normalizeString(response.reviewId),
    reviewStatus: normalizeString(response.reviewStatus),
    auditTip: normalizeString(response.auditTip) || '评价已提交，审核后展示',
  };
}
