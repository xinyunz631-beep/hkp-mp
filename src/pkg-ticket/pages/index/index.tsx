import { Text, View } from '@tarojs/components';
import './index.scss';

// 渲染票务独立分包首页，门票和套餐链路在此分包扩展。
function TicketIndexPage() {
  return (
    <View className="package-page">
      <Text className="package-page__title">票务</Text>
      <Text className="package-page__desc">门票、套餐和核销前链路在此分包扩展。</Text>
    </View>
  );
}

export default TicketIndexPage;
