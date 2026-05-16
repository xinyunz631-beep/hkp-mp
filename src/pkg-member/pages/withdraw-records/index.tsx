import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchWithdrawRecordsData } from '@/pkg-member/services/withdraw-records';
import './index.scss';

// 渲染提现记录页面，具体业务内容按页面需求继续扩展。
const WithdrawRecordsPage = observer(function WithdrawRecordsPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchWithdrawRecordsData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="提现记录" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default WithdrawRecordsPage;
