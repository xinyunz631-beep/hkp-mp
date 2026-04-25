import { Text, View } from '@tarojs/components';
import { PageShell } from '@/core/components/PageShell';

// 渲染乐园入口占位，后续只承载轻量导航和园区基础信息。
function ParkPage() {
  return (
    <PageShell title="乐园" description="这里预留园区导航入口，具体业务能力放入独立分包。">
      <View>
        <Text>园区服务入口占位</Text>
      </View>
    </PageShell>
  );
}

export default ParkPage;
