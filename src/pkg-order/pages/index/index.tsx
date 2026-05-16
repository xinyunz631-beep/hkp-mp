import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染订单独立分包首页，综合订单列表和详情在此分包扩展。
const OrderIndexPage = observer(function OrderIndexPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="订单" className="_pg-shell">
        <View className="_pg-content">
          <Text className="_pg-title">订单</Text>
          <Text className="_pg-desc">综合订单列表、详情和售后入口在此分包扩展。</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default OrderIndexPage;
