import { Text, View } from '@tarojs/components';
import { PageShell } from '@/core/components/PageShell';

// 渲染个人中心占位，后续只承载账户入口和轻量设置入口。
function ProfilePage() {
  return (
    <PageShell title="我的" description="个人中心主包占位，订单等业务详情进入独立分包。">
      <View>
        <Text>账户入口占位</Text>
      </View>
    </PageShell>
  );
}

export default ProfilePage;
