import { request } from '@/core/request';
import type {
  MiniProgramAdPageAdsResponse,
  MiniProgramAdSlotAdsView,
  MiniProgramAdView,
} from '@/core/types/mini-program-ad';

export const MINI_PROGRAM_AD_PAGE_CODES = {
  home: 'index',
} as const;

// 读取小程序页面广告聚合，先完成小程序授权并携带访问令牌；真实接口链路不吞异常，避免旧内容掩盖配置问题。
export function fetchMiniProgramPageAds(pagecode = MINI_PROGRAM_AD_PAGE_CODES.home) {
  return request<MiniProgramAdPageAdsResponse>({
    url: `/api/bff/content/mini-program/ads?pagecode=${encodeURIComponent(pagecode)}`,
    method: 'GET',
    showErrorToast: false,
  }).then((response) => ({
    page: response?.page,
    slots: response?.slots || [],
  }));
}

// 读取单个广告详情，用于首页内容项进入富文本详情时按后端广告 ID 回查正文。
export function fetchMiniProgramAdDetail(id: string) {
  return request<MiniProgramAdView>({
    url: `/api/bff/content/mini-program/ads/${encodeURIComponent(id)}`,
    method: 'GET',
    showErrorToast: false,
  });
}

// 按单个资源位直查可见广告，供首页“查看更多”列表页使用真实接口数据。
export function fetchMiniProgramSlotAds(slotCode: string) {
  return request<MiniProgramAdView[]>({
    url: `/api/bff/content/mini-program/slots/${encodeURIComponent(slotCode)}/ads`,
    method: 'GET',
    showErrorToast: false,
  }).then((ads) => (ads || [])
    .map((ad) => ({ ...ad, slotCode: ad.slotCode || slotCode }))
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0)));
}

// 按资源位编码读取广告列表，并统一按 sortOrder 从小到大排列。
export function findMiniProgramSlotAds(payload: MiniProgramAdPageAdsResponse | undefined, slotCodes: string[]) {
  const codeSet = new Set(slotCodes);
  return (payload?.slots || [])
    .filter((slot) => slot.slotCode && codeSet.has(slot.slotCode))
    .flatMap((slot) => (slot.ads || []).map((ad) => ({ ...ad, slotCode: slot.slotCode, slotName: slot.slotName })))
    .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0));
}

// 从广告里解析最适合小程序展示的图片地址。
export function resolveMiniProgramAdImage(ad?: MiniProgramAdView, preferred: 'background' | 'material' | 'icon' = 'background') {
  if (!ad) return undefined;
  const imageMap = {
    background: ad.backgroundImage || ad.imageUrl || ad.mobileImageUrl || ad.materialImage || ad.iconImage,
    material: ad.materialImage || ad.mobileImageUrl || ad.backgroundImage || ad.imageUrl || ad.iconImage,
    icon: ad.iconImage || ad.imageUrl || ad.backgroundImage || ad.materialImage || ad.mobileImageUrl,
  };
  return imageMap[preferred];
}

// 解析广告主标题，避免页面直接暴露后台字段差异。
export function resolveMiniProgramAdTitle(ad?: MiniProgramAdView) {
  return ad?.title || ad?.adName || ad?.content || '';
}

// 解析广告副标题，兼容 badge/content 两类运营录入口。
export function resolveMiniProgramAdDescription(ad?: MiniProgramAdView) {
  return ad?.subtitle || ad?.badgeText || ad?.content || '';
}

// 判断资源位是否有可用广告，方便页面决定是否覆盖静态兜底数据。
export function hasMiniProgramSlotAds(slot?: MiniProgramAdSlotAdsView) {
  return Boolean(slot?.ads?.length);
}
