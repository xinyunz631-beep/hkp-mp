import { fetchBffMallReviews, type BffMallReviewItem } from '@/core/services/bff-mall-api';
import { sanitizeMallRuntimeText, sanitizeMallRuntimeUrl, sanitizeMallRuntimeTextList } from '@/core/utils/mall-runtime';
import type { OrderReviewItemData, OrderReviewListData } from './model';
import { formatOrderDateTime } from './time';

export type { OrderReviewListData } from './model';

interface FetchReviewListDataOptions {
  page?: number;
  pageSize?: number;
  existingReviews?: OrderReviewItemData[];
}

const MALL_REVIEW_LIST_PAGE_SIZE = 20;

function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

// 统一把后端评价映射成页面消费结构，避免页面层散落字段兜底。
function toOrderReviewItem(
  review: BffMallReviewItem,
  index: number,
): OrderReviewItemData {
  return {
    id: normalizeString(review.reviewId) || normalizeString(review.itemId) || `review-${index}`,
    userName: review.anonymous ? '匿名用户' : sanitizeMallRuntimeText(review.userName),
    avatarSrc: sanitizeMallRuntimeUrl(review.avatarUrl),
    rating: Number(review.rating) > 0 ? Number(review.rating) : undefined,
    tags: sanitizeMallRuntimeTextList(review.tags),
    timeText: formatOrderDateTime(review.createdAt),
    content: sanitizeMallRuntimeText(review.content),
    imageSrcs: (review.imageUrls || []).map((url) => sanitizeMallRuntimeUrl(url)).filter(Boolean),
  };
}

// 合并已加载评价，避免重复滚动触发时把同一条真实评价追加两次。
function mergeOrderReviews(
  existingReviews: OrderReviewItemData[],
  nextReviews: OrderReviewItemData[],
) {
  const mergedReviews = [...existingReviews, ...nextReviews];
  const seenReviewIds = new Set<string>();

  return mergedReviews.filter((review) => {
    if (seenReviewIds.has(review.id)) return false;
    seenReviewIds.add(review.id);
    return true;
  });
}

// 按已加载的真实评价动态生成标签筛选，不再额外脑补标签集合。
function buildReviewFilters(reviews: OrderReviewItemData[]) {
  const tagCounter = new Map<string, number>();

  reviews.forEach((review) => {
    review.tags.forEach((tag) => {
      tagCounter.set(tag, (tagCounter.get(tag) || 0) + 1);
    });
  });

  return [
    { key: 'all', text: `全部${reviews.length ? `(${reviews.length})` : ''}` },
    ...Array.from(tagCounter.entries()).map(([tag, count]) => ({
      key: tag,
      text: `${tag}${count > 0 ? `(${count})` : ''}`,
    })),
  ];
}

// 查询商品评价列表，按真实分页连续回读，避免评价一多时静默截断在第一页。
export async function fetchReviewListData(
  productId?: string,
  options: FetchReviewListDataOptions = {},
): Promise<OrderReviewListData> {
  if (!productId) {
    return {
      filters: [],
      reviews: [],
      page: 0,
      pageSize: MALL_REVIEW_LIST_PAGE_SIZE,
      totalCount: 0,
      hasMore: false,
      unavailableReason: '缺少商品编号',
    };
  }

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, options.pageSize ?? MALL_REVIEW_LIST_PAGE_SIZE);
  const response = await fetchBffMallReviews({
    productId,
    page,
    size: pageSize,
  });
  const nextReviews = (response.items || []).map((review, index) => (
    toOrderReviewItem(review, (page - 1) * pageSize + index)
  ));
  const reviews = mergeOrderReviews(options.existingReviews || [], nextReviews);
  const totalCount = typeof response.totalCount === 'number' && response.totalCount >= 0
    ? response.totalCount
    : reviews.length;
  const hasMore = totalCount > reviews.length || (
    typeof response.totalCount !== 'number' && nextReviews.length >= pageSize
  );

  return {
    filters: buildReviewFilters(reviews),
    reviews,
    page,
    pageSize,
    totalCount,
    hasMore,
  };
}
