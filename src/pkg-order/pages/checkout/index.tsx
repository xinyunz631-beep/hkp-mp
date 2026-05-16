import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCheckoutData } from '@/pkg-order/services/checkout';
import './index.scss';

// 渲染确认订单页面，具体业务内容按页面需求继续扩展。
const CheckoutPage = observer(function CheckoutPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchCheckoutData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="确认订单" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default CheckoutPage;
