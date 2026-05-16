import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchShareInviteData } from '@/pkg-member/services/share-invite';
import './index.scss';

// 渲染邀请明细页面，具体业务内容按页面需求继续扩展。
const ShareInvitePage = observer(function ShareInvitePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchShareInviteData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="邀请明细" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ShareInvitePage;
