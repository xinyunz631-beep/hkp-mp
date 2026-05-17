import { useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { AppIcon, type AppIconName } from '@/core/components/AppIcon';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES, type MiniMainRoute, type MiniPackageRoute } from '@/core/constants/routes';
import './index.scss';

type AppTabBarRoute = MiniMainRoute | MiniPackageRoute;

interface AppTabBarItem {
  key: string;
  text: string;
  path: AppTabBarRoute;
  routeType: 'tab' | 'package';
  icon: AppIconName;
  center?: boolean;
  hideText?: boolean;
}

const tabBarItems: AppTabBarItem[] = [
  { key: 'home', text: '首页', path: MINI_MAIN_ROUTES.home, routeType: 'tab', icon: 'home' },
  { key: 'ticket', text: '购票', path: MINI_PACKAGE_ROUTES.ticketBooking, routeType: 'package', icon: 'ticket' },
  { key: 'memberCode', text: '会员码', path: MINI_PACKAGE_ROUTES.memberCode, routeType: 'package', icon: 'code', center: true, hideText: true },
  { key: 'hotel', text: '酒店', path: MINI_PACKAGE_ROUTES.hotelHome, routeType: 'package', icon: 'hotel' },
  { key: 'profile', text: '我的', path: MINI_MAIN_ROUTES.profile, routeType: 'tab', icon: 'profile' },
];

// 获取当前 tab 页面路径，兼容微信页面栈里无前导斜杠的 route。
function resolveCurrentRoute(): MiniMainRoute {
  const pages = Taro.getCurrentPages();
  const route = pages[pages.length - 1]?.route;
  const normalizedRoute = route ? `/${route}` : MINI_MAIN_ROUTES.home;
  const matched = tabBarItems.find((item) => item.routeType === 'tab' && item.path === normalizedRoute);
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

  // 切换主包 tab 页或打开分包页面，并即时刷新当前页面内 tabbar 选中态。
  function handleNavigate(item: AppTabBarItem) {
    if (item.routeType === 'package') {
      Taro.navigateTo({ url: item.path as MiniPackageRoute });
      return;
    }

    const nextPath = item.path as MiniMainRoute;
    if (activePath === nextPath) return;

    setActivePath(nextPath);
    Taro.switchTab({ url: nextPath });
  }

  return (
    <View className="hkitty-tabbar">
      {tabBarItems.map((item) => {
        const isActive = item.routeType === 'tab' && activePath === item.path;
        const itemClassName = [
          'hkitty-tabbar__item',
          isActive ? 'hkitty-tabbar__item--active' : '',
          item.center ? 'hkitty-tabbar__item--center' : '',
        ].filter(Boolean).join(' ');

        return (
          <View className={itemClassName} key={item.key} onClick={() => handleNavigate(item)}>
            {item.center ? (
              <View className="hkitty-tabbar__center-button">
                <AppIcon name={item.icon} size={16} color="#ffffff" />
              </View>
            ) : (
              <AppIcon className="hkitty-tabbar__icon" name={item.icon} size={16} color="currentColor" />
            )}
            {item.hideText ? null : <Text className="hkitty-tabbar__text">{item.text}</Text>}
          </View>
        );
      })}
    </View>
  );
}
