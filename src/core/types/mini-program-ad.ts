export type MiniProgramAdJumpType = 'currentMiniProgram' | 'otherMiniProgram' | 'h5' | 'custom';

export interface MiniProgramAdPageView {
  id?: string;
  pageCode?: string;
  pageName?: string;
  status?: string;
  sortOrder?: number;
}

export interface MiniProgramAdFieldConfigView {
  enabledFields?: string[];
  imageRules?: unknown;
}

export interface MiniProgramAdView {
  id?: string;
  adNo?: string;
  adCode?: string;
  adName?: string;
  pageId?: string;
  pageCode?: string;
  pageName?: string;
  slotId?: string;
  slotCode?: string;
  slotName?: string;
  title?: string;
  subtitle?: string;
  content?: string;
  badgeText?: string;
  richText?: string;
  richTextHtml?: string;
  imageUrl?: string;
  mobileImageUrl?: string;
  backgroundImage?: string;
  materialImage?: string;
  iconImage?: string;
  jumpType?: MiniProgramAdJumpType;
  jumpTarget?: string;
  jumpPath?: string;
  jumpMiniProgramAppId?: string;
  jumpAppId?: string;
  jumpUrl?: string;
  jumpCustomValue?: string;
  jumpParams?: Record<string, unknown>;
  status?: string;
  sortOrder?: number;
  effectiveAt?: string;
  expiredAt?: string;
  description?: string;
}

export interface MiniProgramAdSlotAdsView {
  id?: string;
  slotNo?: string;
  slotCode?: string;
  slotName?: string;
  pageId?: string;
  pageCode?: string;
  pageName?: string;
  status?: string;
  sortOrder?: number;
  fieldConfig?: MiniProgramAdFieldConfigView;
  description?: string;
  ads?: MiniProgramAdView[];
}

export interface MiniProgramAdPageAdsResponse {
  page?: MiniProgramAdPageView;
  slots?: MiniProgramAdSlotAdsView[];
}
