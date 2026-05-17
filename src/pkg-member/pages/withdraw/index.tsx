import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchWithdrawData } from '@/pkg-member/services/withdraw';
import './index.scss';

// 渲染申请提现的暂缓状态，完整业务页另行进入。
const WithdrawPage = observer(function WithdrawPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchWithdrawData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="申请提现" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="提现服务准备中"
            description="奖励到账并开放提现后，可在这里发起申请。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default WithdrawPage;
