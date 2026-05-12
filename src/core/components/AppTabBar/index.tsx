import { useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { MINI_MAIN_ROUTES, type MiniMainRoute } from '@/core/constants/routes';
import './index.scss';

interface AppTabBarItem {
  key: string;
  text: string;
  path: MiniMainRoute;
  icon: 'home' | 'park' | 'member' | 'profile';
}

const tabBarItems: AppTabBarItem[] = [
  { key: 'home', text: '首页', path: MINI_MAIN_ROUTES.home, icon: 'home' },
  { key: 'park', text: '乐园', path: MINI_MAIN_ROUTES.park, icon: 'park' },
  { key: 'member', text: '会员', path: MINI_MAIN_ROUTES.member, icon: 'member' },
  { key: 'profile', text: '我的', path: MINI_MAIN_ROUTES.profile, icon: 'profile' },
];

// 获取当前 tab 页面路径，兼容微信页面栈里无前导斜杠的 route。
function resolveCurrentRoute(): MiniMainRoute {
  const pages = Taro.getCurrentPages();
  const route = pages[pages.length - 1]?.route;
  const normalizedRoute = route ? `/${route}` : MINI_MAIN_ROUTES.home;
  const matched = tabBarItems.find((item) => item.path === normalizedRoute);
  return matched?.path ?? MINI_MAIN_ROUTES.home;
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

  // 切换主包 tab 页，并即时刷新当前页面内 tabbar 选中态。
  function handleSwitchTab(path: MiniMainRoute) {
    if (activePath === path) return;

    setActivePath(path);
    Taro.switchTab({ url: path });
  }

  return (
    <View className="hkitty-tabbar">
      {tabBarItems.map((item) => {
        const isActive = activePath === item.path;
        const itemClassName = isActive ? 'hkitty-tabbar__item hkitty-tabbar__item--active' : 'hkitty-tabbar__item';

        return (
          <View className={itemClassName} key={item.key} onClick={() => handleSwitchTab(item.path)}>
            <View className={`hkitty-tabbar__icon hkitty-tabbar__icon--${item.icon}`} />
            <Text className="hkitty-tabbar__text">{item.text}</Text>
          </View>
        );
      })}
    </View>
  );
}
