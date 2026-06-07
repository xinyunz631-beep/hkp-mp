import { request } from '@/core/request';
import type {
  MiniProgramAdPageAdsResponse,
  MiniProgramAdSlotAdsView,
  MiniProgramAdView,
} from '@/core/types/mini-program-ad';

export const MINI_PROGRAM_AD_PAGE_CODES = {
  home: 'index',
} as const;

// 读取小程序页面广告聚合，公开接口失败时返回空结构，不阻断页面首屏。
export function fetchMiniProgramPageAds(pagecode = MINI_PROGRAM_AD_PAGE_CODES.home) {
  return new Promise<MiniProgramAdPageAdsResponse>((resolve) => {
    request<MiniProgramAdPageAdsResponse>({
      url: `/api/bff/content/mini-program/ads?pagecode=${encodeURIComponent(pagecode)}`,
      method: 'GET',
      auth: 'none',
      showErrorToast: false,
    })
      .then((response) => {
        resolve({
          page: response?.page,
          slots: response?.slots || [],
        });
      })
      .catch(() => {
        resolve({ slots: [] });
      });
  });
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
