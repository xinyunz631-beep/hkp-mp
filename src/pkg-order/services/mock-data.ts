import type { HkpAddressSummary, HkpOrderSummary } from '@/core/types/hkp';

export const orderAddresses: HkpAddressSummary[] = [
  {
    id: 'addr-home',
    name: '晓晓',
    mobile: '155****5697',
    region: '上海市浦东新区',
    detail: '张江镇张江路368号开文大厦22号楼',
    isDefault: true,
  },
];

export interface OrderHomeTabData {
  key: string;
  text: string;
}

export interface OrderHomeItemData {
  id: string;
  title: string;
  subtitle?: string;
  extraText?: string;
  imageSrc: string;
  quantity: number;
  priceText: string;
  actionText: string;
}

export interface OrderHomeSectionData {
  id: string;
  dateText: string;
  statusText: string;
  totalText: string;
  items: OrderHomeItemData[];
}

export interface OrderHomeData {
  tabs: OrderHomeTabData[];
  sections: OrderHomeSectionData[];
}

export interface OrderDetailFieldData {
  label: string;
  value: string;
}

export interface OrderDetailData {
  id: string;
  statusText: string;
  paidAmountText: string;
  title: string;
  quantityText: string;
  productFields: OrderDetailFieldData[];
  ticketFields: OrderDetailFieldData[];
  contactFields: OrderDetailFieldData[];
  amountFields: OrderDetailFieldData[];
  orderFields: OrderDetailFieldData[];
  refundButtonText: string;
}

export interface OrderCheckoutProductData {
  id: string;
  title: string;
  specText: string;
  quantity: number;
  priceText: string;
  imageSrc: string;
  giftText?: string;
}

export interface OrderCheckoutData {
  address: HkpAddressSummary;
  paymentMethodText: string;
  products: OrderCheckoutProductData[];
  shippingText: string;
  couponText: string;
  discountText: string;
  amountFields: OrderDetailFieldData[];
  totalAmount: number;
  discountAmount: number;
}

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

export const orderHomeData: OrderHomeData = {
  tabs: [
    { key: 'all', text: '全部' },
    { key: 'pendingPay', text: '待付款' },
    { key: 'pendingShip', text: '待发货' },
    { key: 'pendingReceive', text: '待收货' },
    { key: 'pendingReview', text: '待评价' },
  ],
  sections: [
    {
      id: 'order-group-20190829',
      dateText: '2019-08-29',
      statusText: '订单完成',
      totalText: '共3件商品 合计:¥238',
      items: [
        {
          id: 'order-home-item-1',
          title: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩玩公仔玩偶毛绒玩具',
          subtitle: '尺寸：20cm',
          imageSrc: '',
          quantity: 1,
          priceText: '¥ 189.9',
          actionText: '去评价',
        },
        {
          id: 'order-home-item-2',
          title: '多彩曲奇饼干',
          subtitle: '四合一口味 280g',
          extraText: '赠品  精美钥匙扣一个',
          imageSrc: '',
          quantity: 2,
          priceText: '¥ 88',
          actionText: '去评价',
        },
        {
          id: 'order-home-item-3',
          title: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩玩公仔玩偶毛绒玩具',
          subtitle: '尺寸：50cm',
          imageSrc: '',
          quantity: 1,
          priceText: '¥ 189.9',
          actionText: '去评价',
        },
      ],
    },
    {
      id: 'order-group-20191109',
      dateText: '2019-11-09',
      statusText: '订单完成',
      totalText: '',
      items: [
        {
          id: 'order-home-item-4',
          title: 'Hello Kitty 乐园门票',
          subtitle: '出行日期：2019-11-09',
          imageSrc: '',
          quantity: 3,
          priceText: '¥ 299.9',
          actionText: '去评价',
        },
      ],
    },
    {
      id: 'order-group-20191111',
      dateText: '2019-11-11',
      statusText: '订单完成',
      totalText: '',
      items: [
        {
          id: 'order-home-item-5',
          title: '锦江银润城堡酒店豪华家庭房',
          subtitle: '豪华家庭房-1间-3晚',
          extraText: '入住日期：2019-11-11\n离店日期：2019-11-14',
          imageSrc: '',
          quantity: 1,
          priceText: '¥ 299.9',
          actionText: '去评价',
        },
      ],
    },
  ],
};

export const orderDetailData: OrderDetailData = {
  id: '1234567890',
  statusText: '已发货',
  paidAmountText: '¥998',
  title: '杭州Hello Kitty 乐园平日成人票',
  quantityText: 'X2',
  productFields: [
    { label: '使用日期', value: '2019-11-11' },
    { label: '有效期', value: '仅入园当天有效' },
    { label: '使用方法', value: '凭购票时填写的身份证入园' },
  ],
  ticketFields: [
    { label: '入园地址', value: '浙江湖州市安吉县天使大道1号' },
    { label: '入园时间', value: '10:00-17:00' },
    { label: '退票规则', value: '1. 门票未使用，随时可退，退票无需任何手续费' },
  ],
  contactFields: [
    { label: '姓名', value: 'Chris J' },
    { label: '手机号', value: '+86 133****1234' },
    { label: '身份证', value: '310************' },
  ],
  amountFields: [
    { label: '商品总价', value: '¥ 998.00' },
    { label: '立减', value: '- ¥ 0.00' },
    { label: '实付款', value: '¥ 998.00' },
  ],
  orderFields: [
    { label: '订单编号', value: '1234567890' },
    { label: '下单时间', value: '2019-11-01 12:40' },
    { label: '支付方式', value: '在线支付' },
    { label: '支付时间', value: '2019-11-01 12:41:19' },
  ],
  refundButtonText: '申请退款',
};

export const orderCheckoutData: OrderCheckoutData = {
  address: orderAddresses[0],
  paymentMethodText: '微信支付',
  products: [
    {
      id: 'order-checkout-1',
      title: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩玩公仔玩偶毛绒玩具',
      specText: '规格：30cm',
      quantity: 1,
      priceText: '¥ 349.9',
      imageSrc: '',
      giftText: '赠品  精美钥匙扣一个',
    },
    {
      id: 'order-checkout-2',
      title: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩玩公仔玩偶毛绒玩具',
      specText: '规格：40cm',
      quantity: 1,
      priceText: '¥ 349.9',
      imageSrc: '',
    },
  ],
  shippingText: '中通快递',
  couponText: '满¥300减¥50',
  discountText: '无可用',
  amountFields: [
    { label: '商品金额', value: '¥349.00' },
    { label: '运费', value: '¥0.00' },
    { label: '立减', value: '-¥50.00' },
  ],
  totalAmount: 299,
  discountAmount: 50,
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
