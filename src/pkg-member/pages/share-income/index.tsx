import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchShareIncomeData } from '@/pkg-member/services/share-income';
import './index.scss';

// 渲染收益明细的暂缓状态，完整业务页另行进入。
const ShareIncomePage = observer(function ShareIncomePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchShareIncomeData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="收益明细" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="收益明细准备中"
            description="奖励入账后会在这里展示明细。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default ShareIncomePage;
