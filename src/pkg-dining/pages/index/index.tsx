import { Text, View } from '@tarojs/components';
import './index.scss';

// 渲染点餐独立分包首页，餐厅和菜单能力在此分包扩展。
function DiningIndexPage() {
  return (
    <View className="package-page">
      <Text className="package-page__title">点餐</Text>
      <Text className="package-page__desc">餐厅、菜单、取餐或配送能力在此分包扩展。</Text>
    </View>
  );
}

export default DiningIndexPage;
