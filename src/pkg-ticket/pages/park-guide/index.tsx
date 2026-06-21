import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import './index.scss';

// 渲染乐园导览页面；后端未提供导览资源前只展示业务空态，不使用本地假数据。
const ParkGuidePage = observer(function ParkGuidePage() {
  const pageRuntime = usePageRuntime();

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="乐园导览" className="_pg-shell" reserveTabBarSpace={false}>
        <View className="_pg-content">
          <BaseEmpty
            className="_pg-state"
            title="导览信息准备中"
            description="园区导览信息开放后可在这里查看。"
          />
          <Text className="_pg-tip">到园后可结合现场指引和工作人员提示安排行程。</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default ParkGuidePage;
