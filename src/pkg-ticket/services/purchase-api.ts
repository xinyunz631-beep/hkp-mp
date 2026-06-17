import { request } from '@/core/request';

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

// 拉取购票页资源位，先完成小程序授权并携带访问令牌。
export function fetchPurchaseResources(options: FetchPurchaseResourceOptions = {}) {
  const sceneType = options.sceneType || PURCHASE_SCENE_TYPE;
  const pageCode = options.pageCode || PURCHASE_PAGE_CODE;

  return request<CmsResourceSlotApiItem[]>({
    url: `/api/bff/purchase/resources?sceneType=${encodeURIComponent(sceneType)}&pageCode=${encodeURIComponent(pageCode)}`,
    method: 'GET',
    showErrorToast: false,
  });
}

// 拉取单个 CMS 资源位；后端已要求登录态，不再按公开接口调用。
export function fetchCmsResourceSlot(slotCode: string) {
  return request<CmsResourceSlotApiItem>({
    url: `/api/bff/cms/resources/${encodeURIComponent(slotCode)}`,
    method: 'GET',
    showErrorToast: false,
  });
}
