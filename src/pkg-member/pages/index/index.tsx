import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { rootStore } from '@/core/store';
import { showWechatToast } from '@/core/utils/wechat-actions';
import {
  fetchMemberHomeData,
  type MemberHomeData,
  type MemberHomeSectionItem,
  type MemberHomeShortcut,
} from '@/pkg-member/services';
import './index.scss';

// 统一处理会员页手机号展示，避免页面直接暴露完整号码。
function maskMobile(mobile?: string) {
  if (!mobile) return '手机号待同步';
  if (mobile.length < 7) return mobile;
  return `${mobile.slice(0, 3)}****${mobile.slice(-4)}`;
}

// 解析会员首页快捷入口跳转，保证页面不散写路由判断。
function resolveShortcutRoute(action: MemberHomeShortcut['action']) {
  if (action === 'memberCode') return MINI_PACKAGE_ROUTES.memberCode;
  if (action === 'coupons') return MINI_PACKAGE_ROUTES.memberCoupons;
  if (action === 'orders') return MINI_PACKAGE_ROUTES.orderHome;
  if (action === 'address') return MINI_PACKAGE_ROUTES.orderAddress;
  return '';
}

// 解析会员服务区的跳转目标，后续真实页面补齐时只改这里。
function resolveSectionRoute(action: MemberHomeSectionItem['action']) {
  if (action === 'coupons') return MINI_PACKAGE_ROUTES.memberCoupons;
  if (action === 'orders') return MINI_PACKAGE_ROUTES.orderHome;
  if (action === 'parkGuide') return MINI_PACKAGE_ROUTES.ticketParkGuide;
  if (action === 'ticketBooking') return MINI_PACKAGE_ROUTES.ticketBooking;
  return '';
}

// 会员首页快捷入口统一映射图标，优先复用项目图标封装。
function resolveShortcutIcon(action: MemberHomeShortcut['action']) {
  if (action === 'memberCode') return 'check' as const;
  if (action === 'coupons') return 'list' as const;
  if (action === 'orders') return 'order' as const;
  if (action === 'address') return 'service' as const;
  return 'home' as const;
}

// 渲染会员独立分包首页，收口会员资料、快捷入口和权益服务首版。
const MemberIndexPage = observer(function MemberIndexPage() {
  const [pageData, setPageData] = useState<MemberHomeData>();
  const memberProfile = rootStore.member.profile;
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMemberHomeData();
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可查看会员权益',
  });

  // 处理会员首页快捷入口跳转，未开放能力统一走轻提示兜底。
  function handleShortcutTap(shortcut: MemberHomeShortcut) {
    if (shortcut.disabled) {
      void showWechatToast('该服务按计划暂缓到核心板块完成后处理');
      return;
    }

    const nextRoute = resolveShortcutRoute(shortcut.action);
    if (!nextRoute) {
      void showWechatToast('该服务按计划暂缓到核心板块完成后处理');
      return;
    }

    Taro.navigateTo({ url: nextRoute });
  }

  // 处理会员权益和更多服务区动作，避免 render 内散写业务分支。
  function handleSectionTap(item: MemberHomeSectionItem) {
    if (item.disabled) {
      void showWechatToast('分销和提现按当前计划暂缓到最后处理');
      return;
    }

    const nextRoute = resolveSectionRoute(item.action);
    if (!nextRoute) {
      void showWechatToast('该服务按计划暂缓到核心板块完成后处理');
      return;
    }

    Taro.navigateTo({ url: nextRoute });
  }

  return pageRuntime.renderPage(() => {
    if (!pageData) return null;

    const displayName = memberProfile?.nickname || '乐园会员';
    const displayLevel = memberProfile?.levelName || 'Hello Kitty Park 会员';
    const displayPoints = memberProfile?.points ?? pageData.points;
    const displayMobile = maskMobile(memberProfile?.mobile);

    return (
      <View className="_pg">
        <PageShell title="会员中心" className="_pg-shell" reserveTabBarSpace={false} scrollViewProps={{}}>
          <View className="_pg-content">
            <View className="_pg-hero">
              <Text className="_pg-hero_badge">Hello Kitty Park Member</Text>
              <View className="_pg-hero_profile">
                <AppImage
                  className="_pg-hero_avatar"
                  src={memberProfile?.avatarUrl}
                  width={88}
                  height={88}
                />
                <View className="_pg-hero_profile-main">
                  <Text className="_pg-hero_name">{displayName}</Text>
                  <Text className="_pg-hero_meta">{displayLevel}</Text>
                  <Text className="_pg-hero_mobile">{displayMobile}</Text>
                </View>
                <View className="_pg-hero_status">
                  <Text>权益已开启</Text>
                </View>
              </View>

              <View className="_pg-hero_stats">
                <View className="_pg-hero_stat">
                  <Text className="_pg-hero_stat-label">当前积分</Text>
                  <Text className="_pg-hero_stat-value">{displayPoints}</Text>
                </View>
                <View className="_pg-hero_stat">
                  <Text className="_pg-hero_stat-label">可用卡券</Text>
                  <Text className="_pg-hero_stat-value">{pageData.couponCount}</Text>
                </View>
              </View>

              <Text className="_pg-hero_growth">{pageData.growthText}</Text>
            </View>

            <View className="_pg-summary">
              <View className="_pg-summary_header">
                <View>
                  <Text className="_pg-summary_title">本月福利</Text>
                  <Text className="_pg-summary_desc">{pageData.couponHintText}</Text>
                </View>
                <View
                  className="_pg-summary_link"
                  onClick={() => Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.memberCoupons })}
                >
                  <Text>查看卡券</Text>
                  <AppIcon name="arrowRight" size={14} color="#db2777" />
                </View>
              </View>
              <View className="_pg-summary_card">
                <Text className="_pg-summary_card-label">推荐先用</Text>
                <Text className="_pg-summary_card-title">会员专享优惠券</Text>
                <Text className="_pg-summary_card-value">{pageData.couponCount} 张可用</Text>
              </View>
            </View>

            <View className="_pg-shortcuts">
              {pageData.shortcuts.map((shortcut) => (
                <View
                  className="_pg-shortcuts_item"
                  key={shortcut.key}
                  onClick={() => handleShortcutTap(shortcut)}
                >
                  <View className="_pg-shortcuts_icon">
                    <AppIcon name={resolveShortcutIcon(shortcut.action)} size={16} color="#db2777" />
                  </View>
                  <Text className="_pg-shortcuts_title">{shortcut.title}</Text>
                  <Text className="_pg-shortcuts_value">{shortcut.value}</Text>
                </View>
              ))}
            </View>

            {pageData.sections.map((section) => (
              <View className="_pg-section" key={section.title}>
                <Text className="_pg-section_title">{section.title}</Text>
                <View className="_pg-section_list">
                  {section.items.map((item) => (
                    <View
                      className={`_pg-section_item ${item.disabled ? '_pg-section_item--disabled' : ''}`}
                      key={item.key}
                      onClick={() => handleSectionTap(item)}
                    >
                      <View className="_pg-section_item-main">
                        <Text className="_pg-section_item-title">{item.title}</Text>
                        <Text className="_pg-section_item-desc">{item.desc}</Text>
                      </View>
                      <View className="_pg-section_item-action">
                        <Text className="_pg-section_item-tag">{item.disabled ? '暂缓' : '查看'}</Text>
                        <AppIcon name="arrowRight" size={14} color={item.disabled ? '#98a2b3' : '#db2777'} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </PageShell>
      </View>
    );
  });
});

export default MemberIndexPage;
