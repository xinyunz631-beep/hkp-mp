import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染票务独立分包首页，门票和套餐链路在此分包扩展。
const TicketIndexPage = observer(function TicketIndexPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="票务" className="_pg-shell">
        <View className="_pg-content">
          <Text className="_pg-title">票务</Text>
          <Text className="_pg-desc">门票、套餐和核销前链路在此分包扩展。</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default TicketIndexPage;
