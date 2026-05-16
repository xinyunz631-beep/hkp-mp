export interface HotelRoomCardData {
  id: string;
  title: string;
  tagsText: string;
  price: number;
  imageSrc: string;
  badgeText?: string;
}

export interface HotelPackageCardData {
  id: string;
  title: string;
  salesText: string;
  price: number;
  imageSrc: string;
}

export interface HotelFilterOption {
  key: string;
  label: string;
}

export interface HotelStayPanelData {
  checkInWeek: string;
  checkInDate: string;
  checkOutWeek: string;
  checkOutDate: string;
  nightsText: string;
  roomGuestText: string;
}

export interface HotelHomeTabData {
  id: string;
  label: string;
  heroTitle: string;
  heroSubtitle: string;
  galleryCountText: string;
  heroImageSrc: string;
  address: string;
  areaText: string;
  rooms: HotelRoomCardData[];
  packages: HotelPackageCardData[];
}

export interface HotelHomeData {
  title: string;
  hotels: HotelHomeTabData[];
  stayPanel: HotelStayPanelData;
  filterOptions: HotelFilterOption[];
}

export interface HotelRoomFeatureData {
  label: string;
  value: string;
}

export interface HotelRoomDetailData {
  id: string;
  title: string;
  tagText: string;
  imageSrc: string;
  summaryItems: string[];
  bedType: string;
  detailLabel: string;
  featureGroups: HotelRoomFeatureData[];
}

export interface HotelGuestFieldData {
  id: string;
  label: string;
  placeholder: string;
  value: string;
}

export interface HotelCheckoutData {
  hotelName: string;
  roomTitle: string;
  roomTagsText: string;
  stayDateText: string;
  nightsText: string;
  roomCountText: string;
  guestFields: HotelGuestFieldData[];
  mobilePlaceholder: string;
  mobileValue: string;
  couponText: string;
  discountText: string;
  invoiceText: string;
  totalAmount: number;
  discountAmount: number;
}

export const hotelHomeData: HotelHomeData = {
  title: '城堡酒店预订',
  hotels: [
    {
      id: 'castle-hotel',
      label: '润锦江城堡酒店',
      heroTitle: '银润锦江城堡酒店',
      heroSubtitle: '豪华型',
      galleryCountText: '图片99张',
      heroImageSrc: '',
      address: '安吉县天使大道8号',
      areaText: '安吉-杭州凯蒂猫乐园',
      rooms: [
        {
          id: 'luxury-twin',
          title: '豪华双人床',
          tagsText: '不含早  双床  有窗',
          price: 798,
          imageSrc: '',
        },
        {
          id: 'family-suite',
          title: '高级豪华亲子房',
          tagsText: '双早  大床  有窗',
          price: 998,
          imageSrc: '',
        },
      ],
      packages: [
        {
          id: 'castle-package-2d',
          title: '银润锦江城堡酒店2日+乐园双人一天票',
          salesText: '已售1200',
          price: 800,
          imageSrc: '',
        },
        {
          id: 'castle-package-3d',
          title: '银润锦江城堡酒店3日双早+两日不限次入园',
          salesText: '已售1200',
          price: 998,
          imageSrc: '',
        },
      ],
    },
    {
      id: 'town-hotel',
      label: '银润小镇酒店',
      heroTitle: '银润小镇酒店',
      heroSubtitle: '亲子度假型',
      galleryCountText: '图片36张',
      heroImageSrc: '',
      address: '安吉县天使大道6号',
      areaText: '安吉-乐园步行街',
      rooms: [
        {
          id: 'town-double',
          title: '童趣大床房',
          tagsText: '含双早  大床  有窗',
          price: 699,
          imageSrc: '',
        },
        {
          id: 'town-suite',
          title: '小镇家庭套房',
          tagsText: '双早  亲子  有窗',
          price: 899,
          imageSrc: '',
        },
      ],
      packages: [
        {
          id: 'town-package-2d',
          title: '银润小镇酒店2日双早+亲子一天票',
          salesText: '已售680',
          price: 760,
          imageSrc: '',
        },
      ],
    },
  ],
  stayPanel: {
    checkInWeek: '周日',
    checkInDate: '10月13日',
    checkOutWeek: '周一',
    checkOutDate: '10月14日',
    nightsText: '1晚',
    roomGuestText: '每间 2成人 0儿童',
  },
  filterOptions: [
    { key: 'queen', label: '大床' },
    { key: 'breakfast', label: '含早' },
    { key: 'twin', label: '双床' },
  ],
};

export const hotelRoomDetails: HotelRoomDetailData[] = [
  {
    id: 'luxury-twin',
    title: '豪华房',
    tagText: '有窗',
    imageSrc: '',
    summaryItems: ['大床', '30m²', '5-7层'],
    bedType: '双床',
    detailLabel: '更多详情',
    featureGroups: [
      { label: '便利设施', value: '雨伞、书桌、熨衣设备、多种规格电源插座' },
      { label: '媒体科技', value: '国内长途电话、国际长途电话、有线频道' },
      { label: '食品饮品', value: '电热水壶' },
      { label: '浴室', value: '拖鞋、浴室化妆放大镜、24小时热水、浴衣' },
      { label: '室外景观', value: '山景、享有风景' },
    ],
  },
  {
    id: 'family-suite',
    title: '高级豪华亲子房',
    tagText: '有窗',
    imageSrc: '',
    summaryItems: ['大床', '38m²', '6-8层'],
    bedType: '大床',
    detailLabel: '更多详情',
    featureGroups: [
      { label: '便利设施', value: '儿童洗漱包、书桌、衣柜、加湿器' },
      { label: '媒体科技', value: '有线频道、免费 WiFi、高清电视' },
      { label: '食品饮品', value: '电热水壶、迷你吧' },
      { label: '浴室', value: '24小时热水、儿童脚凳、浴袍' },
      { label: '室外景观', value: '园景、亲子主题布置' },
    ],
  },
];

export const hotelCheckoutBaseData: HotelCheckoutData = {
  hotelName: '银润锦江城堡酒店',
  roomTitle: '豪华景观双床房',
  roomTagsText: '双床｜免费wifi｜不含早',
  stayDateText: '10月25日-10月26日',
  nightsText: '共1晚',
  roomCountText: '2间',
  guestFields: [
    {
      id: 'guest-1',
      label: '房间01',
      placeholder: '填写实际入住人姓名',
      value: '',
    },
    {
      id: 'guest-2',
      label: '房间02',
      placeholder: '填写实际入住人姓名',
      value: '',
    },
  ],
  mobilePlaceholder: '用于接收确认消息',
  mobileValue: '',
  couponText: '满¥600减¥80',
  discountText: '无可用',
  invoiceText: '请到酒店前台索取发票',
  totalAmount: 918,
  discountAmount: 80,
};
