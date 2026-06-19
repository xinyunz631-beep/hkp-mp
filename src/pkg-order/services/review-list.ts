import { ORDER_REVIEW_UNAVAILABLE_MESSAGE } from './review-create';
import type { OrderReviewListData } from './model';

export type { OrderReviewListData } from './model';

export async function fetchReviewListData(): Promise<OrderReviewListData> {
  return {
    filters: [],
    reviews: [],
    unavailableReason: ORDER_REVIEW_UNAVAILABLE_MESSAGE,
  };
}
