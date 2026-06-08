import {
  fetchMiniProgramAdDetail,
  fetchMiniProgramPageAds,
  findMiniProgramSlotAds,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';

export interface TicketScheduleData {
  dateText: string;
  richTextHtml: string;
}

const SCHEDULE_SLOT_CODES = ['index_schedule'];

// 兜底从真实首页广告位中找到节目单广告，避免独立进入节目单页时缺少广告 id。
async function resolveDefaultScheduleAdId() {
  const pageAds = await fetchMiniProgramPageAds();
  return findMiniProgramSlotAds(pageAds, SCHEDULE_SLOT_CODES)[0]?.id || '';
}

// 获取节目单页面数据，节目单本质是首页资源位下的单广告详情。
export async function fetchScheduleData(adId = '') {
  const resolvedAdId = adId || await resolveDefaultScheduleAdId();
  if (!resolvedAdId) throw new Error('缺少节目单广告 ID');

  const adDetail = await fetchMiniProgramAdDetail(resolvedAdId);
  const richTextHtml = adDetail?.richTextHtml || adDetail?.richText || '';

  if (!richTextHtml) throw new Error('节目单广告缺少富文本内容');

  return {
    dateText: resolveMiniProgramAdTitle(adDetail) || '节目单',
    richTextHtml,
  };
}
