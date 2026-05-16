import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染点餐独立分包首页，餐厅和菜单能力在此分包扩展。
const DiningIndexPage = observer(function DiningIndexPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="餐饮" className="_pg-shell">
        <View className="_pg-content">
          <Text className="_pg-title">餐饮</Text>
          <Text className="_pg-desc">餐厅、菜单、取餐或配送能力在此分包扩展。</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default DiningIndexPage;
