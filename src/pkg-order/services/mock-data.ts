import type { HkpAddressSummary, HkpOrderSummary } from '@/core/types/hkp';

export const orderAddresses: HkpAddressSummary[] = [
  {
    id: 'addr-home',
    name: '微信用户',
    mobile: '138****8888',
    region: '浙江省湖州市安吉县',
    detail: '昌硕街道天使大道1号',
    isDefault: true,
  },
];

export const orderList: HkpOrderSummary[] = [
  {
    id: 'order-ticket-001',
    merchantName: 'Hello Kitty Park',
    statusText: '待使用',
    products: [
      {
        id: 'adult-ticket',
        title: '成人票',
        subtitle: '指定游玩日当天有效',
        image: { src: '' },
        skuText: '2026-05-16',
        price: 299,
        quantity: 1,
      },
    ],
    totalAmount: 299,
    countText: '共1件',
    primaryActionText: '查看详情',
  },
  {
    id: 'order-mall-001',
    merchantName: '乐园商城',
    statusText: '待发货',
    products: [
      {
        id: 'sanrio-icebox-sticker',
        title: '新国风冰箱贴盲盒',
        image: { src: '' },
        skuText: 'Hello Kitty',
        price: 59,
        quantity: 2,
      },
    ],
    totalAmount: 118,
    countText: '共2件',
    primaryActionText: '查看物流',
    secondaryActionText: '申请售后',
  },
];

export const orderCheckoutData = {
  address: orderAddresses[0],
  products: orderList[1].products,
  totalAmount: orderList[1].totalAmount,
};

export const aftersaleData = {
  order: orderList[1],
  reasons: ['不想要了', '拍错规格', '商品破损', '其他原因'],
  progress: [
    { title: '提交申请', time: '2026-05-16 10:00' },
    { title: '平台审核', time: '2026-05-16 10:03' },
  ],
};

export const logisticsData = {
  order: orderList[1],
  traces: [
    { title: '包裹已出库', time: '2026-05-16 15:20' },
    { title: '商家已发货', time: '2026-05-16 16:10' },
  ],
};

export const reviewData = {
  order: orderList[0],
  tags: ['适合亲子', '拍照好看', '服务热情'],
};
