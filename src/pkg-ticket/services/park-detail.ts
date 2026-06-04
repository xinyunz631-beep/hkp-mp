import { resolveMockData } from '@/core/services/mock';

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

const ticketProjectDetailMap: Record<string, TicketProjectDetail> = {
  '1000000000001001': {
    id: '1000000000001001',
    name: '欢乐漂流',
    heroImages: [
      'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
      '',
    ],
    locationText: '欢乐漂流',
    statusText: '开放情况，以现场为准',
    liked: true,
    likeCount: 93,
    detailHtml: [
      '<div style="font-size:30rpx;line-height:1.55;color:#18181b;">',
      '<p style="margin:0 0 54rpx;">大航海时代将从这个港口开始。来一场奇妙的漂流记吧！穿过河流，越过港湾，感受从未有过的欢畅淋漓，畅享激流勇进新玩法。</p>',
      '<p style="margin:0 0 8rpx;font-weight:500;">游玩时长:15min~20min</p>',
      '<p style="margin:0 0 8rpx;font-weight:500;">注意事项:</p>',
      '<p style="margin:0;">1.最低身高要求:107厘米；<br />2.身高107厘米-140厘米儿童须由成人陪同乘坐。</p>',
      '</div>',
    ].join(''),
  },
  '1000000000001002': {
    id: '1000000000001002',
    name: '缤纷摩天轮',
    heroImages: [
      'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
    ],
    locationText: '缤纷摩天轮',
    statusText: '开放情况，以现场为准',
    liked: false,
    likeCount: 86,
    detailHtml: [
      '<div style="font-size:30rpx;line-height:1.55;color:#18181b;">',
      '<p style="margin:0 0 54rpx;">乘坐缤纷摩天轮，从高处俯瞰乐园街景与湖畔风光，和家人一起收集属于 Hello Kitty Park 的高空记忆。</p>',
      '<p style="margin:0 0 8rpx;font-weight:500;">游玩时长:10min~15min</p>',
      '<p style="margin:0 0 8rpx;font-weight:500;">注意事项:</p>',
      '<p style="margin:0;">1.儿童须由成人陪同乘坐；<br />2.项目开放情况可能受天气和现场运营安排影响。</p>',
      '</div>',
    ].join(''),
  },
  '1000000000001003': {
    id: '1000000000001003',
    name: '苹果树飞椅',
    heroImages: ['https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg'],
    locationText: '苹果树飞椅',
    statusText: '开放情况，以现场为准',
    liked: false,
    likeCount: 1512,
    detailHtml: [
      '<div style="font-size:30rpx;line-height:1.55;color:#18181b;">',
      '<p style="margin:0 0 54rpx;">坐上飞椅围绕苹果树轻快旋转，在色彩和音乐中感受童话乐园的轻盈节奏。</p>',
      '<p style="margin:0 0 8rpx;font-weight:500;">游玩时长:5min~8min</p>',
      '<p style="margin:0;">开放情况和乘坐要求以现场公告为准。</p>',
      '</div>',
    ].join(''),
  },
  '1000000000001004': {
    id: '1000000000001004',
    name: '海洋勇士',
    heroImages: ['https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg'],
    locationText: '海洋勇士',
    statusText: '开放情况，以现场为准',
    liked: false,
    likeCount: 990,
    detailHtml: [
      '<div style="font-size:30rpx;line-height:1.55;color:#18181b;">',
      '<p style="margin:0 0 54rpx;">加入海洋勇士的欢乐队伍，在起伏和旋转中体验充满活力的亲子游乐时刻。</p>',
      '<p style="margin:0 0 8rpx;font-weight:500;">游玩时长:5min~10min</p>',
      '<p style="margin:0;">开放情况和乘坐要求以现场公告为准。</p>',
      '</div>',
    ].join(''),
  },
  '1000000000001005': {
    id: '1000000000001005',
    name: '水上飞艇',
    heroImages: ['https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg'],
    locationText: '水上飞艇',
    statusText: '开放情况，以现场为准',
    liked: false,
    likeCount: 1450,
    detailHtml: [
      '<div style="font-size:30rpx;line-height:1.55;color:#18181b;">',
      '<p style="margin:0 0 54rpx;">在水面航线中感受清爽游乐体验，适合亲子一起放慢脚步欣赏园区景色。</p>',
      '<p style="margin:0 0 8rpx;font-weight:500;">游玩时长:8min~12min</p>',
      '<p style="margin:0;">开放情况和乘坐要求以现场公告为准。</p>',
      '</div>',
    ].join(''),
  },
  '1000000000001006': {
    id: '1000000000001006',
    name: '家园舞会(维护关闭)',
    heroImages: ['https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg'],
    locationText: '家园舞会',
    statusText: '维护关闭，以现场为准',
    liked: false,
    likeCount: 720,
    detailHtml: [
      '<div style="font-size:30rpx;line-height:1.55;color:#18181b;">',
      '<p style="margin:0 0 54rpx;">家园舞会当前维护关闭，重新开放时间请以园区现场公告为准。</p>',
      '<p style="margin:0;">如需调整游玩路线，可查看热玩榜单中的其它项目。</p>',
      '</div>',
    ].join(''),
  },
  '1000000000002001': {
    id: '1000000000002001',
    name: 'The family show',
    heroImages: ['https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg'],
    locationText: '欢乐小镇剧场',
    statusText: '演出安排，以现场为准',
    liked: false,
    likeCount: 826,
    detailHtml: [
      '<div style="font-size:30rpx;line-height:1.55;color:#18181b;">',
      '<p style="margin:0 0 54rpx;">和家人一起走进剧场，观看充满音乐、舞蹈和角色互动的欢乐演出。</p>',
      '<p style="margin:0 0 8rpx;font-weight:500;">演出时长:以现场安排为准</p>',
      '<p style="margin:0;">演出时间、地点和场次可能调整，请以当天公告为准。</p>',
      '</div>',
    ].join(''),
  },
};

const defaultProjectDetail = ticketProjectDetailMap['1000000000001001'];

// 根据路由项目 id 获取热玩项目详情，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchParkDetailData(projectId = '') {
  return resolveMockData<TicketParkDetailData>({
    project: ticketProjectDetailMap[projectId] ?? defaultProjectDetail,
  });
}
