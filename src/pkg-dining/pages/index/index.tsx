import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染餐饮首页的暂缓状态，不提前进入完整点餐 UI。
const DiningIndexPage = observer(function DiningIndexPage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="餐饮" className="_pg-shell">
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="餐饮服务准备中"
            description="园内餐厅和套餐下单能力正在整理，可以先返回乐园查看票务或酒店服务。"
          />
        </View>
      </PageShell>
    </View>
  ));
});

export default DiningIndexPage;
