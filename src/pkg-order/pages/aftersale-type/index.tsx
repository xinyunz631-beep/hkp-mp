import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAftersaleTypeData } from '@/pkg-order/services/aftersale-type';
import './index.scss';

// 渲染售后类型页面，具体业务内容按页面需求继续扩展。
const AftersaleTypePage = observer(function AftersaleTypePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchAftersaleTypeData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="售后类型" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default AftersaleTypePage;
