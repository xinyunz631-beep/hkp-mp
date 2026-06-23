import type { HkpAddressSummary, HkpCouponSummary, HkpFilterTab, HkpOrderSummary } from '@/core/types/hkp';

export interface OrderHomeTabData {
  key: string;
  text: string;
  count?: number;
}

export interface OrderHomeActionData {
  text: string;
  tone?: 'default' | 'primary' | 'danger';
}

export interface OrderHomeItemData {
  id: string;
  orderId?: string;
  itemId?: string;
  title: string;
  subtitle?: string;
  extraText?: string;
  imageSrc: string;
  quantity: number;
  priceText: string;
  actionText: string;
  actions?: OrderHomeActionData[];
}

export interface OrderHomeSectionData {
  id: string;
  tabKey: string;
  dateText: string;
  statusText: string;
  totalText: string;
  items: OrderHomeItemData[];
}

export interface OrderHomeData {
  tabs: OrderHomeTabData[];
  sections: OrderHomeSectionData[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface OrderCheckoutProductData {
  id: string;
  title: string;
  specText: string;
  quantity: number;
  priceText: string;
  imageSrc: string;
  giftText?: string;
  canRefund?: boolean;
  canAfterSale?: boolean;
}

export interface OrderCheckoutData {
  draftId?: string;
  merchantName?: string;
  address?: HkpAddressSummary;
  requiresAddress: boolean;
  paymentMethodText: string;
  products: OrderCheckoutProductData[];
  shippingText: string;
  canSubmit?: boolean;
  deliveryErrors?: string[];
  couponText: string;
  couponNoticeText?: string;
  selectedCouponId?: string;
  coupons: HkpCouponSummary[];
  discountText: string;
  amountFields: OrderDetailFieldData[];
  freightAmount: number;
  totalAmount: number;
  amountReady?: boolean;
  discountAmount: number;
}

export interface OrderAddressData {
  addresses: HkpAddressSummary[];
  maxCount: number;
}

export interface OrderDetailFieldData {
  label: string;
  value: string;
}

export interface OrderDetailCouponLinkData {
  couponNo: string;
  detailText?: string;
}

export interface OrderDetailCouponFieldData extends OrderDetailFieldData {
  couponLinks?: OrderDetailCouponLinkData[];
}

export interface OrderDetailSceneActionData {
  text: string;
  route?: string;
  actionType?: 'navigate' | 'confirmReceive';
  tone?: 'default' | 'primary';
}

export interface OrderTicketInstanceData {
  ticketNo: string;
  qrCodePayload: string;
  qrImageSrc?: string;
  productName: string;
  skuName: string;
  statusText: string;
  visitDate: string;
  validTimeText: string;
  useTimesText: string;
}

export interface OrderDetailData {
  id: string;
  sceneType?: string;
  orderStatus?: string;
  updatedAt?: string;
  statusVersion?: number;
  payNo?: string;
  paymentStatus?: string;
  statusText: string;
  paidAmountText: string;
  primaryActionType?: 'pay' | 'aftersale' | 'refund' | 'none';
  payExpireAt?: string;
  title: string;
  quantityText: string;
  productFields: OrderDetailFieldData[];
  ticketInstances: OrderTicketInstanceData[];
  fulfillmentFields: OrderDetailFieldData[];
  couponFields: OrderDetailCouponFieldData[];
  contactFields: OrderDetailFieldData[];
  sceneActions: OrderDetailSceneActionData[];
  amountFields: OrderDetailFieldData[];
  orderFields: OrderDetailFieldData[];
  refundButtonText: string;
  aftersaleEntryRoute?: string;
  aftersaleEntryText?: string;
}

export interface OrderLogisticsTraceItem {
  id: string;
  timeText: string;
  detailText: string;
}

export interface OrderLogisticsData {
  productImageSrc: string;
  statusText: string;
  companyText: string;
  trackingNumberText: string;
  hotlineText: string;
  quantityText: string;
  totalAmountText: string;
  confirmButtonText?: string;
  traces: OrderLogisticsTraceItem[];
}

export interface OrderCancelData {
  order: HkpOrderSummary;
  reasons: string[];
  tips: string[];
  submitButtonText: string;
}

export interface OrderReviewCreateTagData {
  key: string;
  text: string;
}

export interface OrderReviewCreateImageData {
  id: string;
  src: string;
}

export interface OrderReviewCreateData {
  orderId: string;
  itemId: string;
  productImageSrc: string;
  productTitle: string;
  hintText: string;
  rating?: number;
  tags: OrderReviewCreateTagData[];
  defaultTagKey: string;
  placeholderText: string;
  maxLength: number;
  images: OrderReviewCreateImageData[];
  anonymousText: string;
  submitButtonText: string;
  unavailableReason?: string;
}

export interface OrderReviewItemData {
  id: string;
  userName: string;
  avatarSrc: string;
  rating?: number;
  tags: string[];
  timeText: string;
  content: string;
  imageSrcs: string[];
}

export interface OrderReviewListData {
  filters: OrderReviewCreateTagData[];
  reviews: OrderReviewItemData[];
  page: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
  unavailableReason?: string;
}

export interface OrderAftersaleTypeOptionData {
  key: string;
  title: string;
  desc: string;
  amountText: string;
  tagText?: string;
}

export interface OrderAftersaleTypeData {
  order: HkpOrderSummary;
  tipText: string;
  types: OrderAftersaleTypeOptionData[];
}

export interface OrderAftersaleApplyData {
  order: HkpOrderSummary;
  selectedTypeText: string;
  reasons: string[];
  defaultReason: string;
  refundAmountText: string;
  contactName: string;
  contactMobile: string;
  placeholderText: string;
  uploadHintText: string;
  serviceTipText: string;
  submitButtonText: string;
}

export interface OrderAftersaleRecordData {
  id: string;
  tabKey: string;
  serviceNo: string;
  typeText: string;
  statusText: string;
  statusDesc: string;
  amountText: string;
  createdAt: string;
  buttonText: string;
  order: HkpOrderSummary;
}

export interface OrderAftersaleListData {
  tabs: HkpFilterTab[];
  records: OrderAftersaleRecordData[];
  couponFields: OrderDetailCouponFieldData[];
  unavailableReason?: string;
}

export interface OrderAftersaleProgressStepData {
  id: string;
  title: string;
  timeText: string;
  detailText?: string;
}

export interface OrderAftersaleFieldData {
  label: string;
  value: string;
}

export interface OrderAftersaleProgressData {
  order: HkpOrderSummary;
  serviceNo: string;
  typeText: string;
  statusText: string;
  statusDesc: string;
  refundAmountText: string;
  reasonText: string;
  couponFields: OrderDetailCouponFieldData[];
  fields: OrderAftersaleFieldData[];
  progress: OrderAftersaleProgressStepData[];
  primaryButtonText: string;
  unavailableReason?: string;
}
