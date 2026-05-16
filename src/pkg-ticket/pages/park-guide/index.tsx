import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchParkGuideData } from '@/pkg-ticket/services/park-guide';
import './index.scss';

// 渲染乐园导览页面，具体业务内容按页面需求继续扩展。
const ParkGuidePage = observer(function ParkGuidePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchParkGuideData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="乐园导览" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ParkGuidePage;
