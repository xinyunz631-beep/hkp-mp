import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染会员独立分包首页，会员权益和等级能力在此分包扩展。
const MemberIndexPage = observer(function MemberIndexPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="会员" className="_pg-shell">
        <View className="_pg-content">
          <Text className="_pg-title">会员</Text>
          <Text className="_pg-desc">会员资料、权益、积分和等级在此分包扩展。</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default MemberIndexPage;
