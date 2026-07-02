import { useEffect, useMemo, useState } from 'react';
import { useDidShow } from '@tarojs/taro';
import { Text, View, type ITouchEvent } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon, type AppIconName } from '@/core/components/AppIcon';
import { AuthAction } from '@/core/components/AuthAction';
import { MemberAvatar } from '@/core/components/MemberAvatar';
import { MemberLevelBadge } from '@/core/components/MemberLevelBadge';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { fetchBffMemberCoupons, type BffMemberCouponsResponse } from '@/core/services/bff-coupon-api';
import { fetchBffCrmProfile } from '@/core/services/bff-crm-api';
import { fetchOrderStatusBadgeCounts, type OrderStatusBadgeCounts } from '@/core/services/order-status-badges';
import { openCustomerService } from '@/core/services/customer-service';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { rootStore } from '@/core/store';
import { resolveMemberAvatar, resolveMemberLevel } from '@/core/utils/member-profile';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { callWechatPhone, showAppModal } from '@/core/utils/wechat-actions';
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

interface MemberMetricState {
  favoriteCount?: number;
  couponCount?: number;
  orderBadgeCounts?: OrderStatusBadgeCounts;
}

const PROFILE_INVOICE_PHONE = '4009778899';
const PROFILE_INVOICE_PHONE_TEXT = '4009-778899';

const orderActions: ProfileOrderItem[] = [
  {
    key: 'pendingPay',
    title: '待支付',
    icon: 'coupon',
    route: `${MINI_PACKAGE_ROUTES.orderHome}?tab=pendingPay`,
    reason: '登录后可查看待支付订单',
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
    key: 'cards',
    title: '我的卡包',
    route: MINI_PACKAGE_ROUTES.memberCards,
    reason: '登录后可查看我的卡包',
  },
  {
    key: 'exchangeCode',
    title: '兑换券码',
    route: `${MINI_PACKAGE_ROUTES.memberCouponCenter}?tab=exchangeCode`,
    reason: '登录后可使用兑换券码',
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

function formatOrderBadge(count?: number) {
  if (!count || count <= 0) return undefined;
  return count > 99 ? '99+' : String(count);
}

// 从我的优惠券 BFF 响应里读取真实券资产数量，避免使用会员概况里的旧汇总字段。
function resolveMemberCouponCount(response?: BffMemberCouponsResponse) {
  if (!response) return undefined;

  if (typeof response.total === 'number' && Number.isFinite(response.total)) {
    return Math.max(0, response.total);
  }

  const statusCountTotal = Object.values(response.statusCounts ?? {}).reduce<number>((sum, count) => (
    typeof count === 'number' && Number.isFinite(count) ? sum + count : sum
  ), 0);

  if (statusCountTotal > 0) return statusCountTotal;

  return (response.list ?? response.coupons ?? []).length;
}

function buildOrderActionItems(counts?: OrderStatusBadgeCounts) {
  return orderActions.map((item) => ({
    ...item,
    badge: formatOrderBadge(counts?.[item.key as keyof OrderStatusBadgeCounts]),
  }));
}

function handleLegacyBind() {
  navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberLegacyBind);
}

async function handleInvoice() {
  const result = await showAppModal({
    content: `乐园开发票请致电:${PROFILE_INVOICE_PHONE_TEXT}`,
    confirmText: '确定',
    cancelText: '取消',
    confirmColor: '#07c160',
  });

  if (result.confirm) {
    await callWechatPhone(PROFILE_INVOICE_PHONE);
  }
}

async function handleShareIncome() {
  await showAppModal({
    title: '分销收益',
    content: '分享收益服务正在整理中，开放后可在会员中心查看。',
    confirmText: '知道了',
    showCancel: false,
  });
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
    void openCustomerService({ source: 'member' });
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
  const [memberMetrics, setMemberMetrics] = useState<MemberMetricState>({});
  const memberProfile = rootStore.memberInfo;
  const memberLevel = resolveMemberLevel(memberProfile);
  const memberAvatar = resolveMemberAvatar(memberProfile);
  const displayName = memberProfile?.nickname || '微信用户';
  const orderActionItems = useMemo(
    () => buildOrderActionItems(memberMetrics.orderBadgeCounts),
    [memberMetrics.orderBadgeCounts],
  );
  const metrics = useMemo<ProfileMetricItem[]>(() => [
    {
      key: 'favorites',
      value: typeof memberMetrics.favoriteCount === 'number' && Number.isFinite(memberMetrics.favoriteCount)
        ? memberMetrics.favoriteCount
        : '-',
      label: '商品收藏',
      route: MINI_PACKAGE_ROUTES.mallFavorites,
      reason: '登录后可查看商品收藏',
    },
    {
      key: 'coupons',
      value: typeof memberMetrics.couponCount === 'number' && Number.isFinite(memberMetrics.couponCount)
        ? memberMetrics.couponCount
        : '-',
      label: '优惠券',
      route: MINI_PACKAGE_ROUTES.memberCoupons,
      reason: '登录后可查看优惠券',
    },
    {
      key: 'income',
      value: '-',
      label: '分销收益',
      action: 'shareIncome',
      reason: '登录后可查看分销收益',
    },
  ], [memberMetrics.couponCount, memberMetrics.favoriteCount]);

  async function refreshMemberMetrics() {
    if (!rootStore.isLoggedIn) {
      setMemberMetrics({});
      return;
    }

    try {
      const [profile, couponData, orderBadgeCounts] = await Promise.all([
        fetchBffCrmProfile(),
        fetchBffMemberCoupons({ page: 1, size: 1 }).catch(() => undefined),
        fetchOrderStatusBadgeCounts().catch(() => undefined),
      ]);
      setMemberMetrics({
        couponCount: resolveMemberCouponCount(couponData),
        favoriteCount: profile.favoriteCount,
        orderBadgeCounts,
      });
    } catch {
      // 会员页指标失败时保持现有页面可用，不回退假数据。
      setMemberMetrics({});
    }
  }

  useEffect(() => {
    void refreshMemberMetrics();
  }, [rootStore.isLoggedIn]);

  useDidShow(() => {
    void refreshMemberMetrics();
  });

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
              <MemberAvatar
                className="_pg-hero_avatar"
                src={memberAvatar}
              />
              <View className="_pg-hero_info">
                <Text className="_pg-hero_name">{displayName}</Text>
                <View className="_pg-hero_level" onClick={handleLevelTap}>
                  <MemberLevelBadge levelNo={memberLevel.levelNo} levelName={memberLevel.levelName} />
                </View>
              </View>
            </AuthAction>

            <View className="_pg-metrics">{metrics.map((item) => renderMetric(item))}</View>
          </View>

          <View className="_pg-order-card">
            <View className="_pg-order_grid">{orderActionItems.map((item) => renderOrderAction(item))}</View>
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
