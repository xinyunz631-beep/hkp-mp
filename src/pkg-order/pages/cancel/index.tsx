import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCancelData } from '@/pkg-order/services/cancel';
import './index.scss';

// 渲染取消订单页面，具体业务内容按页面需求继续扩展。
const CancelPage = observer(function CancelPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchCancelData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="取消订单" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default CancelPage;
