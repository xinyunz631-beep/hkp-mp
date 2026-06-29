import { request } from '@/core/request';
import type {
  MiniProgramAdDetailView,
  MiniProgramAdPageAdsResponse,
  MiniProgramAdSlotAdsView,
  MiniProgramAdView,
} from '@/core/types/mini-program-ad';

export const MINI_PROGRAM_AD_PAGE_CODES = {
  home: 'index',
  ticket: 'ticket',
  memberCode: 'member_code',
} as const;

type MiniProgramAdSlotMapResponse = Record<string, MiniProgramAdView[] | undefined | null>;
type MiniProgramAdPageAdsApiResponse = MiniProgramAdPageAdsResponse | MiniProgramAdSlotMapResponse | undefined | null;
type MiniProgramAdSlotAdsApiResponse = MiniProgramAdView[] | MiniProgramAdSlotAdsView | MiniProgramAdPageAdsResponse | MiniProgramAdSlotMapResponse | {
  data?: unknown;
  ads?: unknown;
  items?: unknown;
  list?: unknown;
  records?: unknown;
} | undefined | null;

function isMiniProgramAdPageAdsResponse(
  response: MiniProgramAdPageAdsApiResponse,
): response is MiniProgramAdPageAdsResponse {
  return Boolean(response && typeof response === 'object' && ('page' in response || 'slots' in response));
}

function normalizeMiniProgramAdSlotMap(
  response: MiniProgramAdSlotMapResponse,
  pagecode: string,
): MiniProgramAdPageAdsResponse {
  const slots = Object.entries(response)
    .filter(([, ads]) => Array.isArray(ads))
    .map(([slotCode, ads], index): MiniProgramAdSlotAdsView => {
      const safeAds = (ads || []).filter((ad): ad is MiniProgramAdView => Boolean(ad));
      const firstAd = safeAds[0];
      const slotName = firstAd?.slotName || slotCode;

      return {
        id: firstAd?.slotId || slotCode,
        slotCode,
        slotName,
        pageId: firstAd?.pageId,
        pageCode: firstAd?.pageCode || pagecode,
        pageName: firstAd?.pageName,
        status: 'ENABLED',
        sortOrder: index,
        ads: safeAds.map((ad) => ({
          ...ad,
          slotCode: ad.slotCode || slotCode,
          slotName: ad.slotName || slotName,
          pageCode: ad.pageCode || pagecode,
        })),
      };
    });

  return {
    page: { pageCode: pagecode },
    slots,
  };
}

function normalizeMiniProgramPageAds(
  response: MiniProgramAdPageAdsApiResponse,
  pagecode: string,
): MiniProgramAdPageAdsResponse {
  if (!response) {
    return { page: { pageCode: pagecode }, slots: [] };
  }

  if (isMiniProgramAdPageAdsResponse(response)) {
    return {
      page: response.page || { pageCode: pagecode },
      slots: response.slots || [],
    };
  }

  return normalizeMiniProgramAdSlotMap(response, pagecode);
}

function toMiniProgramAdArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is MiniProgramAdView => Boolean(item && typeof item === 'object'))
    : [];
}

function normalizeMiniProgramSlotAds(response: MiniProgramAdSlotAdsApiResponse, slotCode: string): MiniProgramAdView[] {
  if (Array.isArray(response)) return toMiniProgramAdArray(response);
  if (!response || typeof response !== 'object') return [];

  const objectResponse = response as Record<string, unknown>;
  const nestedData = objectResponse.data;
  if (nestedData !== undefined && nestedData !== response) {
    const nestedAds = normalizeMiniProgramSlotAds(nestedData as MiniProgramAdSlotAdsApiResponse, slotCode);
    if (nestedAds.length) return nestedAds;
  }

  const directAds = toMiniProgramAdArray(objectResponse.ads);
  if (directAds.length) return directAds;

  const pagedAds = toMiniProgramAdArray(objectResponse.items)
    .concat(toMiniProgramAdArray(objectResponse.records))
    .concat(toMiniProgramAdArray(objectResponse.list));
  if (pagedAds.length) return pagedAds;

  const slots = Array.isArray(objectResponse.slots) ? objectResponse.slots as MiniProgramAdSlotAdsView[] : [];
  const matchedSlot = slots.find((slot) => slot.slotCode === slotCode) || slots[0];
  const matchedSlotAds = toMiniProgramAdArray(matchedSlot?.ads);
  if (matchedSlotAds.length) return matchedSlotAds;

  const slotMapAds = toMiniProgramAdArray(objectResponse[slotCode]);
  if (slotMapAds.length) return slotMapAds;

  return [];
}

// 读取小程序页面广告聚合，先完成小程序授权并携带访问令牌；真实接口链路不吞异常，避免旧内容掩盖配置问题。
export function fetchMiniProgramPageAds(pagecode: string = MINI_PROGRAM_AD_PAGE_CODES.home) {
  return request<MiniProgramAdPageAdsApiResponse>({
    url: `/api/bff/content/mini-program/ads?pagecode=${encodeURIComponent(pagecode)}`,
    method: 'GET',
    showErrorToast: false,
  }).then((response) => normalizeMiniProgramPageAds(response, pagecode));
}

// 读取单个广告详情，用于首页内容项进入富文本详情时按后端广告 ID 回查正文。
export function fetchMiniProgramAdDetail(id: string) {
  return request<MiniProgramAdDetailView>({
    url: `/api/bff/content/mini-program/ads/${encodeURIComponent(id)}`,
    method: 'GET',
    showErrorToast: false,
  });
}

// 按单个资源位直查可见广告，供首页“查看更多”列表页使用真实接口数据。
export function fetchMiniProgramSlotAds(slotCode: string) {
  return request<MiniProgramAdSlotAdsApiResponse>({
    url: `/api/bff/content/mini-program/slots/${encodeURIComponent(slotCode)}/ads`,
    method: 'GET',
    showErrorToast: false,
  }).then((response) => normalizeMiniProgramSlotAds(response, slotCode)
    .map((ad) => ({ ...ad, slotCode: ad.slotCode || slotCode }))
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0)));
}

// 按资源位编码读取广告列表，并统一按 sortOrder 从小到大排列。
export function findMiniProgramSlotAds(payload: MiniProgramAdPageAdsResponse | undefined, slotCodes: string[]) {
  const codeSet = new Set(slotCodes);
  return (payload?.slots || [])
    .filter((slot) => slot.slotCode && codeSet.has(slot.slotCode))
    .flatMap((slot) => (slot.ads || []).map((ad) => ({
      ...ad,
      slotCode: slot.slotCode || ad.slotCode,
      slotName: slot.slotName || ad.slotName,
    })))
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
}

// 从广告里解析最适合小程序展示的图片地址。
export function resolveMiniProgramAdImage(ad?: MiniProgramAdView, preferred: 'background' | 'material' | 'icon' = 'background') {
  if (!ad) return undefined;
  const imageMap = {
    background: ad.backgroundImage || ad.imageUrl || ad.imageUrls?.[0] || ad.mobileImageUrl || ad.materialImage || ad.iconImage,
    material: ad.materialImage || ad.imageUrl || ad.imageUrls?.[0] || ad.mobileImageUrl || ad.backgroundImage || ad.iconImage,
    icon: ad.iconImage || ad.imageUrl || ad.imageUrls?.[0] || ad.backgroundImage || ad.materialImage || ad.mobileImageUrl,
  };
  return imageMap[preferred];
}

// 解析广告主标题，避免页面直接暴露后台字段差异。
export function resolveMiniProgramAdTitle(ad?: MiniProgramAdView) {
  return ad?.title || ad?.adName || ad?.content || '';
}

// 解析广告副标题，兼容 badge/content 两类运营录入口。
export function resolveMiniProgramAdDescription(ad?: MiniProgramAdView) {
  return ad?.subtitle || ad?.subTitle || ad?.badgeText || ad?.content || '';
}

// 判断资源位是否有可用广告，方便页面决定是否渲染该运营资源位。
export function hasMiniProgramSlotAds(slot?: MiniProgramAdSlotAdsView) {
  return Boolean(slot?.ads?.length);
}
