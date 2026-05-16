import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAftersaleProgressData } from '@/pkg-order/services/aftersale-progress';
import './index.scss';

// 渲染售后进度页面，具体业务内容按页面需求继续扩展。
const AftersaleProgressPage = observer(function AftersaleProgressPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchAftersaleProgressData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="售后进度" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default AftersaleProgressPage;
