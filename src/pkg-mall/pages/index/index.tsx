import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染商城独立分包首页，业务能力保持在 mall 分包内演进。
const MallIndexPage = observer(function MallIndexPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="商城" className="_pg-shell">
        <View className="_pg-content">
          <Text className="_pg-title">商城</Text>
          <Text className="_pg-desc">商品、购物车和交易前链路在此分包扩展。</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default MallIndexPage;
