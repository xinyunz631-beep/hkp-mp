import { Text, View, type ITouchEvent } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon, type AppIconName } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AuthAction } from '@/core/components/AuthAction';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { rootStore } from '@/core/store';
import { resolveMemberAvatar, resolveMemberLevel } from '@/core/utils/member-profile';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { callWechatPhone, showWechatConfirm } from '@/core/utils/wechat-actions';
import './index.scss';

interface ProfileMetricItem {
  key: string;
  value: string | number;
  label: string;
  route?: string;
  reason: string;
  action?: 'shareIncome';
}

interface ProfileOrderItem {
  key: string;
  title: string;
  icon: AppIconName;
  route: string;
  reason: string;
  badge?: string;
}

interface ProfileServiceItem {
  key: string;
  title: string;
  route?: string;
  reason?: string;
  action?: 'legacyBind' | 'invoice' | 'phone';
}

const PARK_PHONE = '4009778899';
const metrics: ProfileMetricItem[] = [
  {
    key: 'favorites',
    value: 0,
    label: '商品收藏',
    route: MINI_PACKAGE_ROUTES.mallFavorites,
    reason: '登录后可查看商品收藏',
  },
  {
    key: 'coupons',
    value: 5,
    label: '优惠券',
    route: MINI_PACKAGE_ROUTES.memberCoupons,
    reason: '登录后可查看优惠券',
  },
  {
    key: 'income',
    value: 0,
    label: '分销收益',
    action: 'shareIncome',
    reason: '登录后可查看分销收益',
  },
];

const orderActions: ProfileOrderItem[] = [
  {
    key: 'pendingPay',
    title: '待支付',
    icon: 'coupon',
    route: `${MINI_PACKAGE_ROUTES.orderHome}?tab=pendingPay`,
    reason: '登录后可查看待支付订单',
    badge: '1',
  },
  {
    key: 'pendingReceive',
    title: '待收货',
    icon: 'gift',
    route: `${MINI_PACKAGE_ROUTES.orderHome}?tab=pendingReceive`,
    reason: '登录后可查看待收货订单',
  },
  {
    key: 'pendingReview',
    title: '待评价',
    icon: 'list',
    route: `${MINI_PACKAGE_ROUTES.orderHome}?tab=pendingReview`,
    reason: '登录后可查看待评价订单',
  },
  {
    key: 'aftersale',
    title: '退换/售后',
    icon: 'service',
    route: MINI_PACKAGE_ROUTES.orderAftersaleList,
    reason: '登录后可查看售后记录',
  },
  {
    key: 'orders',
    title: '我的订单',
    icon: 'order',
    route: MINI_PACKAGE_ROUTES.orderHome,
    reason: '登录后可查看订单',
  },
];

const serviceActions: ProfileServiceItem[] = [
  {
    key: 'member',
    title: '会员权益',
    route: MINI_PACKAGE_ROUTES.memberGrowth,
    reason: '登录后可查看会员权益',
  },
  {
    key: 'address',
    title: '我的地址',
    route: MINI_PACKAGE_ROUTES.orderAddress,
    reason: '登录后可管理地址',
  },
  {
    key: 'legacyBind',
    title: '老会员绑定',
    action: 'legacyBind',
    reason: '登录后可绑定老会员权益',
  },
  {
    key: 'invoice',
    title: '开发票',
    action: 'invoice',
    reason: '登录后可按订单申请发票',
  },
  {
    key: 'phone',
    title: '联系客服',
    action: 'phone',
  },
];

function openMiniRoute(route: string) {
  navigateToMiniRoute(route);
}

function handleLegacyBind() {
  navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberLegacyBind);
}

async function handleInvoice() {
  const confirmed = await showWechatConfirm({
    title: '开发票',
    content: '发票申请需从已完成订单发起，是否前往订单中心查看可申请订单？',
    confirmText: '查看订单',
    cancelText: '知道了',
  });

  if (confirmed) {
    openMiniRoute(MINI_PACKAGE_ROUTES.orderHome);
  }
}

async function handleShareIncome() {
  const confirmed = await showWechatConfirm({
    title: '分销收益',
    content: '当前暂无可结算收益，奖励入账后会在这里展示明细。如需了解邀请奖励规则，可以联系乐园客服。',
    confirmText: '联系客服',
    cancelText: '知道了',
  });

  if (confirmed) {
    await callWechatPhone(PARK_PHONE);
  }
}

function handleServiceAction(item: ProfileServiceItem) {
  if (item.route) {
    openMiniRoute(item.route);
    return;
  }

  if (item.action === 'legacyBind') {
    void handleLegacyBind();
    return;
  }

  if (item.action === 'invoice') {
    void handleInvoice();
    return;
  }

  if (item.action === 'phone') {
    void callWechatPhone(PARK_PHONE);
  }
}

function handleMetricTap(item: ProfileMetricItem) {
  if (item.route) {
    openMiniRoute(item.route);
    return;
  }

  if (item.action === 'shareIncome') {
    void handleShareIncome();
  }
}

function handleLevelTap(event: ITouchEvent) {
  event.stopPropagation();
  navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberGrowth);
}

function renderMetric(item: ProfileMetricItem) {
  return (
    <AuthAction
      className="_pg-metric"
      key={item.key}
      reason={item.reason}
      onAuthed={() => handleMetricTap(item)}
    >
      <Text className="_pg-metric_value">{item.value}</Text>
      <Text className="_pg-metric_label">{item.label}</Text>
    </AuthAction>
  );
}

function renderOrderAction(item: ProfileOrderItem) {
  return (
    <AuthAction
      className="_pg-order_action"
      key={item.key}
      reason={item.reason}
      onAuthed={() => openMiniRoute(item.route)}
    >
      <View className="_pg-order_icon-wrap">
        <AppIcon name={item.icon} size={26} color="#ec6d9c" />
        {item.badge ? <Text className="_pg-order_badge">{item.badge}</Text> : null}
      </View>
      <Text className="_pg-order_label">{item.title}</Text>
    </AuthAction>
  );
}

function renderServiceAction(item: ProfileServiceItem) {
  const content = (
    <>
      <Text className="_pg-service_label">{item.title}</Text>
      <AppIcon name="arrowRight" size={14} color="#b5bac1" />
    </>
  );

  if (item.reason) {
    return (
      <AuthAction
        className="_pg-service_row"
        key={item.key}
        reason={item.reason}
        onAuthed={() => handleServiceAction(item)}
      >
        {content}
      </AuthAction>
    );
  }

  return (
    <View className="_pg-service_row" key={item.key} onClick={() => handleServiceAction(item)}>
      {content}
    </View>
  );
}

const MemberPage = observer(function MemberPage() {
  const pageRuntime = usePageRuntime();
  const memberProfile = rootStore.member.profile;
  const memberLevel = resolveMemberLevel(memberProfile);
  const memberAvatar = resolveMemberAvatar(memberProfile);
  const displayName = memberProfile?.nickname || '微信用户';

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="Hello Kitty Park"
        description="我的订单、会员权益和服务工具入口。"
        className="_pg-shell"
        reserveTabBarSpace
      >
        <View className="_pg-content">
          <View className="_pg-hero">
            <View className="_pg-hero_decor _pg-hero_decor--one" />
            <View className="_pg-hero_decor _pg-hero_decor--two" />
            <View className="_pg-hero_decor _pg-hero_decor--three" />
            <AuthAction
              className="_pg-hero_user"
              reason="登录后可查看个人信息"
              onAuthed={() => openMiniRoute(MINI_PACKAGE_ROUTES.memberProfile)}
            >
              <AppImage
                className="_pg-hero_avatar"
                src={memberAvatar}
                width={96}
                height={96}
              />
              <View className="_pg-hero_info">
                <Text className="_pg-hero_name">{displayName}</Text>
                <View className="_pg-hero_level" onClick={handleLevelTap}>
                  <Text className="_pg-hero_level-no">{memberLevel.levelNo}</Text>
                  <Text className="_pg-hero_level-name">{memberLevel.levelName}</Text>
                </View>
              </View>
            </AuthAction>

            <View className="_pg-metrics">{metrics.map((item) => renderMetric(item))}</View>
          </View>

          <View className="_pg-order-card">
            <View className="_pg-order_grid">{orderActions.map((item) => renderOrderAction(item))}</View>
            <View className="_pg-order_line" />
          </View>

          <View className="_pg-service">
            <Text className="_pg-service_title">服务&工具</Text>
            <View className="_pg-service_list">{serviceActions.map((item) => renderServiceAction(item))}</View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default MemberPage;
