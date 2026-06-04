import { resolveMockData } from '@/core/services/mock';

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

const parkListData: TicketParkListData = {
  tabs: [
    { id: '1000000000000001', title: '游乐设施' },
    { id: '1000000000000002', title: '演出' },
  ],
  items: [
    {
      id: '1000000000001002',
      tabId: '1000000000000001',
      title: '缤纷摩天轮',
      imageSrc: 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
      locationText: '缤纷摩天轮',
      likeCount: 17738,
      statusText: '如遇雨雪天气取消开放情况，以现场为准！',
    },
    {
      id: '1000000000001001',
      tabId: '1000000000000001',
      title: '欢乐漂流',
      imageSrc: 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
      locationText: '欢乐漂流',
      likeCount: 4836,
      statusText: '开放情况，以现场为准',
    },
    {
      id: '1000000000001003',
      tabId: '1000000000000001',
      title: '苹果树飞椅',
      imageSrc: 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
      locationText: '苹果树飞椅',
      likeCount: 1512,
      statusText: '开放情况，以现场为准',
    },
    {
      id: '1000000000001004',
      tabId: '1000000000000001',
      title: '海洋勇士',
      imageSrc: 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
      locationText: '海洋勇士',
      likeCount: 990,
      statusText: '开放情况，以现场为准',
    },
    {
      id: '1000000000001005',
      tabId: '1000000000000001',
      title: '水上飞艇',
      imageSrc: 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
      locationText: '水上飞艇',
      likeCount: 1450,
      statusText: '开放情况，以现场为准',
    },
    {
      id: '1000000000001006',
      tabId: '1000000000000001',
      title: '家园舞会(维护关闭)',
      imageSrc: 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
      locationText: '家园舞会',
      likeCount: 720,
      statusText: '开放情况，以现场为准',
    },
    {
      id: '1000000000002001',
      tabId: '1000000000000002',
      title: 'The family show',
      imageSrc: 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg',
      locationText: '欢乐小镇剧场',
      likeCount: 826,
      statusText: '演出安排，以现场为准',
    },
  ],
};

// 获取热玩榜单列表，后续接真实接口时在这里做字段归一和空列表兜底。
export function fetchParkListData() {
  return resolveMockData(parkListData);
}
