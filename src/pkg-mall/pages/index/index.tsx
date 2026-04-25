import { Text, View } from '@tarojs/components';
import './index.scss';

// 渲染商城独立分包首页，业务能力保持在 mall 分包内演进。
function MallIndexPage() {
  return (
    <View className="package-page">
      <Text className="package-page__title">商城</Text>
      <Text className="package-page__desc">商品、购物车和交易前链路在此分包扩展。</Text>
    </View>
  );
}

export default MallIndexPage;
