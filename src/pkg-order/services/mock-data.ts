import type { HkpAddressSummary, HkpFilterTab, HkpOrderSummary } from '@/core/types/hkp';

const orderImageAssets = {
  plush: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=900&q=80',
  gift: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=900&q=80',
  ticket: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
  hotel: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
  mug: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=80',
};

export const orderAddresses: HkpAddressSummary[] = [
  {
    id: 'addr-home',
    name: '晓晓',
    mobile: '15512345697',
    region: '上海市浦东新区张江路368号',
    detail: '开文大厦22号楼1201室',
    isDefault: true,
    locationName: '开文大厦',
    locationAddress: '上海市浦东新区张江路368号',
    latitude: 31.204318,
    longitude: 121.595421,
    tag: '家',
  },
  {
    id: 'addr-company',
    name: 'Chris J',
    mobile: '13312345697',
    region: '上海市浦东新区金苏路200号',
    detail: 'D栋4楼前台',
    isDefault: false,
    locationName: '金苏路园区',
    locationAddress: '上海市浦东新区金苏路200号',
    latitude: 31.205551,
    longitude: 121.608102,
    tag: '公司',
  },
];

export interface OrderHomeTabData {
  key: string;
  text: string;
}

export interface OrderHomeActionData {
  text: string;
  tone?: 'default' | 'primary' | 'danger';
}

export interface OrderHomeItemData {
  id: string;
  orderId?: string;
  title: string;
  subtitle?: string;
  extraText?: string;
  imageSrc: string;
  quantity: number;
  priceText: string;
  actionText: string;
  actions?: OrderHomeActionData[];
}

export interface OrderHomeSectionData {
  id: string;
  tabKey: string;
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
  primaryActionType?: 'pay' | 'aftersale' | 'refund' | 'none';
  payExpireAt?: string;
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
  canRefund?: boolean;
  canAfterSale?: boolean;
}

export interface OrderCheckoutData {
  draftId?: string;
  address: HkpAddressSummary;
  paymentMethodText: string;
  products: OrderCheckoutProductData[];
  shippingText: string;
  canSubmit?: boolean;
  deliveryErrors?: string[];
  couponText: string;
  discountText: string;
  amountFields: OrderDetailFieldData[];
  totalAmount: number;
  discountAmount: number;
}

export interface OrderAddressData {
  addresses: HkpAddressSummary[];
  maxCount: number;
}

export interface OrderLogisticsTraceItem {
  id: string;
  timeText: string;
  detailText: string;
}

export interface OrderLogisticsData {
  productImageSrc: string;
  statusText: string;
  companyText: string;
  trackingNumberText: string;
  hotlineText: string;
  quantityText: string;
  totalAmountText: string;
  confirmButtonText: string;
  traces: OrderLogisticsTraceItem[];
}

export interface OrderReviewCreateTagData {
  key: string;
  text: string;
}

export interface OrderReviewCreateImageData {
  id: string;
  src: string;
}

export interface OrderReviewCreateData {
  productImageSrc: string;
  productTitle: string;
  hintText: string;
  tags: OrderReviewCreateTagData[];
  defaultTagKey: string;
  placeholderText: string;
  maxLength: number;
  images: OrderReviewCreateImageData[];
  anonymousText: string;
  submitButtonText: string;
}

export interface OrderReviewItemData {
  id: string;
  userName: string;
  avatarSrc: string;
  timeText: string;
  content: string;
  imageSrcs: string[];
}

export interface OrderReviewListData {
  filters: OrderReviewCreateTagData[];
  reviews: OrderReviewItemData[];
}

export interface OrderCancelData {
  order: HkpOrderSummary;
  reasons: string[];
  tips: string[];
  submitButtonText: string;
}

export interface OrderAftersaleTypeOptionData {
  key: string;
  title: string;
  desc: string;
  amountText: string;
  tagText?: string;
}

export interface OrderAftersaleTypeData {
  order: HkpOrderSummary;
  tipText: string;
  types: OrderAftersaleTypeOptionData[];
}

export interface OrderAftersaleApplyData {
  order: HkpOrderSummary;
  selectedTypeText: string;
  reasons: string[];
  defaultReason: string;
  refundAmountText: string;
  contactName: string;
  contactMobile: string;
  placeholderText: string;
  uploadHintText: string;
  serviceTipText: string;
  submitButtonText: string;
}

export interface OrderAftersaleRecordData {
  id: string;
  tabKey: string;
  serviceNo: string;
  typeText: string;
  statusText: string;
  statusDesc: string;
  amountText: string;
  createdAt: string;
  buttonText: string;
  order: HkpOrderSummary;
}

export interface OrderAftersaleListData {
  tabs: HkpFilterTab[];
  records: OrderAftersaleRecordData[];
}

export interface OrderAftersaleProgressStepData {
  id: string;
  title: string;
  timeText: string;
  detailText?: string;
}

export interface OrderAftersaleFieldData {
  label: string;
  value: string;
}

export interface OrderAftersaleProgressData {
  order: HkpOrderSummary;
  serviceNo: string;
  typeText: string;
  statusText: string;
  statusDesc: string;
  refundAmountText: string;
  reasonText: string;
  fields: OrderAftersaleFieldData[];
  progress: OrderAftersaleProgressStepData[];
  primaryButtonText: string;
}

export const orderList: HkpOrderSummary[] = [
  {
    id: 'order-pending-001',
    merchantName: '乐园商城',
    statusText: '待付款',
    products: [
      {
        id: 'pending-plush',
        title: 'Hello Kitty 毛绒公仔',
        image: { src: orderImageAssets.plush },
        skuText: '粉色限定款',
        price: 199,
        quantity: 1,
      },
    ],
    totalAmount: 199,
    countText: '共1件',
    primaryActionText: '继续支付',
  },
  {
    id: 'order-ticket-001',
    merchantName: 'Hello Kitty Park',
    statusText: '待使用',
    products: [
      {
        id: 'adult-ticket',
        title: '成人票',
        subtitle: '指定游玩日当天有效',
        image: { src: orderImageAssets.ticket },
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
        image: { src: orderImageAssets.gift },
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
      tabKey: 'pendingReview',
      dateText: '2019-08-29',
      statusText: '订单完成',
      totalText: '共3件商品 合计:¥238',
      items: [
        {
          id: 'order-home-item-1',
          title: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩玩公仔玩偶毛绒玩具',
          subtitle: '尺寸：20cm',
          imageSrc: orderImageAssets.plush,
          quantity: 1,
          priceText: '¥ 189.9',
          actionText: '去评价',
        },
        {
          id: 'order-home-item-2',
          title: '多彩曲奇饼干',
          subtitle: '四合一口味 280g',
          extraText: '赠品  精美钥匙扣一个',
          imageSrc: orderImageAssets.gift,
          quantity: 2,
          priceText: '¥ 88',
          actionText: '去评价',
        },
        {
          id: 'order-home-item-3',
          title: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩玩公仔玩偶毛绒玩具',
          subtitle: '尺寸：50cm',
          imageSrc: orderImageAssets.plush,
          quantity: 1,
          priceText: '¥ 189.9',
          actionText: '去评价',
        },
      ],
    },
    {
      id: 'order-group-20191109',
      tabKey: 'pendingReview',
      dateText: '2019-11-09',
      statusText: '订单完成',
      totalText: '',
      items: [
        {
          id: 'order-home-item-4',
          title: 'Hello Kitty 乐园门票',
          subtitle: '出行日期：2019-11-09',
          imageSrc: orderImageAssets.ticket,
          quantity: 3,
          priceText: '¥ 299.9',
          actionText: '去评价',
        },
      ],
    },
    {
      id: 'order-group-20191111',
      tabKey: 'pendingReview',
      dateText: '2019-11-11',
      statusText: '订单完成',
      totalText: '',
      items: [
        {
          id: 'order-home-item-5',
          title: '锦江银润城堡酒店豪华家庭房',
          subtitle: '豪华家庭房-1间-3晚',
          extraText: '入住日期：2019-11-11\n离店日期：2019-11-14',
          imageSrc: orderImageAssets.hotel,
          quantity: 1,
          priceText: '¥ 299.9',
          actionText: '去评价',
        },
      ],
    },
    {
      id: 'order-group-20260516-pending-pay',
      tabKey: 'pendingPay',
      dateText: '2026-05-16',
      statusText: '待付款',
      totalText: '共1件商品 合计:¥199',
      items: [
        {
          id: 'order-home-item-6',
          orderId: 'order-pending-001',
          title: 'Hello Kitty 毛绒公仔',
          subtitle: '粉色限定款',
          imageSrc: orderImageAssets.plush,
          quantity: 1,
          priceText: '¥ 199',
          actionText: '继续支付',
        },
      ],
    },
    {
      id: 'order-group-20260515-pending-ship',
      tabKey: 'pendingShip',
      dateText: '2026-05-15',
      statusText: '待发货',
      totalText: '共2件商品 合计:¥118',
      items: [
        {
          id: 'order-home-item-7',
          orderId: 'order-mall-001',
          title: '新国风冰箱贴盲盒',
          subtitle: 'Hello Kitty / Melody',
          extraText: '未拆封可申请退款，发货后支持退货退款',
          imageSrc: orderImageAssets.gift,
          quantity: 2,
          priceText: '¥ 118',
          actionText: '申请售后',
          actions: [
            { text: '查看物流', tone: 'default' },
            { text: '申请售后', tone: 'primary' },
          ],
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
  quantityText: 'x2',
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
      imageSrc: orderImageAssets.plush,
      giftText: '赠品  精美钥匙扣一个',
    },
    {
      id: 'order-checkout-2',
      title: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩玩公仔玩偶毛绒玩具',
      specText: '规格：40cm',
      quantity: 1,
      priceText: '¥ 349.9',
      imageSrc: orderImageAssets.gift,
    },
  ],
  shippingText: '中通快递',
  couponText: '',
  discountText: '',
  amountFields: [
    { label: '商品金额', value: '¥699.80' },
    { label: '运费', value: '¥0.00' },
  ],
  totalAmount: 699.8,
  discountAmount: 0,
};

export const cancelData: OrderCancelData = {
  order: orderList[0],
  reasons: ['行程变化', '重复购买', '信息填写错误', '其他原因'],
  tips: [
    '订单取消后，商品库存将自动释放。',
    '如已支付成功，请前往售后链路申请退款。',
  ],
  submitButtonText: '提交取消申请',
};

export const aftersaleTypeData: OrderAftersaleTypeData = {
  order: orderList[2],
  tipText: '发货前支持仅退款，发货后可选择退货退款。',
  types: [
    {
      key: 'refund-only',
      title: '仅退款',
      desc: '商品未拆封或待发货时优先使用',
      amountText: '预计退款 ¥118.00',
      tagText: '推荐',
    },
    {
      key: 'return-refund',
      title: '退货退款',
      desc: '收到商品后需要寄回时使用',
      amountText: '待商家收货后原路退款',
    },
    {
      key: 'exchange',
      title: '换货',
      desc: '拍错规格或商品破损时可申请换货',
      amountText: '免费换货',
    },
  ],
};

export const aftersaleApplyData: OrderAftersaleApplyData = {
  order: orderList[2],
  selectedTypeText: '仅退款',
  reasons: ['不想要了', '拍错规格', '商品破损', '其他原因'],
  defaultReason: '不想要了',
  refundAmountText: '¥118.00',
  contactName: 'Chris J',
  contactMobile: '133****5697',
  placeholderText: '请补充售后说明，帮助商家更快处理',
  uploadHintText: '上传凭证（最多 3 张）',
  serviceTipText: '提交后平台会在 1-2 个工作日内完成审核。',
  submitButtonText: '提交售后申请',
};

export const aftersaleListData: OrderAftersaleListData = {
  tabs: [
    { key: 'all', text: '全部' },
    { key: 'processing', text: '处理中' },
    { key: 'refund', text: '退款成功' },
  ],
  records: [
    {
      id: 'aftersale-001',
      tabKey: 'processing',
      serviceNo: 'SH20260516001',
      typeText: '仅退款',
      statusText: '平台审核中',
      statusDesc: '预计 1 个工作日内处理完成',
      amountText: '¥118.00',
      createdAt: '2026-05-16 10:03',
      buttonText: '查看进度',
      order: orderList[2],
    },
    {
      id: 'aftersale-002',
      tabKey: 'refund',
      serviceNo: 'SH20260510008',
      typeText: '退货退款',
      statusText: '退款成功',
      statusDesc: '退款已原路退回，请注意查收',
      amountText: '¥59.00',
      createdAt: '2026-05-10 18:26',
      buttonText: '查看详情',
      order: {
        ...orderList[2],
        id: 'order-mall-002',
        statusText: '已退款',
        totalAmount: 59,
        products: [
          {
            ...orderList[2].products[0],
            title: '库洛米挂件盲盒',
            price: 59,
            quantity: 1,
          },
        ],
        countText: '共1件',
      },
    },
  ],
};

export const aftersaleProgressData: OrderAftersaleProgressData = {
  order: orderList[2],
  serviceNo: 'SH20260516001',
  typeText: '仅退款',
  statusText: '平台审核中',
  statusDesc: '商家将在 24 小时内确认退款处理结果',
  refundAmountText: '¥118.00',
  reasonText: '不想要了',
  fields: [
    { label: '申请时间', value: '2026-05-16 10:03' },
    { label: '退款方式', value: '原路退回' },
    { label: '联系人', value: 'Chris J 133****5697' },
  ],
  progress: [
    {
      id: 'progress-1',
      title: '提交售后申请',
      timeText: '2026-05-16 10:03',
      detailText: '用户已提交仅退款申请，等待平台审核。',
    },
    {
      id: 'progress-2',
      title: '平台审核中',
      timeText: '2026-05-16 10:08',
      detailText: '审核通过后将按原支付路径退款。',
    },
    {
      id: 'progress-3',
      title: '退款完成',
      timeText: '待更新',
      detailText: '审核通过后自动流转。',
    },
  ],
  primaryButtonText: '查看售后列表',
};

export const addressData: OrderAddressData = {
  addresses: orderAddresses,
  maxCount: 10,
};

export const logisticsData: OrderLogisticsData = {
  productImageSrc: '',
  statusText: '派件中',
  companyText: '顺丰快递',
  trackingNumberText: '31074314436',
  hotlineText: '95338',
  quantityText: '共计1件商品',
  totalAmountText: '¥329.9',
  confirmButtonText: '确认收货',
  traces: [
    {
      id: 'trace-1',
      timeText: '2018.06.17 10:45:32',
      detailText: '正在派送途中，请您准备签收(派件人：张辛庄\n联系电话：18032755148)',
    },
    {
      id: 'trace-2',
      timeText: '2018.06.16 17:20:52',
      detailText: '快件已到达南京市',
    },
    {
      id: 'trace-3',
      timeText: '2018.06.15 08:30:26',
      detailText: '快件离开杭州中转部',
    },
  ],
};

export const reviewCreateData: OrderReviewCreateData = {
  productImageSrc: '',
  productTitle: 'Hello Kitty凯蒂猫情人节生日礼物毛绒玩玩公仔玩偶毛绒玩具',
  hintText: '分享你的使用体验吧',
  tags: [
    { key: 'quality', text: '质量好' },
    { key: 'pretty', text: '漂亮精致' },
    { key: 'price', text: '性价比高' },
  ],
  defaultTagKey: 'quality',
  placeholderText: '分享购买心得',
  maxLength: 200,
  images: [
    { id: 'review-image-1', src: '' },
  ],
  anonymousText: '匿名评价',
  submitButtonText: '发表评论',
};

export const reviewListData: OrderReviewListData = {
  filters: [
    { key: 'quality', text: '质量好(820)' },
    { key: 'crowd', text: '适合人群(89)' },
  ],
  reviews: [
    {
      id: 'review-1',
      userName: 'HERO',
      avatarSrc: '',
      timeText: '2019.11.10 16:40',
      content: '跟在实体店看到的一样，女儿喜欢、',
      imageSrcs: ['', '', ''],
    },
    {
      id: 'review-2',
      userName: 'GATA',
      avatarSrc: '',
      timeText: '2019.10.29 12:20',
      content: '非常好！很精致！和卖家图片一样，不过英伦猫咋没礼盒呢？',
      imageSrcs: ['', ''],
    },
    {
      id: 'review-3',
      userName: 'LUNA',
      avatarSrc: '',
      timeText: '2019.10.25 11:46',
      content: '总体来说还是不错呢，质量也很好，宝宝很喜欢！',
      imageSrcs: [],
    },
  ],
};
