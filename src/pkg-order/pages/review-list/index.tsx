import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchReviewListData } from '@/pkg-order/services/review-list';
import './index.scss';

// 渲染评价列表页面，具体业务内容按页面需求继续扩展。
const ReviewListPage = observer(function ReviewListPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchReviewListData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="评价列表" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ReviewListPage;
