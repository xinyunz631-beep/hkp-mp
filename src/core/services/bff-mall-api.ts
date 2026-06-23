import { request } from '@/core/request';

export interface BffPageResult<T> {
  list?: T[];
  total?: number;
  page?: number;
  size?: number;
  hasMore?: boolean;
}

export interface BffMallImageAsset {
  id?: string;
  url?: string;
  alt?: string;
  sortOrder?: number;
}

export interface BffMallSkuSpecOption {
  optionId?: string;
  label?: string;
  disabled?: boolean;
  disabledReason?: string;
  imageUrl?: string;
}

export interface BffMallSkuSpecGroup {
  groupId?: string;
  title?: string;
  sortOrder?: number;
  options?: BffMallSkuSpecOption[];
}

export interface BffMallSku {
  skuId?: string;
  skuCode?: string;
  optionIds?: Record<string, string>;
  skuText?: string;
  imageUrl?: string;
  price?: number;
  marketPrice?: number;
  stock?: number;
  totalStock?: number;
  soldStock?: number;
  lockedStock?: number;
  giftText?: string;
  limitPerOrder?: number;
  saleStatus?: string;
}

export interface BffMallSkuAvailability {
  skuId?: string;
  skuCode?: string;
  canBuy?: boolean;
  availableStock?: number;
  lockedStock?: number;
  limitPerOrder?: number;
  unavailableReason?: string;
  unavailableReasons?: string[];
}

export interface BffMallShippingRule {
  shippingMode?: string;
  freightAmount?: number;
  freeShippingThreshold?: number;
  deliveryTemplateId?: string;
  supportedRegionKeywords?: string[];
  unsupportedRegionKeywords?: string[];
  reasonText?: string;
}

export interface BffMallDeliveryTemplateSummary {
  templateId?: string;
  templateName?: string;
  providerCode?: string;
  providerName?: string;
  enabled?: boolean;
  billingSummary?: string;
  regionSummary?: string;
  unavailableReason?: string;
}

export interface BffMallProduct {
  spuId?: string;
  productCode?: string;
  title?: string;
  subtitle?: string;
  categoryIds?: string[];
  brandName?: string;
  merchantId?: string;
  merchantName?: string;
  productType?: string;
  tags?: string[];
  salesText?: string;
  minPrice?: number;
  maxPrice?: number;
  marketMinPrice?: number;
  marketMaxPrice?: number;
  saleStatus?: string;
  mainImageUrl?: string;
  galleryImages?: BffMallImageAsset[];
  detailImages?: BffMallImageAsset[];
  detailHtml?: string;
  servicePhone?: string;
  shareImageUrl?: string;
  paramGroups?: Record<string, string>;
  limitPerOrder?: number;
  canRefund?: boolean;
  canAfterSale?: boolean;
  afterSaleRule?: string;
  couponIds?: string[];
  promotionText?: string;
  recommendProductIds?: string[];
  specGroups?: BffMallSkuSpecGroup[];
  skus?: BffMallSku[];
  skuAvailability?: BffMallSkuAvailability[];
  canBuy?: boolean;
  unavailableReasons?: string[];
  shippingRule?: BffMallShippingRule;
  deliveryTemplateSummary?: BffMallDeliveryTemplateSummary;
  publishStatus?: string;
  channels?: string[];
}

export interface BffMallCategory {
  categoryId?: string;
  parentId?: string;
  title?: string;
  iconUrl?: string;
  bannerUrl?: string;
  sortOrder?: number;
  linkedProductCount?: number;
}

export interface BffMallRecommendation {
  poolId?: string;
  title?: string;
  placement?: string;
  keyword?: string;
  sourceType?: string;
  sourceRefType?: string;
  sourceRefId?: string;
  sourceRefLabel?: string;
  linkedProductIds?: string[];
  sortOrder?: number;
}

export interface BffMallGiftRule {
  giftRuleId?: string;
  title?: string;
  conditionType?: string;
  thresholdAmount?: number;
  thresholdQuantity?: number;
  applicableProductIds?: string[];
  giftProductIds?: string[];
  giftQuantity?: number;
  stockLimit?: number;
}

export interface BffMallHomeResponse {
  categories?: BffMallCategory[];
  recommendations?: BffMallRecommendation[];
  products?: BffMallProduct[];
  gifts?: BffMallGiftRule[];
  banners?: unknown[];
  quickEntries?: unknown[];
}

export interface BffMallCartImage {
  src?: string;
  url?: string;
  alt?: string;
}

export interface BffMallCartItem {
  id: string;
  productId?: string;
  skuId?: string;
  title?: string;
  subtitle?: string;
  image?: BffMallCartImage;
  price?: number;
  priceCent?: number;
  marketPrice?: number;
  marketPriceCent?: number;
  tag?: string;
  salesText?: string;
  quantity?: number;
  checked?: boolean;
  skuText?: string;
  merchantName?: string;
  promotionTags?: string[];
  giftText?: string;
  canRefund?: boolean;
  canAfterSale?: boolean;
  shippingRule?: BffMallShippingRule;
  stock?: number;
}

export interface BffMallCartMerchantGroup {
  id: string;
  merchantName?: string;
  promotionTags?: string[];
  items?: BffMallCartItem[];
}

export interface BffMallCartSummary {
  totalAmount?: number;
  totalAmountCent?: number;
  totalQuantity?: number;
}

export interface BffMallCartData {
  groups?: BffMallCartMerchantGroup[];
  items?: BffMallCartItem[];
  summary?: BffMallCartSummary;
  recommendProducts?: BffMallProduct[];
  totalAmount?: number;
  totalAmountCent?: number;
  totalQuantity?: number;
}

export interface BffMallCartCountData {
  totalQuantity?: number;
  totalAmount?: number;
  totalAmountCent?: number;
  summary?: BffMallCartSummary;
}

export interface BffMallFavoriteImage {
  src?: string;
  alt?: string;
}

export interface BffMallFavoriteItem {
  id?: string;
  title?: string;
  subtitle?: string;
  image?: BffMallFavoriteImage;
  price?: number;
  marketPrice?: number;
  tag?: string;
  salesText?: string;
  invalid?: boolean;
  favoritedAt?: string;
}

export interface BffMallFavoritesData {
  items?: BffMallFavoriteItem[];
  totalCount?: number;
}

export interface BffMallFavoriteMutationResult {
  favorited?: boolean;
}

export interface BffMallReviewItem {
  reviewId?: string;
  itemId?: string;
  userName?: string;
  avatarUrl?: string;
  rating?: number;
  tags?: string[];
  content?: string;
  imageUrls?: string[];
  anonymous?: boolean;
  createdAt?: string;
}

export interface BffMallReviewsData {
  items?: BffMallReviewItem[];
  totalCount?: number;
}

export interface BffMallMemberReviewLookupItem {
  orderNo?: string;
  itemId?: string;
  reviewId?: string;
  reviewStatus?: string;
}

export interface BffMallMemberReviewsData {
  items?: BffMallMemberReviewLookupItem[];
}

export interface BffAddMallCartItemRequest {
  productId: string;
  spuId?: string;
  skuId?: string;
  skuText?: string;
  quantity?: number;
  checked?: boolean;
}

export interface BffUpdateMallCartItemRequest {
  quantity?: number;
  checked?: boolean;
}

export interface BffAddMallFavoriteRequest {
  productId: string;
  spuId?: string;
}

export interface FetchBffMallProductsParams {
  keyword?: string;
  categoryId?: string;
  recommendationId?: string;
  couponId?: string;
  sourceRefType?: string;
  sourceRefId?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export interface FetchBffMallCategoriesParams {
  keyword?: string;
  page?: number;
  size?: number;
}

export interface FetchBffMallRecommendationsParams {
  placement?: string;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface FetchBffMallGiftsParams {
  orderAmountCent?: number;
  itemIds?: string | string[];
  skuIds?: string | string[];
  quantity?: number;
  page?: number;
  size?: number;
}

export interface FetchBffMallReviewsParams {
  productId: string;
  page?: number;
  size?: number;
}

export interface FetchAllBffMallPagesOptions {
  pageSize?: number;
  maxPages?: number;
  maxItems?: number;
}

const DEFAULT_BFF_MALL_PAGE_SIZE = 100;
const DEFAULT_BFF_MALL_MAX_PAGES = 5;

function appendQuery(url: string, params: Record<string, string | number | string[] | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .flatMap(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      return values
        .filter((item): item is string | number => typeof item !== 'undefined' && item !== '')
        .map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    })
    .join('&');

  return query ? `${url}?${query}` : url;
}

export function fetchBffMallHome() {
  return request<BffMallHomeResponse>({
    url: '/api/bff/mall/home',
    method: 'GET',
  });
}

export function fetchBffMallCategories(params: FetchBffMallCategoriesParams = {}) {
  return request<BffPageResult<BffMallCategory>>({
    url: appendQuery('/api/bff/mall/categories', {
      keyword: params.keyword,
      page: params.page,
      size: params.size,
    }),
    method: 'GET',
  });
}

export function fetchBffMallProducts(params: FetchBffMallProductsParams = {}) {
  return request<BffPageResult<BffMallProduct>>({
    url: appendQuery('/api/bff/mall/products', {
      keyword: params.keyword,
      categoryId: params.categoryId,
      recommendationId: params.recommendationId,
      couponId: params.couponId,
      sourceRefType: params.sourceRefType,
      sourceRefId: params.sourceRefId,
      sort: params.sort,
      page: params.page,
      size: params.size,
    }),
    method: 'GET',
  });
}

function resolveMallPageHasMore<TItem>(
  response: BffPageResult<TItem>,
  currentPage: number,
  pageSize: number,
) {
  if (typeof response.hasMore === 'boolean') return response.hasMore;
  if (typeof response.total === 'number' && response.total >= 0) return currentPage * pageSize < response.total;
  return (response.list?.length ?? 0) >= pageSize;
}

async function fetchAllBffMallPages<TItem, TParams extends { page?: number; size?: number }>(
  fetcher: (params: TParams) => Promise<BffPageResult<TItem>>,
  params: TParams,
  options: FetchAllBffMallPagesOptions = {},
) {
  const pageSize = Math.max(1, options.pageSize ?? params.size ?? DEFAULT_BFF_MALL_PAGE_SIZE);
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_BFF_MALL_MAX_PAGES);
  const maxItems = Math.max(pageSize, options.maxItems ?? pageSize * maxPages);
  const startPage = Math.max(1, params.page ?? 1);
  const list: TItem[] = [];
  let total: number | undefined;
  let fetchedPages = 0;
  let currentPage = startPage;
  let lastPageHasMore = false;

  while (fetchedPages < maxPages && list.length < maxItems) {
    const response = await fetcher({
      ...params,
      page: currentPage,
      size: pageSize,
    } as TParams);
    const pageItems = response.list ?? [];

    if (typeof response.total === 'number' && response.total >= 0) {
      total = response.total;
    }

    if (pageItems.length > 0) {
      list.push(...pageItems.slice(0, Math.max(0, maxItems - list.length)));
    }

    fetchedPages += 1;
    lastPageHasMore = resolveMallPageHasMore(response, currentPage, pageSize);

    if (pageItems.length === 0 || !lastPageHasMore || list.length >= maxItems) break;

    currentPage += 1;
  }

  return {
    list,
    total,
    page: startPage,
    size: pageSize,
    hasMore: lastPageHasMore && (list.length >= maxItems || fetchedPages >= maxPages),
  } satisfies BffPageResult<TItem>;
}

export function fetchAllBffMallCategories(
  params: FetchBffMallCategoriesParams = {},
  options?: FetchAllBffMallPagesOptions,
) {
  return fetchAllBffMallPages(fetchBffMallCategories, params, options);
}

export function fetchAllBffMallProducts(
  params: FetchBffMallProductsParams = {},
  options?: FetchAllBffMallPagesOptions,
) {
  return fetchAllBffMallPages(fetchBffMallProducts, params, options);
}

export function fetchAllBffMallRecommendations(
  params: FetchBffMallRecommendationsParams = {},
  options?: FetchAllBffMallPagesOptions,
) {
  return fetchAllBffMallPages(fetchBffMallRecommendations, params, options);
}

export function fetchAllBffMallAvailableGifts(
  params: FetchBffMallGiftsParams = {},
  options?: FetchAllBffMallPagesOptions,
) {
  return fetchAllBffMallPages(fetchBffMallAvailableGifts, params, options);
}

export function fetchBffMallProduct(spuId: string) {
  return request<BffMallProduct>({
    url: `/api/bff/mall/products/${encodeURIComponent(spuId)}`,
    method: 'GET',
  });
}

export function fetchBffMallRecommendations(params: FetchBffMallRecommendationsParams = {}) {
  return request<BffPageResult<BffMallRecommendation>>({
    url: appendQuery('/api/bff/mall/recommendations', {
      placement: params.placement,
      keyword: params.keyword,
      page: params.page,
      size: params.size,
    }),
    method: 'GET',
  });
}

export function fetchBffMallAvailableGifts(params: FetchBffMallGiftsParams = {}) {
  return request<BffPageResult<BffMallGiftRule>>({
    url: appendQuery('/api/bff/mall/gifts/available', {
      orderAmountCent: params.orderAmountCent,
      itemIds: params.itemIds,
      skuIds: params.skuIds,
      quantity: params.quantity,
      page: params.page,
      size: params.size,
    }),
    method: 'GET',
  });
}

// 查询商品详情页和评价列表页使用的真实商城评价。
export function fetchBffMallReviews(params: FetchBffMallReviewsParams) {
  return request<BffMallReviewsData>({
    url: appendQuery('/api/bff/mall/reviews', {
      productId: params.productId,
      page: params.page,
      size: params.size,
    }),
    method: 'GET',
  });
}

// 查询当前会员已提交的商城评价，用于订单待评价分流。
export function fetchBffMallMyReviews() {
  return request<BffMallMemberReviewsData>({
    url: '/api/bff/mall/reviews/mine',
    method: 'GET',
  });
}

// 查询当前登录用户真实收藏列表，商品是否失效由 BFF 结合商城可售状态返回。
export function fetchBffMallFavorites() {
  return request<BffMallFavoritesData>({
    url: '/api/bff/mall/favorites',
    method: 'GET',
  });
}

// 收藏当前商品，写接口必须携带 BFF 签名。
export function addBffMallFavorite(data: BffAddMallFavoriteRequest) {
  return request<BffMallFavoriteMutationResult, BffAddMallFavoriteRequest>({
    url: '/api/bff/mall/favorites',
    method: 'POST',
    data,
    sign: true,
  });
}

// 取消收藏当前商品，路径参数使用商品编号。
export function deleteBffMallFavorite(productId: string) {
  return request<BffMallFavoriteMutationResult>({
    url: `/api/bff/mall/favorites/${encodeURIComponent(productId)}`,
    method: 'DELETE',
    sign: true,
  });
}

// 查询当前登录用户真实购物车，前端不传任何用户身份字段。
export function fetchBffMallCart() {
  return request<BffMallCartData>({
    url: '/api/bff/mall/cart',
    method: 'GET',
  });
}

// 查询当前登录用户购物车数量，用于底部导航和角标。
export function fetchBffMallCartCount() {
  return request<BffMallCartCountData>({
    url: '/api/bff/mall/cart/count',
    method: 'GET',
  });
}

// 将商品 SKU 加入后端真实购物车，写接口必须携带 BFF 签名。
export function addBffMallCartItem(data: BffAddMallCartItemRequest) {
  return request<BffMallCartData, BffAddMallCartItemRequest>({
    url: '/api/bff/mall/cart/items',
    method: 'POST',
    data,
    sign: true,
  });
}

// 更新购物车项数量或勾选态，数量为 0 时后端会移除该项。
export function updateBffMallCartItem(itemId: string, data: BffUpdateMallCartItemRequest) {
  return request<BffMallCartData, BffUpdateMallCartItemRequest>({
    url: `/api/bff/mall/cart/items/${encodeURIComponent(itemId)}`,
    method: 'PATCH',
    data,
    sign: true,
  });
}

// 删除当前登录用户购物车中的指定项。
export function deleteBffMallCartItem(itemId: string) {
  return request<BffMallCartData>({
    url: `/api/bff/mall/cart/items/${encodeURIComponent(itemId)}`,
    method: 'DELETE',
    sign: true,
  });
}
