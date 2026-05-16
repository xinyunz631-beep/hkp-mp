import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchLogisticsData } from '@/pkg-order/services/logistics';
import './index.scss';

// 渲染物流详情页面，具体业务内容按页面需求继续扩展。
const LogisticsPage = observer(function LogisticsPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchLogisticsData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="物流详情" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default LogisticsPage;
