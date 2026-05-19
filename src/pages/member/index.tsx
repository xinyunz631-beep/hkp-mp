import Taro, { useShareAppMessage } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon, type AppIconName } from '@/core/components/AppIcon';
import { AppShareButton } from '@/core/components/AppShareButton';
import { AuthAction } from '@/core/components/AuthAction';
import { PageShell } from '@/core/components/PageShell';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES, type MiniPackageRoute } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { rootStore } from '@/core/store';

interface MemberTabEntry {
  key: string;
  title: string;
  desc: string;
  icon: AppIconName;
  route?: MiniPackageRoute;
  action?: 'share';
  reason: string;
}

const memberEntries: MemberTabEntry[] = [
  {
    key: 'code',
    title: '会员码',
    desc: '入园核销与身份识别',
    icon: 'code',
    route: MINI_PACKAGE_ROUTES.memberCode,
    reason: '登录后可查看会员码',
  },
  {
    key: 'coupons',
    title: '优惠券',
    desc: '可用、已用、过期卡券',
    icon: 'coupon',
    route: MINI_PACKAGE_ROUTES.memberCoupons,
    reason: '登录后可查看优惠券',
  },
  {
    key: 'orders',
    title: '我的订单',
    desc: '票务、酒店、商城订单',
    icon: 'order',
    route: MINI_PACKAGE_ROUTES.orderHome,
    reason: '登录后可查看订单',
  },
  {
    key: 'address',
    title: '地址管理',
    desc: '维护常用收货地址',
    icon: 'location',
    route: MINI_PACKAGE_ROUTES.orderAddress,
    reason: '登录后可管理地址',
  },
  {
    key: 'aftersale',
    title: '售后记录',
    desc: '退款、退货处理进度',
    icon: 'service',
    route: MINI_PACKAGE_ROUTES.orderAftersaleList,
    reason: '登录后可查看售后记录',
  },
  {
    key: 'share',
    title: '分享乐园',
    desc: '把会员福利分享给好友',
    icon: 'share',
    action: 'share',
    reason: '分享给好友',
  },
];

const benefitCards = [
  {
    key: 'ticket',
    title: '生日月礼遇',
    desc: '生日月可领取门票权益券',
    route: MINI_PACKAGE_ROUTES.memberCoupons,
  },
  {
    key: 'mall',
    title: '商城会员价',
    desc: '官方商城周边享会员专属优惠',
    route: MINI_PACKAGE_ROUTES.mallHome,
  },
  {
    key: 'ticketBooking',
    title: '优先预定',
    desc: '热门票种与活动入口提前触达',
    route: MINI_PACKAGE_ROUTES.ticketBooking,
  },
];

// 渲染会员 tab 页面，作为会员基础能力的主包聚合入口。
const MemberTabPage = observer(function MemberTabPage() {
  const pageRuntime = usePageRuntime();
  const memberProfile = rootStore.member.profile;
  const isLoggedIn = rootStore.member.isLoggedIn;
  const displayName = memberProfile?.nickname || '乐园游客';
  const displayLevel = memberProfile?.levelName || 'Hello Kitty Park 会员';
  const displayPoints = memberProfile?.points ?? 1280;

  // 跳转会员分包，主包不 import 会员业务实现。
  function openRoute(route: MiniPackageRoute) {
    Taro.navigateTo({ url: route });
  }

  function handleEntry(entry: MemberTabEntry) {
    if (entry.route) {
      openRoute(entry.route);
      return;
    }
  }

  useShareAppMessage(() => ({
    title: `${displayName}邀请你一起游玩 Hello Kitty 乐园`,
    path: MINI_MAIN_ROUTES.member,
  }));

  function renderEntry(entry: MemberTabEntry) {
    const entryContent = (
      <>
        <View className="_pg-entry_icon">
          <AppIcon name={entry.icon} size={16} color="#db2777" />
        </View>
        <View className="_pg-entry_main">
          <Text className="_pg-entry_title">{entry.title}</Text>
          <Text className="_pg-entry_desc">{entry.desc}</Text>
        </View>
        <AppIcon name="arrowRight" size={14} color="#98a2b3" />
      </>
    );

    if (entry.action === 'share') {
      return (
        <AppShareButton className="_pg-entry _pg-entry--button" key={entry.key}>
          {entryContent}
        </AppShareButton>
      );
    }

    return (
      <AuthAction
        className="_pg-entry"
        key={entry.key}
        reason={entry.reason}
        onAuthed={() => handleEntry(entry)}
      >
        {entryContent}
      </AuthAction>
    );
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="会员" description="会员等级、积分和权益入口。" className="_pg-shell" reserveTabBarSpace={false}>
        <View className="_pg-content">
          <View className="_pg-hero">
            <View className="_pg-hero_top">
              <View>
                <Text className="_pg-hero_badge">HKP MEMBER</Text>
                <Text className="_pg-hero_name">{displayName}</Text>
                <Text className="_pg-hero_meta">{isLoggedIn ? displayLevel : '登录后查看等级、积分、卡券和权益'}</Text>
              </View>
              <AuthAction
                className="_pg-hero_action"
                reason="登录后可进入会员中心"
                onAuthed={() => openRoute(MINI_PACKAGE_ROUTES.memberHome)}
              >
                <Text>{isLoggedIn ? '会员中心' : '立即登录'}</Text>
              </AuthAction>
            </View>

            <View className="_pg-hero_stats">
              <AuthAction
                className="_pg-hero_stat"
                reason="登录后可查看积分"
                onAuthed={() => openRoute(MINI_PACKAGE_ROUTES.memberHome)}
              >
                <Text className="_pg-hero_stat-value">{isLoggedIn ? displayPoints : '--'}</Text>
                <Text className="_pg-hero_stat-label">乐园积分</Text>
              </AuthAction>
              <AuthAction
                className="_pg-hero_stat"
                reason="登录后可查看优惠券"
                onAuthed={() => openRoute(MINI_PACKAGE_ROUTES.memberCoupons)}
              >
                <Text className="_pg-hero_stat-value">{isLoggedIn ? '8' : '--'}</Text>
                <Text className="_pg-hero_stat-label">可用卡券</Text>
              </AuthAction>
              <AuthAction
                className="_pg-hero_stat"
                reason="登录后可查看会员码"
                onAuthed={() => openRoute(MINI_PACKAGE_ROUTES.memberCode)}
              >
                <Text className="_pg-hero_stat-value">码</Text>
                <Text className="_pg-hero_stat-label">会员核销</Text>
              </AuthAction>
            </View>
          </View>

          <View className="_pg-entry-grid">
            {memberEntries.map((entry) => renderEntry(entry))}
          </View>

          <View className="_pg-benefits">
            <View className="_pg-benefits_header">
              <View>
                <Text className="_pg-benefits_title">会员权益</Text>
                <Text className="_pg-benefits_desc">本地 mock 先提供完整可点链路，后续替换真实接口。</Text>
              </View>
              <AuthAction
                className="_pg-benefits_more"
                reason="登录后可查看全部权益"
                onAuthed={() => openRoute(MINI_PACKAGE_ROUTES.memberHome)}
              >
                <Text>全部</Text>
                <AppIcon name="arrowRight" size={14} color="#db2777" />
              </AuthAction>
            </View>

            <View className="_pg-benefits_list">
              {benefitCards.map((card) => (
                <AuthAction
                  className="_pg-benefit"
                  key={card.key}
                  reason="登录后可查看会员权益"
                  onAuthed={() => openRoute(card.route)}
                >
                  <Text className="_pg-benefit_title">{card.title}</Text>
                  <Text className="_pg-benefit_desc">{card.desc}</Text>
                </AuthAction>
              ))}
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default MemberTabPage;
