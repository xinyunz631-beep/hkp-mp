import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { rootStore } from '@/core/store';

// 渲染主包首页占位，避免在主包提前引入业务分包实现。
const HomePage = observer(function HomePage() {
  return (
    <PageShell title="乐园首页" description="主包仅保留入口和轻量全局能力，业务功能进入独立分包。">
      <View>
        <Text>当前园区：{rootStore.park.currentParkId || '待选择'}</Text>
      </View>
    </PageShell>
  );
});

export default HomePage;
