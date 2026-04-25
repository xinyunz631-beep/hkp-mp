export default defineAppConfig({
  pages: [
    'pages-tab/home/index',
    'pages-tab/park/index',
    'pages-tab/member/index',
    'pages-tab/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#ffffff',
    navigationBarTitleText: '乐园',
    navigationBarTextStyle: 'black',
  },
  tabBar: {
    color: '#626a73',
    selectedColor: '#0f766e',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages-tab/home/index',
        text: '首页',
      },
      {
        pagePath: 'pages-tab/park/index',
        text: '乐园',
      },
      {
        pagePath: 'pages-tab/member/index',
        text: '会员',
      },
      {
        pagePath: 'pages-tab/profile/index',
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
      pages: ['pages/index/index'],
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
      pages: ['pages/index/index'],
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
