import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAftersaleListData } from '@/pkg-order/services/aftersale-list';
import './index.scss';

// 渲染售后列表页面，具体业务内容按页面需求继续扩展。
const AftersaleListPage = observer(function AftersaleListPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchAftersaleListData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="售后列表" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default AftersaleListPage;
