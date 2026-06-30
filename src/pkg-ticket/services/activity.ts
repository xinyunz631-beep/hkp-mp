import {
  fetchMiniProgramAdDetail,
  fetchMiniProgramSlotAds,
  resolveMiniProgramAdDescription,
  resolveMiniProgramAdImage,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';
import type { MiniProgramAdView } from '@/core/types/mini-program-ad';
import activityBannerBusiness from '@/assets/activity-banners/business.jpg';
import activityBannerEat from '@/assets/activity-banners/eat.jpg';
import activityBannerEntertainment from '@/assets/activity-banners/entertainment.jpg';
import activityBannerLove from '@/assets/activity-banners/love.jpg';
import activityBannerPlay from '@/assets/activity-banners/play.jpg';
import activityBannerShopping from '@/assets/activity-banners/shopping.jpg';
import activityBannerStay from '@/assets/activity-banners/stay.jpg';
import activityBannerStudy from '@/assets/activity-banners/study.jpg';
import activityBannerTransport from '@/assets/activity-banners/transport.jpg';
import { resolveFirstRichTextImage } from './rich-text-image';

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
const ACTIVITY_CATEGORY_BANNERS = {
  eat: activityBannerEat,
  play: activityBannerPlay,
  shopping: activityBannerShopping,
  entertainment: activityBannerEntertainment,
  business: activityBannerBusiness,
  study: activityBannerStudy,
  love: activityBannerLove,
  stay: activityBannerStay,
  transport: activityBannerTransport,
} as const;

type ActivityCategoryBannerKey = keyof typeof ACTIVITY_CATEGORY_BANNERS;

type LegacyArticleAdView = MiniProgramAdView & {
  articleDescription?: unknown;
  articleName?: unknown;
  articleCategory?: unknown;
  categoryName?: unknown;
  categoryCode?: unknown;
  detailImageUrl?: unknown;
};

function normalizeOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveLegacyArticleField(
  ad: MiniProgramAdView,
  fieldName: 'articleDescription' | 'articleName' | 'articleCategory' | 'categoryName' | 'categoryCode' | 'detailImageUrl',
) {
  const legacyAd = ad as LegacyArticleAdView;
  return normalizeOptionalString(legacyAd[fieldName])
    || normalizeOptionalString(ad.extraPayload?.[fieldName]);
}

function resolveActivityCategoryBannerKey(ad: MiniProgramAdView): ActivityCategoryBannerKey | undefined {
  const sourceText = [
    resolveLegacyArticleField(ad, 'articleName'),
    resolveLegacyArticleField(ad, 'articleCategory'),
    resolveLegacyArticleField(ad, 'categoryName'),
    resolveLegacyArticleField(ad, 'categoryCode'),
    resolveMiniProgramAdTitle(ad),
    ad.adName,
    ad.adCode,
  ].filter(Boolean).join(' ');

  const quotedCategory = sourceText.match(/[“"'「『]?([吃游购娱商学情住行])[”"'」』]?\s*(?:在|in|@|Hello|HKP|$)/i)?.[1];
  if (quotedCategory === '吃') return 'eat';
  if (quotedCategory === '游') return 'play';
  if (quotedCategory === '购') return 'shopping';
  if (quotedCategory === '娱') return 'entertainment';
  if (quotedCategory === '商') return 'business';
  if (quotedCategory === '学') return 'study';
  if (quotedCategory === '情') return 'love';
  if (quotedCategory === '住') return 'stay';
  if (quotedCategory === '行') return 'transport';

  if (/餐|食|吃|咖啡|萌咖啡|甜品|饮品|茶|饭|饼屋|风铃餐厅|城堡餐厅/.test(sourceText)) return 'eat';
  if (/住|酒店|住宿|客房|房间|套房|入住|旅宿/.test(sourceText)) return 'stay';
  if (/行|交通|路线|公交|高铁|机场|火车|自驾|停车|出行|抵达|接驳/.test(sourceText)) return 'transport';
  if (/游|玩|园区|导览|景点|项目|设施|游乐/.test(sourceText)) return 'play';
  if (/购|购物|商城|商品|商店|零售|伴手礼|纪念品/.test(sourceText)) return 'shopping';
  if (/娱|演出|巡游|表演|剧场|剧目|娱乐|活动/.test(sourceText)) return 'entertainment';
  if (/商|商务|会议|会务|企业|团队|招商|合作/.test(sourceText)) return 'business';
  if (/学|研学|课程|课堂|学校|亲子|科普|教育/.test(sourceText)) return 'study';
  if (/情|婚礼|情侣|写真|旅拍|约会|爱情|浪漫/.test(sourceText)) return 'love';

  return undefined;
}

function resolveActivityCategoryBanner(ad: MiniProgramAdView) {
  const bannerKey = resolveActivityCategoryBannerKey(ad);
  return bannerKey ? ACTIVITY_CATEGORY_BANNERS[bannerKey] : '';
}

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
  const richTextHtml = ad.richTextHtml || ad.richText || '';
  const legacyHeroImage = resolveFirstRichTextImage(resolveLegacyArticleField(ad, 'articleDescription'));
  const imageSrc = resolveActivityCategoryBanner(ad)
    || resolveMiniProgramAdImage(ad, 'material')
    || resolveMiniProgramAdImage(ad, 'background')
    || resolveLegacyArticleField(ad, 'detailImageUrl')
    || legacyHeroImage;
  return {
    id: ad.id || ad.adNo || '',
    title: resolveLegacyArticleField(ad, 'articleName') || resolveMiniProgramAdTitle(ad) || '乐园资讯',
    subtitle: resolveMiniProgramAdDescription(ad),
    imageSrc: imageSrc || '',
    richTextHtml,
  };
}

// 按首页传入的资源位编码获取活动/推荐列表，不再回退旧本地静态数据。
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
