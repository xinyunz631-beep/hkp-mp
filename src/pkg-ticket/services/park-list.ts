import {
  fetchMiniProgramSlotAds,
  resolveMiniProgramAdDescription,
  resolveMiniProgramAdImage,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';
import type { MiniProgramAdView } from '@/core/types/mini-program-ad';
import {
  resolveMiniProgramAdNumberParam,
  resolveMiniProgramAdStringParam,
} from './mini-program-ad-jump-params';

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
const PARK_LIST_TABS: TicketParkListTab[] = [
  { id: 'ride', title: '游乐设施' },
  { id: 'show', title: '演出' },
];

// 把历史项目类型转换成页面 tab，缺失分类时按标题和正文关键词兜底。
function resolveParkListTabId(ad: MiniProgramAdView) {
  const legacyType = resolveMiniProgramAdStringParam(ad, 'legacyType');
  if (legacyType === 'show') return 'show';
  if (legacyType === 'ride') return 'ride';

  const searchText = [ad.title, ad.adName, ad.description, ad.richText, ad.richTextHtml].filter(Boolean).join(' ');
  return /演出|剧场|剧目|巡游|音乐剧|人偶剧|儿童剧/.test(searchText) ? 'show' : 'ride';
}

// 解析历史喜欢数，接口未提供时保持 0，避免展示异常数字。
function resolveLegacyLikeCount(ad: MiniProgramAdView) {
  return resolveMiniProgramAdNumberParam(ad, 'likeCount');
}

// 将资源位广告转换为热玩列表卡片模型，保持页面消费字段稳定。
function mapAdToParkListItem(ad: MiniProgramAdView, index: number): TicketParkListItem {
  const legacyLocation = resolveMiniProgramAdStringParam(ad, 'legacyLocation');
  const legacyStatus = resolveMiniProgramAdStringParam(ad, 'legacyStatus');

  return {
    id: ad.id || ad.adNo || ad.adCode || `park-${index}`,
    tabId: resolveParkListTabId(ad),
    title: resolveMiniProgramAdTitle(ad) || '热玩项目',
    imageSrc: resolveMiniProgramAdImage(ad, 'material') || resolveMiniProgramAdImage(ad, 'background') || '',
    locationText: legacyLocation || resolveMiniProgramAdDescription(ad) || ad.slotName || 'Hello Kitty 乐园',
    likeCount: resolveLegacyLikeCount(ad),
    statusText: legacyStatus || ad.badgeText || ad.description || '开放情况，以现场为准',
  };
}

// 按首页传入的资源位编码获取热玩列表，不再回退旧本地静态数据。
export async function fetchParkListData(slotCode = DEFAULT_PARK_SLOT_CODE): Promise<TicketParkListData> {
  const ads = await fetchMiniProgramSlotAds(slotCode);
  return {
    tabs: PARK_LIST_TABS,
    items: ads.map(mapAdToParkListItem),
  };
}
