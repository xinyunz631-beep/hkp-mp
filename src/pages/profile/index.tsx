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
import {
  callWechatPhone,
  showWechatConfirm,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import './index.scss';

interface ProfileActionItem {
  key: string;
  title: string;
  desc: string;
  route?: MiniPackageRoute;
  action?: 'guests';
  reason?: string;
  tag?: string;
}

const PARK_PHONE = '4009778899';

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
    desc: '最近联系人下单时可复用',
    action: 'guests',
    reason: '登录后可管理常用游客',
    tag: '已同步',
  },
];

function maskMobile(mobile?: string) {
  if (!mobile) return '登录后同步手机号';
  if (mobile.length < 7) return mobile;
  return `${mobile.slice(0, 3)}****${mobile.slice(-4)}`;
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

  async function handleLogout() {
    const confirmed = await showWechatConfirm({
      title: '退出登录',
      content: '退出后仍可浏览首页、乐园和商城公开内容，订单和会员权益需要重新登录后查看。',
      confirmText: '退出',
      cancelText: '取消',
    });
    if (!confirmed) return;

    logout();
    await showWechatToast('已退出登录', 'success');
  }

  async function handleLocalAction(item: ProfileActionItem) {
    if (item.action === 'guests') {
      const confirmed = await showWechatConfirm({
        title: '常用游客',
        content: '当前本地 mock 已同步 2 位最近联系人，门票和酒店下单时会自动带入可选联系人。',
        confirmText: '去预定门票',
        cancelText: '知道了',
      });

      if (confirmed) {
        openRoute(MINI_PACKAGE_ROUTES.ticketBooking);
      }
    }
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
      if (item.reason) {
        return (
          <AuthAction
            className="_pg-action"
            key={item.key}
            reason={item.reason}
            onAuthed={() => {
              void handleLocalAction(item);
            }}
          >
            {content}
          </AuthAction>
        );
      }

      return (
        <View className="_pg-action" key={item.key} onClick={() => void handleLocalAction(item)}>
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
                  <AppIcon name={item.key === 'orders' ? 'order' : item.key === 'address' ? 'service' : 'list'} size={16} color="#db2777" />
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
              <View className="_pg-action" onClick={() => void callWechatPhone(PARK_PHONE)}>
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
