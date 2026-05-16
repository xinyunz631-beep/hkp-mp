import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchShareData } from '@/pkg-member/services/share';
import './index.scss';

// 渲染分享收益页面，具体业务内容按页面需求继续扩展。
const SharePage = observer(function SharePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchShareData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="分享收益" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default SharePage;
