export interface HkpImageAsset {
  src: string;
  alt?: string;
}

export interface HkpProductSummary {
  id: string;
  title: string;
  subtitle?: string;
  image: HkpImageAsset;
  price: number;
  marketPrice?: number;
  tag?: string;
  salesText?: string;
}

export interface HkpOrderProduct {
  id: string;
  title: string;
  subtitle?: string;
  image: HkpImageAsset;
  skuText?: string;
  price: number;
  quantity: number;
}

export interface HkpOrderSummary {
  id: string;
  statusText: string;
  merchantName?: string;
  products: HkpOrderProduct[];
  totalAmount: number;
  countText?: string;
  primaryActionText?: string;
  secondaryActionText?: string;
}

export type HkpCouponStatus = 'available' | 'used' | 'expired' | 'disabled';

export interface HkpCouponSummary {
  id: string;
  title: string;
  amountText: string;
  thresholdText: string;
  validityText: string;
  status: HkpCouponStatus;
  tag?: string;
}

export interface HkpAddressSummary {
  id: string;
  name: string;
  mobile: string;
  region: string;
  detail: string;
  isDefault?: boolean;
  locationName?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  tag?: string;
}

export interface HkpFilterTab {
  key: string;
  text: string;
  count?: number;
}

export interface HkpSkuOption {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface HkpSkuGroup {
  id: string;
  title: string;
  options: HkpSkuOption[];
  selectedId?: string;
}

export interface HkpDateOption {
  date: string;
  title: string;
  subtitle?: string;
  disabled?: boolean;
}
