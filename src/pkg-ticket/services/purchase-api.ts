import { request } from '@/core/request';

export interface PurchaseMenuApiItem {
  menuNo?: string;
  sceneType?: string;
  menuName?: string;
  subtitle?: string;
  imageUrl?: string;
  priceCent?: number;
  originalPriceCent?: number;
  badgeText?: string;
  sortOrder?: number;
  status?: string;
  holidayAvailable?: boolean;
  startAt?: string;
  endAt?: string;
  description?: string;
}

export interface CmsResourceSlotApiItem {
  slotNo?: string;
  sceneType?: string;
  pageCode?: string;
  slotCode?: string;
  slotName?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  linkType?: string;
  linkTarget?: string;
  sortOrder?: number;
  status?: string;
  holidayAvailable?: boolean;
  startAt?: string;
  endAt?: string;
  description?: string;
}

export interface FetchPurchaseResourceOptions {
  sceneType?: string;
  pageCode?: string;
}

const PURCHASE_SCENE_TYPE = 'TICKET';
const PURCHASE_PAGE_CODE = 'PURCHASE_HOME';

// 拉取后端公开购票列表，展示 GET 显式不等待登录态。
export function fetchPurchaseMenus(sceneType = PURCHASE_SCENE_TYPE) {
  return request<PurchaseMenuApiItem[]>({
    url: `/api/bff/purchase/menus?sceneType=${encodeURIComponent(sceneType)}`,
    method: 'GET',
    auth: 'none',
    showErrorToast: false,
  });
}

// 拉取后端公开购票详情，供详情页或下单链路按需复用。
export function fetchPurchaseMenuDetail(menuNo: string) {
  return request<PurchaseMenuApiItem>({
    url: `/api/bff/purchase/menus/${encodeURIComponent(menuNo)}`,
    method: 'GET',
    auth: 'none',
    showErrorToast: false,
  });
}

// 拉取购票页 CMS 资源位，展示 GET 显式不等待登录态。
export function fetchPurchaseResources(options: FetchPurchaseResourceOptions = {}) {
  const sceneType = options.sceneType || PURCHASE_SCENE_TYPE;
  const pageCode = options.pageCode || PURCHASE_PAGE_CODE;

  return request<CmsResourceSlotApiItem[]>({
    url: `/api/bff/cms/resources?sceneType=${encodeURIComponent(sceneType)}&pageCode=${encodeURIComponent(pageCode)}`,
    method: 'GET',
    auth: 'none',
    showErrorToast: false,
  });
}

// 拉取单个 CMS 资源位，供后续页面按资源位稳定 key 查询。
export function fetchCmsResourceSlot(slotCode: string) {
  return request<CmsResourceSlotApiItem>({
    url: `/api/bff/cms/resources/${encodeURIComponent(slotCode)}`,
    method: 'GET',
    auth: 'none',
    showErrorToast: false,
  });
}
