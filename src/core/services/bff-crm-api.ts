import { request } from '@/core/request';

export type BffCrmGender = 'UNKNOWN' | 'MALE' | 'FEMALE' | string;
export type BffCrmP1ItemType = 'MALL' | 'COUPON' | 'EXCHANGE' | 'HOTEL' | 'SERVICE' | string;

export interface BffCrmProfile {
  nickName?: string;
  avatarUrl?: string;
  phone?: string;
  idCardNo?: string;
  birthday?: string;
  gender?: BffCrmGender;
  regionCode?: string;
  regionName?: string;
  carPlateNo?: string;
  onlineStoreUrl?: string;
  memberSchemeId?: string;
  memberSchemeName?: string;
  levelCode?: string;
  levelName?: string;
  levelNo?: number;
  badgeColor?: string;
  iconUrl?: string;
  growthValue?: number;
  nextLevelCode?: string;
  nextLevelName?: string;
  nextLevelGrowth?: number;
  pointsBalance?: number;
  couponCount?: number;
  favoriteCount?: number;
  distributionAmountCent?: number;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BffCrmProfileUpdateRequest {
  nickName?: string;
  avatarUrl?: string;
  phone?: string;
  idCardNo?: string;
  birthday?: string;
  gender?: BffCrmGender;
  regionCode?: string;
  regionName?: string;
  carPlateNo?: string;
  onlineStoreUrl?: string;
}

export interface BffCrmLevelRule {
  levelCode: string;
  levelName: string;
  levelNo: number;
  growthThreshold: number;
  badgeColor?: string;
  iconUrl?: string;
  sortOrder?: number;
  status?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BffCrmBenefit {
  benefitNo: string;
  levelCode: string;
  benefitType: string;
  benefitTitle: string;
  benefitSummary?: string;
  iconUrl?: string;
  highlightText?: string;
  sortOrder?: number;
  status?: string;
  startAt?: string;
  endAt?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BffCrmCenter {
  profile: BffCrmProfile;
  levels: BffCrmLevelRule[];
  benefits: BffCrmBenefit[];
}

export interface BffCrmAddress {
  addressNo: string;
  contactName: string;
  phone: string;
  provinceCode?: string;
  provinceName?: string;
  cityCode?: string;
  cityName?: string;
  districtCode?: string;
  districtName?: string;
  detailAddress: string;
  defaultAddress?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BffCrmAddressSaveRequest {
  addressNo?: string;
  contactName: string;
  phone: string;
  provinceCode?: string;
  provinceName?: string;
  cityCode?: string;
  cityName?: string;
  districtCode?: string;
  districtName?: string;
  detailAddress: string;
  defaultAddress?: boolean;
}

export interface BffCrmMemberCode {
  qrContent?: string;
  legacyBound?: boolean;
  updatedAt?: string;
}

export interface FetchBffCrmMemberCodeParams {
  // 给微信缓存层做防抖，避免在动态码场景下出现旧响应复用。
  cacheBuster?: number;
}

export interface BffCrmLegacyBindResult {
  phone?: string;
  bound?: boolean;
  message?: string;
  updatedAt?: string;
}

export interface BffCrmLegacyBindRequest {
  code: string;
}

export interface BffCrmP1ConfigItem {
  itemNo: string;
  itemType: BffCrmP1ItemType;
  itemName: string;
  subtitle?: string;
  imageUrl?: string;
  linkType?: string;
  linkTarget?: string;
  priceCent?: number;
  originalPriceCent?: number;
  pointsCost?: number;
  stockTotal?: number;
  stockAvailable?: number;
  badgeText?: string;
  tagText?: string;
  sortOrder?: number;
  status?: string;
  startAt?: string;
  endAt?: string;
  extraPayload?: string;
  templateNo?: string;
  couponTemplateId?: string;
  exchangeCode?: string;
  couponQuantity?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BffCrmGrowthMember {
  levelId?: string;
  growthValue?: number;
}

export interface BffCrmGrowthLevel {
  id: string;
  levelNo: number;
  name: string;
  growthThreshold: number;
  themeColor?: string;
}

export interface BffCrmGrowthRuleSection {
  id: string;
  title: string;
  content: string;
}

export interface BffCrmGrowthRecord {
  id: string;
  title: string;
  value: number;
  time: string;
}

export interface BffCrmGrowth {
  backgroundImageSrc?: string;
  avatarImageSrc?: string;
  member?: BffCrmGrowthMember;
  levels?: BffCrmGrowthLevel[];
  levelRuleIntro?: string[];
  growthRuleSections?: BffCrmGrowthRuleSection[];
  growthRecords?: BffCrmGrowthRecord[];
}

export function fetchBffCrmCenter() {
  return request<BffCrmCenter>({
    url: '/api/bff/crm/center',
    method: 'GET',
  });
}

// 查询成长值聚合数据，返回等级说明、规则分段和最近流水。
export function fetchBffCrmGrowth() {
  return request<BffCrmGrowth>({
    url: '/api/bff/crm/growth',
    method: 'GET',
  });
}

// 查询成长值流水列表，供成长值明细页独立刷新真实记录。
export function fetchBffCrmGrowthRecords() {
  return request<BffCrmGrowthRecord[]>({
    url: '/api/bff/crm/growth/records',
    method: 'GET',
  });
}

export function fetchBffCrmProfile() {
  return request<BffCrmProfile>({
    url: '/api/bff/crm/profile',
    method: 'GET',
  });
}

export function updateBffCrmProfile(data: BffCrmProfileUpdateRequest) {
  return request<BffCrmProfile, BffCrmProfileUpdateRequest>({
    url: '/api/bff/crm/profile',
    method: 'POST',
    data,
    sign: true,
  });
}

export function fetchBffCrmAddresses() {
  return request<BffCrmAddress[]>({
    url: '/api/bff/crm/addresses',
    method: 'GET',
  });
}

export function saveBffCrmAddress(data: BffCrmAddressSaveRequest) {
  return request<BffCrmAddress, BffCrmAddressSaveRequest>({
    url: '/api/bff/crm/addresses',
    method: 'POST',
    data,
    sign: true,
  });
}

export function deleteBffCrmAddress(addressNo: string) {
  return request<void, { addressNo: string }>({
    url: '/api/bff/crm/addresses/delete',
    method: 'POST',
    data: { addressNo },
    sign: true,
  });
}

export function setDefaultBffCrmAddress(addressNo: string) {
  return request<BffCrmAddress, { addressNo: string }>({
    url: '/api/bff/crm/addresses/default',
    method: 'POST',
    data: { addressNo },
    sign: true,
  });
}

export function fetchBffCrmMemberCode(params?: FetchBffCrmMemberCodeParams) {
  return request<BffCrmMemberCode>({
    url: '/api/bff/crm/member-code',
    method: 'GET',
    header: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    data: params,
  });
}

export function bindBffCrmLegacyMember(code: string) {
  return request<BffCrmLegacyBindResult, BffCrmLegacyBindRequest>({
    url: '/api/bff/crm/legacy-bind',
    method: 'POST',
    data: { code },
    sign: true,
  });
}

export function fetchBffCrmP1Mall() {
  return request<BffCrmP1ConfigItem[]>({
    url: '/api/bff/crm/entries/mall',
    method: 'GET',
  });
}

export function fetchBffCrmP1Coupons() {
  return request<BffCrmP1ConfigItem[]>({
    url: '/api/bff/crm/entries/coupons',
    method: 'GET',
  });
}

export function fetchBffCrmP1Exchanges() {
  return request<BffCrmP1ConfigItem[]>({
    url: '/api/bff/crm/entries/exchanges',
    method: 'GET',
  });
}

export function fetchBffCrmP1Hotels() {
  return request<BffCrmP1ConfigItem[]>({
    url: '/api/bff/crm/entries/hotels',
    method: 'GET',
  });
}

export function fetchBffCrmP1Services() {
  return request<BffCrmP1ConfigItem[]>({
    url: '/api/bff/crm/entries/services',
    method: 'GET',
  });
}

export function fetchBffCrmP1Item(itemNo: string) {
  return request<BffCrmP1ConfigItem>({
    url: `/api/bff/crm/entries/items/${encodeURIComponent(itemNo)}`,
    method: 'GET',
  });
}
