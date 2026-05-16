import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchShareIncomeData } from '@/pkg-member/services/share-income';
import './index.scss';

// 渲染收益明细页面，具体业务内容按页面需求继续扩展。
const ShareIncomePage = observer(function ShareIncomePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchShareIncomeData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="收益明细" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ShareIncomePage;
