import { View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchRoomDetailData } from '@/pkg-hotel/services/room-detail';
import './index.scss';

// 渲染房间详情页面，具体业务内容按页面需求继续扩展。
const RoomDetailPage = observer(function RoomDetailPage() {
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      await fetchRoomDetailData();
    },
  });

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="房间详情" className="_pg-shell">
        <View className="_pg-content" />
      </PageShell>
    </View>
  ));
});

export default RoomDetailPage;
