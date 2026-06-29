import {
  fetchMiniProgramPageAds,
  findMiniProgramSlotAds,
  MINI_PROGRAM_AD_PAGE_CODES,
  resolveMiniProgramAdImage,
} from '@/core/services/mini-program-ad';
import type { MiniProgramAdPageAdsResponse } from '@/core/types/mini-program-ad';

export const MEMBER_CODE_THEME_SLOT_CODES = {
  background: 'member_code_background',
  logo: 'member_code_logo',
} as const;

export interface MemberCodeThemeConfig {
  backgroundImageUrl?: string;
  logoImageUrl?: string;
}

// 从后台“小程序广告”配置解析会员码页主题图，页面不再写死素材地址。
export function resolveMemberCodeThemeConfig(
  payload: MiniProgramAdPageAdsResponse | undefined,
): MemberCodeThemeConfig {
  const backgroundAd = findMiniProgramSlotAds(payload, [MEMBER_CODE_THEME_SLOT_CODES.background])[0];
  const logoAd = findMiniProgramSlotAds(payload, [MEMBER_CODE_THEME_SLOT_CODES.logo])[0];

  return {
    backgroundImageUrl: resolveMiniProgramAdImage(backgroundAd, 'background'),
    logoImageUrl: resolveMiniProgramAdImage(logoAd, 'material') || resolveMiniProgramAdImage(logoAd, 'background'),
  };
}

export async function fetchMemberCodeThemeConfig(): Promise<MemberCodeThemeConfig> {
  const payload = await fetchMiniProgramPageAds(MINI_PROGRAM_AD_PAGE_CODES.memberCode);
  return resolveMemberCodeThemeConfig(payload);
}
