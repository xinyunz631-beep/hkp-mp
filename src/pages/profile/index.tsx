import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AuthAction } from '@/core/components/AuthAction';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES, type MiniPackageRoute } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { logout } from '@/core/services/auth';
import { rootStore } from '@/core/store';
import './index.scss';

interface ProfileActionItem {
  key: string;
  title: string;
  desc: string;
  route?: MiniPackageRoute;
  reason?: string;
  tag?: string;
}

const quickActions: ProfileActionItem[] = [
  {
    key: 'orders',
    title: '我的订单',
    desc: '票务、商城、酒店订单',
    route: MINI_PACKAGE_ROUTES.orderHome,
    reason: '登录后可查看订单',
  },
  {
    key: 'address',
    title: '地址管理',
    desc: '常用收货信息',
    route: MINI_PACKAGE_ROUTES.orderAddress,
    reason: '登录后可管理地址',
  },
  {
    key: 'coupons',
    title: '优惠券',
    desc: '查看可用卡券',
    route: MINI_PACKAGE_ROUTES.memberCoupons,
    reason: '登录后可查看优惠券',
  },
  {
    key: 'member',
    title: '会员中心',
    desc: '积分、权益和会员码',
    route: MINI_PACKAGE_ROUTES.memberHome,
    reason: '登录后可进入会员中心',
  },
];

const serviceActions: ProfileActionItem[] = [
  {
    key: 'aftersale',
    title: '售后记录',
    desc: '退款、退货和处理进度',
    route: MINI_PACKAGE_ROUTES.orderAftersaleList,
    reason: '登录后可查看售后记录',
  },
  {
    key: 'favorites',
    title: '我的收藏',
    desc: '收藏商品和推荐内容',
    route: MINI_PACKAGE_ROUTES.mallFavorites,
    reason: '登录后可查看收藏',
  },
  {
    key: 'guests',
    title: '常用游客',
    desc: '出行人信息即将开放',
    tag: '准备中',
  },
];

function maskMobile(mobile?: string) {
  if (!mobile) return '登录后同步手机号';
  if (mobile.length < 7) return mobile;
  return `${mobile.slice(0, 3)}****${mobile.slice(-4)}`;
}

function showBusinessToast(title: string) {
  Taro.showToast({
    title,
    icon: 'none',
    duration: 1800,
  });
}

// 渲染个人中心主包页，承载账户、订单、地址、售后和会员服务入口。
const ProfilePage = observer(function ProfilePage() {
  const pageRuntime = usePageRuntime();
  const memberProfile = rootStore.member.profile;
  const isLoggedIn = rootStore.member.isLoggedIn;
  const displayName = memberProfile?.nickname || '乐园游客';
  const displayLevel = memberProfile?.levelName || 'Hello Kitty Park 会员';
  const displayPoints = memberProfile?.points ?? 0;

  function openRoute(route: MiniPackageRoute) {
    Taro.navigateTo({ url: route });
  }

  function handleLogout() {
    logout();
  }

  function renderActionItem(item: ProfileActionItem) {
    const content = (
      <>
        <View className="_pg-action_main">
          <Text className="_pg-action_title">{item.title}</Text>
          <Text className="_pg-action_desc">{item.desc}</Text>
        </View>
        {item.tag ? <Text className="_pg-action_tag">{item.tag}</Text> : null}
        {item.route ? <AppIcon name="arrowRight" size={14} color="#98a2b3" /> : null}
      </>
    );

    if (!item.route) {
      return (
        <View className="_pg-action" key={item.key} onClick={() => showBusinessToast(`${item.title}即将开放`)}>
          {content}
        </View>
      );
    }

    return (
      <AuthAction
        className="_pg-action"
        key={item.key}
        reason={item.reason}
        onAuthed={() => openRoute(item.route as MiniPackageRoute)}
      >
        {content}
      </AuthAction>
    );
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="我的" description="账户、订单和会员服务入口。" className="_pg-shell" reserveTabBarSpace>
        <View className="_pg-content">
          <View className="_pg-hero">
            <View className="_pg-hero_profile">
              <AppImage
                className="_pg-hero_avatar"
                src={memberProfile?.avatarUrl}
                width={92}
                height={92}
              />
              <View className="_pg-hero_main">
                <Text className="_pg-hero_name">{displayName}</Text>
                <Text className="_pg-hero_meta">{isLoggedIn ? displayLevel : '登录后查看订单、权益和卡券'}</Text>
                <Text className="_pg-hero_mobile">{maskMobile(memberProfile?.mobile)}</Text>
              </View>
              {isLoggedIn ? (
                <View className="_pg-hero_status">
                  <Text>已登录</Text>
                </View>
              ) : (
                <AuthAction className="_pg-hero_login" reason="登录后可管理个人中心" onAuthed={() => undefined}>
                  <Text>去登录</Text>
                </AuthAction>
              )}
            </View>

            <View className="_pg-hero_stats">
              <View className="_pg-hero_stat">
                <Text className="_pg-hero_stat-value">{displayPoints}</Text>
                <Text className="_pg-hero_stat-label">乐园积分</Text>
              </View>
              <View className="_pg-hero_stat">
                <Text className="_pg-hero_stat-value">{isLoggedIn ? '查看' : '--'}</Text>
                <Text className="_pg-hero_stat-label">会员卡券</Text>
              </View>
              <View className="_pg-hero_stat">
                <Text className="_pg-hero_stat-value">{isLoggedIn ? '可用' : '--'}</Text>
                <Text className="_pg-hero_stat-label">会员权益</Text>
              </View>
            </View>
          </View>

          <View className="_pg-grid">
            {quickActions.map((item) => (
              <AuthAction
                className="_pg-grid_item"
                key={item.key}
                reason={item.reason}
                onAuthed={() => openRoute(item.route as MiniPackageRoute)}
              >
                <View className="_pg-grid_icon">
                  <AppIcon name={item.key === 'orders' ? 'order' : item.key === 'address' ? 'service' : 'list'} size={18} color="#db2777" />
                </View>
                <Text className="_pg-grid_title">{item.title}</Text>
                <Text className="_pg-grid_desc">{item.desc}</Text>
              </AuthAction>
            ))}
          </View>

          <View className="_pg-section">
            <Text className="_pg-section_title">常用服务</Text>
            <View className="_pg-section_list">
              {serviceActions.map((item) => renderActionItem(item))}
            </View>
          </View>

          <View className="_pg-section">
            <Text className="_pg-section_title">账户设置</Text>
            <View className="_pg-section_list">
              <View className="_pg-action" onClick={() => showBusinessToast('客服服务即将开放')}>
                <View className="_pg-action_main">
                  <Text className="_pg-action_title">联系客服</Text>
                  <Text className="_pg-action_desc">咨询订单、票务和园区服务</Text>
                </View>
                <AppIcon name="arrowRight" size={14} color="#98a2b3" />
              </View>
              {isLoggedIn ? (
                <View className="_pg-action _pg-action--danger" onClick={handleLogout}>
                  <View className="_pg-action_main">
                    <Text className="_pg-action_title">退出登录</Text>
                    <Text className="_pg-action_desc">退出后仍可浏览公开内容</Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default ProfilePage;
