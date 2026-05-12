import { View } from '@tarojs/components';
import './index.scss';

// 保留 Taro custom-tab-bar 入口但压成 0 高度，避免微信系统层级压过页面内弹层。
function CustomTabBar() {
  return <View className="hkitty-system-tabbar-placeholder" />;
}

export default CustomTabBar;
