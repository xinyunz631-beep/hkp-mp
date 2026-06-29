import { useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Image, Text, View } from '@tarojs/components';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES, type MiniMainRoute, type MiniPackageRoute } from '@/core/constants/routes';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import './index.scss';

type AppTabBarRoute = MiniMainRoute | MiniPackageRoute;
type AppTabBarKey = 'home' | 'ticket' | 'memberCode' | 'hotel' | 'profile';

interface AppTabBarItem {
  key: AppTabBarKey;
  text: string;
  path: AppTabBarRoute;
  routeType: 'main' | 'package';
  center?: boolean;
  hideText?: boolean;
}

// 维护 tabbar 每个入口的选中和未选中图片，后续只替换这里的图片链接。
const tabBarImages: Record<AppTabBarKey, { selected: string; unselected: string }> = {
  home: {
    selected: 'https://image.hellokittypark.cn/10000_kitty_theme_2e2e8d26-f6bb-44d8-bda5-ffeec5623443.png',
    unselected: 'https://image.hellokittypark.cn/10000_kitty_theme_2e2e8d26-f6bb-44d8-bda5-ffeec5623443.png',
  },
  ticket: {
    selected: 'https://image.hellokittypark.cn/10000_kitty_theme_38e423e3-67ec-4c53-81bb-b3f0024ff6e5.png',
    unselected: 'https://image.hellokittypark.cn/10000_kitty_theme_38e423e3-67ec-4c53-81bb-b3f0024ff6e5.png',
  },
  memberCode: {
    selected: 'https://image.hellokittypark.cn/10000_kitty_theme_7d176b69-7a4d-4f24-af95-3a04948fcb23.png',
    unselected: 'https://image.hellokittypark.cn/10000_kitty_theme_7d176b69-7a4d-4f24-af95-3a04948fcb23.png',
  },
  hotel: {
    selected: 'https://image.hellokittypark.cn/10000_kitty_theme_a495b64b-91d6-45c3-9b67-5a47eb4cf56d.png',
    unselected: 'https://image.hellokittypark.cn/10000_kitty_theme_a495b64b-91d6-45c3-9b67-5a47eb4cf56d.png',
  },
  profile: {
    selected: 'https://image.hellokittypark.cn/10000_kitty_theme_561b35ab-1bff-4474-af64-2eb9194f7179.png',
    unselected: 'https://image.hellokittypark.cn/10000_kitty_theme_561b35ab-1bff-4474-af64-2eb9194f7179.png',
  },
};

const tabBarItems: AppTabBarItem[] = [
  { key: 'home', text: '首页', path: MINI_MAIN_ROUTES.home, routeType: 'main' },
  { key: 'ticket', text: '购票', path: MINI_PACKAGE_ROUTES.ticketBooking, routeType: 'package' },
  {
    key: 'memberCode',
    text: '会员码',
    path: MINI_PACKAGE_ROUTES.memberCode,
    routeType: 'package',
    center: true,
    hideText: true,
  },
  { key: 'hotel', text: '酒店', path: MINI_PACKAGE_ROUTES.hotelHome, routeType: 'package' },
  { key: 'profile', text: '我的', path: MINI_MAIN_ROUTES.member, routeType: 'main' },
];

// 获取当前主包入口页面路径，兼容微信页面栈里无前导斜杠的 route。
function resolveCurrentRoute(): MiniMainRoute {
  const pages = Taro.getCurrentPages();
  const route = pages[pages.length - 1]?.route;
  const normalizedRoute = route ? `/${route}` : MINI_MAIN_ROUTES.home;
  const matched = tabBarItems.find((item) => item.routeType === 'main' && item.path === normalizedRoute);
  return (matched?.path as MiniMainRoute | undefined) ?? MINI_MAIN_ROUTES.home;
}

// 渲染页面内 tabbar，避免微信 custom-tab-bar 系统层级压过页面弹层。
export function AppTabBar() {
  const [activePath, setActivePath] = useState<MiniMainRoute>(resolveCurrentRoute);

  useEffect(() => {
    setActivePath(resolveCurrentRoute());
  }, []);

  useDidShow(() => {
    setActivePath(resolveCurrentRoute());
  });

  // 切换主包入口页或打开分包页面，并即时刷新当前页面内 tabbar 选中态。
  function handleNavigate(item: AppTabBarItem) {
    if (item.routeType === 'package') {
      navigateToMiniRoute(item.path as MiniPackageRoute);
      return;
    }

    const nextPath = item.path as MiniMainRoute;
    if (activePath === nextPath) return;

    setActivePath(nextPath);
    navigateToMiniRoute(nextPath);
  }

  return (
    <View className="hkitty-tabbar">
      {tabBarItems.map((item) => {
        const isActive = item.routeType === 'main' && activePath === item.path;
        const itemClassName = [
          'hkitty-tabbar__item',
          isActive ? 'hkitty-tabbar__item--active' : '',
          item.center ? 'hkitty-tabbar__item--center' : '',
        ].filter(Boolean).join(' ');
        const imageSrc = isActive ? tabBarImages[item.key].selected : tabBarImages[item.key].unselected;
        const imageClassName = [
          'hkitty-tabbar__image',
          isActive ? 'hkitty-tabbar__image--active' : '',
          item.center ? 'hkitty-tabbar__image--center' : '',
        ].filter(Boolean).join(' ');

        return (
          <View className={itemClassName} key={item.key} onClick={() => handleNavigate(item)}>
            <Image className={imageClassName} src={imageSrc} mode="aspectFit" />
            {item.hideText ? null : <Text className="hkitty-tabbar__text">{item.text}</Text>}
          </View>
        );
      })}
    </View>
  );
}
