import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染餐饮确认订单的暂缓状态，不提前进入完整下单 UI。
const CheckoutPage = observer(function CheckoutPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="餐饮确认订单" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="餐饮订单准备中"
            description="餐饮下单能力正在整理，暂时无需提交订单。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default CheckoutPage;
