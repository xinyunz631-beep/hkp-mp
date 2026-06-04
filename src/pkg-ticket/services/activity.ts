import { resolveMockData } from '@/core/services/mock';

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

const activityImageSrc = 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg';

const activityListData: TicketActivityListData = {
  items: [
    {
      id: '2000000000001001',
      title: '感恩有你',
      description: '为孩子们造梦的乐园，也有如此“硬核”的团队',
      dateText: '2020-11-1',
      imageSrc: activityImageSrc,
    },
    {
      id: '2000000000001002',
      title: '以梦为马',
      description: '一堂智慧+勇气+爱心的马术课，开启骑越之乐！',
      dateText: '2020-11-1',
      imageSrc: activityImageSrc,
    },
    {
      id: '2000000000001003',
      title: '乐园助力，嗨吃玩乐',
      description: '为世界杯喝彩，乐园助力嗨吃玩乐。',
      dateText: '2022-11-21',
      imageSrc: activityImageSrc,
    },
  ],
};

const defaultActivityDetail: TicketActivityDetail = {
  id: '2000000000001003',
  title: '乐园助力，嗨吃玩乐',
  subtitle: '为世界杯喝彩',
  imageSrc: activityImageSrc,
  richTextHtml: [
    '<div style="font-size:30px;line-height:1.65;text-align:center;color:#111111;">',
    '<p>乐园助力，嗨吃玩乐，cheer for World Cup！</p>',
    '<p>为世界杯喝彩<br/>FIFA World Cup Qatar 2022</p>',
    '<p>四年一度，足球盛世烽火再起<br/>乐园毛孩子们也来凑个热闹<br/>为大家浅跳个舞助兴吧~</p>',
    '<p>世界杯期间，游园的仪式感也不能少<br/>乐园商品餐饮纷纷推出世界杯优惠套餐<br/>让我们一起为运动员加油呐喊<br/>为精彩赛事共同举杯畅饮！</p>',
    `<img src="${activityImageSrc}" style="width:100%;display:block;margin-top:12px;" />`,
    '</div>',
  ].join(''),
};

function createRichTextDetail(title: string, paragraphs: string[]) {
  return [
    '<div style="font-size:30px;line-height:1.65;color:#111111;">',
    ...paragraphs.map((paragraph) => `<p>${paragraph}</p>`),
    `<img src="${activityImageSrc}" style="width:100%;display:block;margin-top:12px;" />`,
    '</div>',
  ].join('');
}

const activityDetailMap: Record<string, TicketActivityDetail> = {
  '2000000000001003': defaultActivityDetail,
  '2000000000001001': {
    id: '2000000000001001',
    title: '感恩有你',
    subtitle: '为孩子们造梦的乐园，也有如此“硬核”的团队',
    imageSrc: activityImageSrc,
    richTextHtml: [
      '<div style="font-size:30px;line-height:1.65;color:#111111;">',
      '<p>为孩子们造梦的乐园，也有如此“硬核”的团队。</p>',
      '<p>感谢每一位守护笑容的伙伴，让每一次入园都更安心、更温暖。</p>',
      `<img src="${activityImageSrc}" style="width:100%;display:block;margin-top:12px;" />`,
      '</div>',
    ].join(''),
  },
  '2000000000001002': {
    id: '2000000000001002',
    title: '以梦为马',
    subtitle: '一堂智慧+勇气+爱心的马术课，开启骑越之乐！',
    imageSrc: activityImageSrc,
    richTextHtml: [
      '<div style="font-size:30px;line-height:1.65;color:#111111;">',
      '<p>一堂智慧+勇气+爱心的马术课，开启骑越之乐！</p>',
      '<p>在亲近动物的过程中，感受陪伴、信任和成长。</p>',
      `<img src="${activityImageSrc}" style="width:100%;display:block;margin-top:12px;" />`,
      '</div>',
    ].join(''),
  },
  '3000000000001001': {
    id: '3000000000001001',
    title: '交通动线',
    subtitle: '入园、停车与接驳指引',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('交通动线', [
      '入园前可提前了解停车、检票、接驳和园区主入口动线，减少现场等待时间。',
      '具体交通安排、临时管制和接驳点位以当天园区公告为准。',
    ]),
  },
  '3000000000001002': {
    id: '3000000000001002',
    title: '项目排队',
    subtitle: '热门项目开放与等待提醒',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('项目排队', [
      '热门项目等待时间会随天气、客流和设备运行情况变化，建议结合现场公告灵活安排路线。',
      '如遇设备维护、临时关闭或演出场次调整，请以园区当天公示为准。',
    ]),
  },
  '5000000000001001': {
    id: '5000000000001001',
    title: '吃在乐园',
    subtitle: '餐饮美食与主题套餐',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('吃在乐园', [
      '园区餐饮会结合节庆和主题活动推出限定套餐，实际菜单、价格和售卖时间以门店公示为准。',
    ]),
  },
  '5000000000001002': {
    id: '5000000000001002',
    title: '住在乐园',
    subtitle: '主题酒店与度假体验',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('住在乐园', [
      '主题住宿内容、房型权益和可订日期以后端接口配置为准，页面统一承载富文本详情。',
    ]),
  },
  '5000000000001003': {
    id: '5000000000001003',
    title: '行在乐园',
    subtitle: '交通到达与园区出行',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('行在乐园', [
      '游客可根据当天交通、停车和园区接驳安排规划出行，临时调整以现场公告为准。',
    ]),
  },
  '5000000000001004': {
    id: '5000000000001004',
    title: '游在乐园',
    subtitle: '项目游玩与路线推荐',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('游在乐园', [
      '游玩路线、开放项目和体验推荐由后端配置，前端统一进入详情页渲染富文本。',
    ]),
  },
  '5000000000001005': {
    id: '5000000000001005',
    title: '购在乐园',
    subtitle: '主题商品与限定周边',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('购在乐园', [
      '主题商品、限定周边和优惠活动以实际售卖信息为准，详情内容由后端配置。',
    ]),
  },
  '5000000000001006': {
    id: '5000000000001006',
    title: '娱在乐园',
    subtitle: '演出娱乐与互动体验',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('娱在乐园', [
      '演出场次、互动活动和娱乐体验会随运营安排调整，请以当天公告为准。',
    ]),
  },
  '5000000000001007': {
    id: '5000000000001007',
    title: '商在乐园',
    subtitle: '商务合作与团体服务',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('商在乐园', [
      '商务合作、团体活动和定制服务内容以后端配置为准，页面统一复用活动详情承载。',
    ]),
  },
  '5000000000001008': {
    id: '5000000000001008',
    title: '学在乐园',
    subtitle: '研学课程与亲子成长',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('学在乐园', [
      '研学课程、亲子活动和报名信息以后端配置为准，详情页只负责渲染接口富文本。',
    ]),
  },
  '5000000000001009': {
    id: '5000000000001009',
    title: '乐园资讯',
    subtitle: '公告、资讯与主题内容',
    imageSrc: activityImageSrc,
    richTextHtml: createRichTextDetail('乐园资讯', [
      '乐园公告、主题资讯和更多内容由后端统一配置，前端通过同一详情页承载。',
    ]),
  },
};

// 获取精选活动列表，真实接口接入后在这里做字段归一和空列表兜底。
export function fetchActivityListData() {
  return resolveMockData(activityListData);
}

// 获取精选活动详情，详情正文由接口富文本承载，页面只负责渲染容器。
export function fetchActivityDetailData(activityId = '') {
  return resolveMockData({
    activity: activityDetailMap[activityId] ?? defaultActivityDetail,
  });
}
