import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AuthAction } from '@/core/components/AuthAction';
import { PageShell } from '@/core/components/PageShell';
import { rootStore } from '@/core/store';

// 渲染会员 tab 页面，仅展示全局会员态和分包入口。
const MemberTabPage = observer(function MemberTabPage() {
  // 跳转会员分包，主包不 import 会员业务实现。
  function openMemberCenter() {
    Taro.navigateTo({ url: '/pkg-member/pages/index/index' });
  }

  return (
    <PageShell title="会员" description="会员等级、积分和权益入口。">
      <View className="page-shell__section">
        <View className="page-shell__section-title">{rootStore.session.user?.nickname || '游客'}</View>
        <View className="page-shell__muted">
          {rootStore.session.user
            ? `${rootStore.session.user.levelName} · ${rootStore.session.user.points} 积分`
            : '登录后查看等级、积分、卡券和权益'}
        </View>
        <AuthAction className="member-entry" reason="登录后可进入会员中心" onAuthed={openMemberCenter}>
          <Text>{rootStore.session.isLoggedIn ? '进入会员中心' : '登录并查看会员权益'}</Text>
        </AuthAction>
      </View>
    </PageShell>
  );
});

export default MemberTabPage;
