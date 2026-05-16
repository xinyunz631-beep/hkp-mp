import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchMerchantDetailData } from '@/pkg-dining/services/merchant-detail';
import './index.scss';

// 渲染商家详情页面，具体业务内容按页面需求继续扩展。
const MerchantDetailPage = observer(function MerchantDetailPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchMerchantDetailData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商家详情" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default MerchantDetailPage;
