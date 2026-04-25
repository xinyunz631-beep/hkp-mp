import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { PageShell } from '@/core/components/PageShell';
import { rootStore } from '@/core/store';

// 渲染会员 tab 占位，仅展示全局用户基础态，不引入会员分包代码。
const MemberTabPage = observer(function MemberTabPage() {
  return (
    <PageShell title="会员" description="会员业务详情进入 member 独立分包，主包只保留入口态。">
      <View>
        <Text>{rootStore.session.user?.nickname || '游客'}</Text>
      </View>
    </PageShell>
  );
});

export default MemberTabPage;
