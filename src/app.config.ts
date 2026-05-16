export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/park/index',
    'pages/member/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '乐园',
    navigationBarTextStyle: 'black',
  },
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
        text: '会员',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
      },
    ],
  },
  subPackages: [
    {
      root: 'pkg-mall',
      name: 'mall',
      independent: true,
      pages: ['pages/index/index'],
    },
    {
      root: 'pkg-member',
      name: 'member',
      independent: true,
      pages: ['pages/index/index', 'pages/member-code/index'],
    },
    {
      root: 'pkg-hotel',
      name: 'hotel',
      independent: true,
      pages: ['pages/index/index'],
    },
    {
      root: 'pkg-ticket',
      name: 'ticket',
      independent: true,
      pages: ['pages/index/index', 'pages/ticket-booking/index'],
    },
    {
      root: 'pkg-dining',
      name: 'dining',
      independent: true,
      pages: ['pages/index/index'],
    },
    {
      root: 'pkg-order',
      name: 'order',
      independent: true,
      pages: ['pages/index/index'],
    },
  ],
});
