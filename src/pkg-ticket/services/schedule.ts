import { resolveMockData } from '@/core/services/mock';

export interface TicketScheduleData {
  dateText: string;
  richTextHtml: string;
}

const scheduleData: TicketScheduleData = {
  dateText: '5月30日节目单',
  richTextHtml: [
    '<div style="font-size:28rpx;line-height:1.7;color:#18181b;">',
    '<p style="margin:0 0 12rpx;">具体情况以现场公告为准，如遇下雨部分户外演出受影响取消或更改演出地点。</p>',
    '<img style="width:100%;display:block;" src="https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg" />',
    '</div>',
  ].join(''),
};

// 获取节目单页面数据，后续接真实接口时在这里处理字段归一和富文本兜底。
export async function fetchScheduleData() {
  return resolveMockData(scheduleData);
}
