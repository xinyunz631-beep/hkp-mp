import {
  fetchMiniProgramAdDetail,
  resolveMiniProgramAdDescription,
  resolveMiniProgramAdImage,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';
import type { MiniProgramAdView } from '@/core/types/mini-program-ad';

export interface TicketProjectDetail {
  id: string;
  name: string;
  heroImages: string[];
  locationText: string;
  statusText: string;
  liked: boolean;
  likeCount: number;
  detailHtml: string;
}

export interface TicketParkDetailData {
  project: TicketProjectDetail;
}

// 将广告详情转换成热玩项目详情模型，支持首页广告直接落项目详情页。
function mapAdToProjectDetail(ad: MiniProgramAdView): TicketProjectDetail {
  const imageSrc = resolveMiniProgramAdImage(ad, 'material') || resolveMiniProgramAdImage(ad, 'background') || '';
  const detailHtml = ad.richTextHtml || ad.richText || '';
  return {
    id: ad.id || ad.adNo || '',
    name: resolveMiniProgramAdTitle(ad) || '热玩项目',
    heroImages: imageSrc ? [imageSrc] : [],
    locationText: resolveMiniProgramAdDescription(ad) || ad.slotName || '热玩项目',
    statusText: ad.badgeText || '开放情况，以现场为准',
    liked: false,
    likeCount: 0,
    detailHtml,
  };
}

// 根据路由项目 id 获取热玩项目详情；进入真实广告详情接口后不回退旧本地内容，避免掩盖接口问题。
export async function fetchParkDetailData(projectId = '') {
  if (!projectId) throw new Error('缺少广告详情 ID');

  const adDetail = await fetchMiniProgramAdDetail(projectId);
  if (adDetail?.id || adDetail?.adNo) {
    const project = mapAdToProjectDetail(adDetail);
    if (!project.detailHtml) throw new Error('广告详情缺少富文本内容');
    return { project };
  }

  throw new Error('未获取到广告详情内容');
}
