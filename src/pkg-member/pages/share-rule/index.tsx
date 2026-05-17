import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchShareRuleData } from '@/pkg-member/services/share-rule';
import './index.scss';

// 渲染分享规则的暂缓状态，完整业务页另行进入。
const ShareRulePage = observer(function ShareRulePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchShareRuleData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="分享规则" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="分享规则准备中"
            description="邀请奖励规则正在整理，开放后会在这里展示。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default ShareRulePage;
