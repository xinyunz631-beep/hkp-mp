import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchParkDetailData } from '@/pkg-ticket/services/park-detail';
import './index.scss';

// 渲染乐园详情页面，具体业务内容按页面需求继续扩展。
const ParkDetailPage = observer(function ParkDetailPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchParkDetailData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="乐园详情" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ParkDetailPage;
