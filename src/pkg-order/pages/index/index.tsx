import { Text, View } from '@tarojs/components';
import './index.scss';

// 渲染订单独立分包首页，综合订单列表和详情在此分包扩展。
function OrderIndexPage() {
  return (
    <View className="package-page">
      <Text className="package-page__title">订单</Text>
      <Text className="package-page__desc">综合订单列表、详情和售后入口在此分包扩展。</Text>
    </View>
  );
}

export default OrderIndexPage;
