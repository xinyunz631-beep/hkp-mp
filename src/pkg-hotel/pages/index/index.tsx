import { Text, View } from '@tarojs/components';
import './index.scss';

// 渲染酒店独立分包首页，房型和预订能力在此分包扩展。
function HotelIndexPage() {
  return (
    <View className="package-page">
      <Text className="package-page__title">酒店</Text>
      <Text className="package-page__desc">酒店房型、预订和入住相关能力在此分包扩展。</Text>
    </View>
  );
}

export default HotelIndexPage;
