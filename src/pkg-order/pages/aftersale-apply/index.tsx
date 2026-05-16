import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchAftersaleApplyData } from '@/pkg-order/services/aftersale-apply';
import './index.scss';

// 渲染售后申请页面，具体业务内容按页面需求继续扩展。
const AftersaleApplyPage = observer(function AftersaleApplyPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchAftersaleApplyData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="售后申请" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default AftersaleApplyPage;
