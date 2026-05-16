import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchRecommendData } from '@/pkg-mall/services/recommend';
import './index.scss';

// 渲染推荐商品页面，具体业务内容按页面需求继续扩展。
const RecommendPage = observer(function RecommendPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchRecommendData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="推荐商品" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default RecommendPage;
