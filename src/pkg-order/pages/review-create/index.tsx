import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchReviewCreateData } from '@/pkg-order/services/review-create';
import './index.scss';

// 渲染创建评价页面，具体业务内容按页面需求继续扩展。
const ReviewCreatePage = observer(function ReviewCreatePage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchReviewCreateData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="创建评价" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default ReviewCreatePage;
