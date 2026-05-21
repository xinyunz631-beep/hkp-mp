export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/park/index',
    'pages/member/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '乐园',
    navigationBarTextStyle: 'black',
  },
  permission: {
    'scope.userLocation': {
      desc: '用于选择收货地址位置',
    },
  },
  requiredPrivateInfos: [
    'chooseLocation',
  ],
  tabBar: {
    custom: true,
    color: '#626a73',
    selectedColor: '#db2777',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
      },
      {
        pagePath: 'pages/park/index',
        text: '乐园',
      },
      {
        pagePath: 'pages/member/index',
        text: '我的',
      },
    ],
  },
  subPackages: [
    {
      root: 'pkg-mall',
      name: 'mall',
      pages: [
        'pages/index/index',
        'pages/category/index',
        'pages/category-list/index',
        'pages/search/index',
        'pages/products/index',
        'pages/recommend/index',
        'pages/product-detail/index',
        'pages/cart/index',
        'pages/favorites/index',
        'pages/gift-select/index',
      ],
    },
    {
      root: 'pkg-member',
      name: 'member',
      pages: [
        'pages/index/index',
        'pages/member-code/index',
        'pages/coupons/index',
        'pages/share-rule/index',
        'pages/share/index',
        'pages/share-income/index',
        'pages/share-invite/index',
        'pages/withdraw-records/index',
        'pages/withdraw/index',
      ],
    },
    {
      root: 'pkg-hotel',
      name: 'hotel',
      pages: [
        'pages/index/index',
        'pages/checkout/index',
        'pages/room-detail/index',
      ],
    },
    {
      root: 'pkg-ticket',
      name: 'ticket',
      pages: [
        'pages/index/index',
        'pages/ticket-booking/index',
        'pages/park-detail/index',
        'pages/park-guide/index',
        'pages/checkout/index',
      ],
    },
    {
      root: 'pkg-dining',
      name: 'dining',
      pages: [
        'pages/index/index',
        'pages/merchant-detail/index',
        'pages/checkout/index',
      ],
    },
    {
      root: 'pkg-order',
      name: 'order',
      pages: [
        'pages/index/index',
        'pages/detail/index',
        'pages/checkout/index',
        'pages/address/index',
        'pages/address-edit/index',
        'pages/cancel/index',
        'pages/aftersale-apply/index',
        'pages/aftersale-type/index',
        'pages/aftersale-list/index',
        'pages/aftersale-progress/index',
        'pages/logistics/index',
        'pages/review-create/index',
        'pages/review-list/index',
      ],
    },
  ],
});
