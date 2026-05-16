import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchWithdrawData } from '@/pkg-member/services/withdraw';
import './index.scss';

// 渲染申请提现页面，具体业务内容按页面需求继续扩展。
const WithdrawPage = observer(function WithdrawPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchWithdrawData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="申请提现" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default WithdrawPage;
