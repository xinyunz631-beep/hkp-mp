import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCouponsData } from '@/pkg-member/services/coupons';
import './index.scss';

// 渲染优惠券页面，具体业务内容按页面需求继续扩展。
const CouponsPage = observer(function CouponsPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchCouponsData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="优惠券" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default CouponsPage;
