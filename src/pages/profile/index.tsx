import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AuthAction } from '@/core/components/AuthAction';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { logout } from '@/core/services/auth';
import { rootStore } from '@/core/store';

// 渲染个人中心主包页，承载账户入口和轻量设置能力。
const ProfilePage = observer(function ProfilePage() {
  const pageRuntime = usePageRuntime();
  const memberProfile = rootStore.member.profile;

  // 跳转订单分包，主包不 import 订单业务实现。
  function openOrders() {
    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.orderHome });
  }

  // 退出登录并保留当前页面。
  function handleLogout() {
    logout();
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="我的" description="账户、订单和会员服务入口。" className="_pg-shell">
        <View className="_pg-section">
          <View className="_pg-section_title">{memberProfile?.nickname || '未登录'}</View>
          <View className="_pg-section_desc">
            {memberProfile?.mobile || '登录后可管理订单、游客和会员权益'}
          </View>
        </View>

        <View className="_pg-section">
          <AuthAction className="_pg-profile-action" reason="登录后可查看订单" onAuthed={openOrders}>
            <Text>我的订单</Text>
          </AuthAction>
          <AuthAction className="_pg-profile-action" reason="登录后可管理常用游客" onAuthed={() => undefined}>
            <Text>常用游客</Text>
          </AuthAction>
          {rootStore.member.isLoggedIn ? (
            <View className="_pg-profile-action _pg-profile-action--ghost" onClick={handleLogout}>
              <Text>退出登录</Text>
            </View>
          ) : null}
        </View>
      </PageShell>
    </View>
  ));
});

export default ProfilePage;
