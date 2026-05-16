import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchDetailData } from '@/pkg-order/services/detail';
import './index.scss';

// 渲染订单详情页面，具体业务内容按页面需求继续扩展。
const DetailPage = observer(function DetailPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchDetailData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="订单详情" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default DetailPage;
