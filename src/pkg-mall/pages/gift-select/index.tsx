import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchGiftSelectData } from '@/pkg-mall/services/gift-select';
import './index.scss';

// 渲染赠品选择页面，具体业务内容按页面需求继续扩展。
const GiftSelectPage = observer(function GiftSelectPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchGiftSelectData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="赠品选择" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default GiftSelectPage;
