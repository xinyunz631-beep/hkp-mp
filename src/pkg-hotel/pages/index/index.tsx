import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染酒店独立分包首页，房型和预订能力在此分包扩展。
const HotelIndexPage = observer(function HotelIndexPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="酒店" className="_pg-shell">
        <View className="_pg-content">
          <Text className="_pg-title">酒店</Text>
          <Text className="_pg-desc">酒店房型、预订和入住相关能力在此分包扩展。</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default HotelIndexPage;
