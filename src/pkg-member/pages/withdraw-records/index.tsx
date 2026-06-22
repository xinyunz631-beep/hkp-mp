import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染提现记录的暂缓状态，完整业务页另行进入。
const WithdrawRecordsPage = observer(function WithdrawRecordsPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="提现记录" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="提现记录准备中"
            description="提现申请提交后，会在这里保留处理记录。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default WithdrawRecordsPage;
