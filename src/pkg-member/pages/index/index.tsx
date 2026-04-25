import { Text, View } from '@tarojs/components';
import './index.scss';

// 渲染会员独立分包首页，会员权益和等级能力在此分包扩展。
function MemberIndexPage() {
  return (
    <View className="package-page">
      <Text className="package-page__title">会员</Text>
      <Text className="package-page__desc">会员资料、权益、积分和等级在此分包扩展。</Text>
    </View>
  );
}

export default MemberIndexPage;
