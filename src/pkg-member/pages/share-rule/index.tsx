import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchShareRuleData } from '@/pkg-member/services/share-rule';
import './index.scss';

// 渲染分享规则页面，具体业务内容按页面需求继续扩展。
const ShareRulePage = observer(function ShareRulePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchShareRuleData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="分享规则" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ShareRulePage;
