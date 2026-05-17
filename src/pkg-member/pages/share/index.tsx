import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchShareData } from '@/pkg-member/services/share';
import './index.scss';

// 渲染分享收益的暂缓状态，完整业务页另行进入。
const SharePage = observer(function SharePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchShareData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="分享收益" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="分享收益准备中"
            description="邀请好友下单后可在这里查看奖励概览。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default SharePage;
