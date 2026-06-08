import {
  fetchMiniProgramSlotAds,
  resolveMiniProgramAdDescription,
  resolveMiniProgramAdImage,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';
import type { MiniProgramAdView } from '@/core/types/mini-program-ad';

export interface TicketParkListTab {
  id: string;
  title: string;
}

export interface TicketParkListItem {
  id: string;
  tabId: string;
  title: string;
  imageSrc: string;
  locationText: string;
  likeCount: number;
  statusText: string;
}

export interface TicketParkListData {
  tabs: TicketParkListTab[];
  items: TicketParkListItem[];
}

const DEFAULT_PARK_SLOT_CODE = 'index_hot_project';
const DEFAULT_PARK_TAB_ID = 'all';

// 将资源位广告转换为热玩列表卡片模型，保持页面消费字段稳定。
function mapAdToParkListItem(ad: MiniProgramAdView, index: number): TicketParkListItem {
  return {
    id: ad.id || ad.adNo || ad.adCode || `park-${index}`,
    tabId: DEFAULT_PARK_TAB_ID,
    title: resolveMiniProgramAdTitle(ad) || '热玩项目',
    imageSrc: resolveMiniProgramAdImage(ad, 'material') || resolveMiniProgramAdImage(ad, 'background') || '',
    locationText: resolveMiniProgramAdDescription(ad) || ad.slotName || 'Hello Kitty 乐园',
    likeCount: 0,
    statusText: ad.badgeText || ad.description || '开放情况，以现场为准',
  };
}

// 按首页传入的资源位编码获取热玩列表，不再回退旧本地 mock 数据。
export async function fetchParkListData(slotCode = DEFAULT_PARK_SLOT_CODE): Promise<TicketParkListData> {
  const ads = await fetchMiniProgramSlotAds(slotCode);
  return {
    tabs: [{ id: DEFAULT_PARK_TAB_ID, title: '全部' }],
    items: ads.map(mapAdToParkListItem),
  };
}
