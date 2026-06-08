import {
  fetchMiniProgramAdDetail,
  fetchMiniProgramSlotAds,
  resolveMiniProgramAdDescription,
  resolveMiniProgramAdImage,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';
import type { MiniProgramAdView } from '@/core/types/mini-program-ad';

export interface TicketActivityListItem {
  id: string;
  title: string;
  description: string;
  dateText: string;
  imageSrc: string;
}

export interface TicketActivityListData {
  items: TicketActivityListItem[];
}

export interface TicketActivityDetail {
  id: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  richTextHtml: string;
}

export interface TicketActivityDetailData {
  activity: TicketActivityDetail;
}

const DEFAULT_ACTIVITY_SLOT_CODE = 'index_activity';

// 格式化后端有效期字段，用于列表卡片底部日期展示。
function formatActivityDate(value?: string) {
  const matchedDate = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return matchedDate ? `${matchedDate[1]}-${matchedDate[2]}-${matchedDate[3]}` : value || '';
}

// 将广告有效期转换成列表日期文案，缺失时回落到运营配置的徽标。
function resolveActivityDateText(ad: MiniProgramAdView) {
  const startDate = formatActivityDate(ad.effectiveAt);
  const endDate = formatActivityDate(ad.expiredAt);
  if (startDate && endDate && startDate !== endDate) return `${startDate} 至 ${endDate}`;
  return startDate || endDate || ad.badgeText || '';
}

// 将资源位广告转换为活动列表模型，列表页只消费端内稳定字段。
function mapAdToActivityListItem(ad: MiniProgramAdView, index: number): TicketActivityListItem {
  return {
    id: ad.id || ad.adNo || ad.adCode || `activity-${index}`,
    title: resolveMiniProgramAdTitle(ad) || '乐园资讯',
    description: resolveMiniProgramAdDescription(ad),
    dateText: resolveActivityDateText(ad),
    imageSrc: resolveMiniProgramAdImage(ad, 'material') || resolveMiniProgramAdImage(ad, 'background') || '',
  };
}

// 将后台广告详情转换为当前资讯详情页可直接渲染的领域模型。
function mapAdToActivityDetail(ad: MiniProgramAdView): TicketActivityDetail {
  const imageSrc = resolveMiniProgramAdImage(ad, 'material') || resolveMiniProgramAdImage(ad, 'background') || '';
  const richTextHtml = ad.richTextHtml || ad.richText || '';
  return {
    id: ad.id || ad.adNo || '',
    title: resolveMiniProgramAdTitle(ad) || '乐园资讯',
    subtitle: resolveMiniProgramAdDescription(ad),
    imageSrc,
    richTextHtml,
  };
}

// 按首页传入的资源位编码获取活动/推荐列表，不再回退旧本地 mock 数据。
export async function fetchActivityListData(slotCode = DEFAULT_ACTIVITY_SLOT_CODE): Promise<TicketActivityListData> {
  const ads = await fetchMiniProgramSlotAds(slotCode);
  return { items: ads.map(mapAdToActivityListItem) };
}

// 获取精选活动详情，详情正文由接口富文本承载；进入真实广告详情接口后不回退旧本地内容，避免掩盖接口问题。
export async function fetchActivityDetailData(activityId = '') {
  if (!activityId) throw new Error('缺少广告详情 ID');

  const adDetail = await fetchMiniProgramAdDetail(activityId);
  if (adDetail?.id || adDetail?.adNo) {
    return { activity: mapAdToActivityDetail(adDetail) };
  }

  throw new Error('未获取到广告详情内容');
}
