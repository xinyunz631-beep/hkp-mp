import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchMerchantDetailData } from '@/pkg-dining/services/merchant-detail';
import './index.scss';

// 渲染商家详情的暂缓状态，完整业务页另行进入。
const MerchantDetailPage = observer(function MerchantDetailPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchMerchantDetailData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商家详情" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="商家详情准备中"
            description="餐厅菜单和套餐选择正在整理，开放后可在这里查看详情。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default MerchantDetailPage;
