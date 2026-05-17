import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchShareInviteData } from '@/pkg-member/services/share-invite';
import './index.scss';

// 渲染邀请明细的暂缓状态，完整业务页另行进入。
const ShareInvitePage = observer(function ShareInvitePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchShareInviteData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="邀请明细" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="邀请明细准备中"
            description="好友通过你的邀请完成下单后会在这里展示记录。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default ShareInvitePage;
