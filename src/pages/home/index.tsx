import { CSSProperties, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCouponUsedCount } from '@/core/services/home';
import { rootStore } from '@/core/store';
import { resolvePageChromeMetrics } from '@/core/utils/style';
import {
  callWechatPhone,
  copyWechatText,
  openWechatLocation,
  scanWechatCode,
  showWechatConfirm,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import type { MiniPackageRoute } from '@/core/constants/routes';
import './index.scss';

interface HomeShortcutEntry {
  key: string;
  title: string;
  path?: MiniPackageRoute;
  requireLogin?: boolean;
  action?: 'phone' | 'shareIncome' | 'location' | 'map';
  deferred?: boolean;
}

interface HomeSectionCard {
  key: string;
  title: string;
  description: string;
  tag?: string;
  rank?: string;
  path?: MiniPackageRoute;
  action?: 'location' | 'map';
}

interface HomePlayCategory {
  key: string;
  title: string;
  path?: MiniPackageRoute;
  action?: 'location' | 'phone' | 'deferred';
}

interface HomeBannerEntry {
  key: string;
  path: MiniPackageRoute;
  requireLogin?: boolean;
}

const PARK_PHONE = '4009778899';
const PARK_LOCATION = {
  latitude: 30.6382,
  longitude: 119.6826,
  name: '杭州 Hello Kitty 乐园',
  address: '浙江省湖州市安吉县天使大道1号',
};

const shortcutEntries: HomeShortcutEntry[] = [
  { key: 'exchange', title: '兑换专区', path: MINI_PACKAGE_ROUTES.memberHome, requireLogin: true },
  { key: 'coupon', title: '领券中心', path: MINI_PACKAGE_ROUTES.memberCoupons, requireLogin: true },
  { key: 'service', title: '服务专区', path: MINI_PACKAGE_ROUTES.ticketHome },
  { key: 'mall', title: '官方商城', path: MINI_PACKAGE_ROUTES.mallHome },
  { key: 'contact', title: '联系客服', action: 'phone' },
  { key: 'share', title: '分享收益', requireLogin: true, action: 'shareIncome', deferred: true },
  { key: 'guide', title: '导航至乐园', action: 'location' },
  { key: 'map', title: '园内地图', path: MINI_PACKAGE_ROUTES.ticketParkGuide, action: 'map' },
];

const hotCards: HomeSectionCard[] = [
  { key: 'wheel', title: '缤纷摩天轮', description: '日间游览人气路线', rank: 'top1', path: MINI_PACKAGE_ROUTES.ticketParkDetail },
  { key: 'river', title: '欢乐漂流', description: '亲子轻刺激项目', rank: 'top2', path: MINI_PACKAGE_ROUTES.ticketParkGuide },
];

const activityCards: HomeSectionCard[] = [
  { key: 'event', title: '限定主题活动', description: '活动时间、地点与预约状态实时更新', tag: '进行中', path: MINI_PACKAGE_ROUTES.ticketHome },
];

const recommendCards: HomeSectionCard[] = [
  { key: 'traffic', title: '交通动线', description: '入园、停车与接驳指引', tag: '快速查看', action: 'location' },
  { key: 'queue', title: '项目排队', description: '热门项目开放与等待', tag: '实时提醒', path: MINI_PACKAGE_ROUTES.ticketParkGuide },
];

const playCategories: HomePlayCategory[] = [
  { key: 'eat', title: '吃', action: 'deferred' },
  { key: 'stay', title: '住', path: MINI_PACKAGE_ROUTES.hotelHome },
  { key: 'go', title: '行', action: 'location' },
  { key: 'play', title: '游', path: MINI_PACKAGE_ROUTES.ticketHome },
  { key: 'shop', title: '购', path: MINI_PACKAGE_ROUTES.mallHome },
  { key: 'fun', title: '娱', path: MINI_PACKAGE_ROUTES.ticketParkGuide },
  { key: 'biz', title: '商', action: 'phone' },
  { key: 'learn', title: '学', action: 'phone' },
  { key: 'news', title: '情', path: MINI_PACKAGE_ROUTES.ticketHome },
];

const heroBannerEntries: HomeBannerEntry[] = [
  { key: 'main', path: MINI_PACKAGE_ROUTES.ticketBooking },
  { key: 'event', path: MINI_PACKAGE_ROUTES.ticketHome },
  { key: 'member', path: MINI_PACKAGE_ROUTES.memberHome, requireLogin: true },
];

function renderHomeImage(className: string, src: string) {
  return <AppImage className={className} src={src} mode="aspectFill" emptyState="error" />;
}

// 渲染主包首页，按当前 Pencil 750px 开发稿实现首页结构和接口图占位。
const HomePage = observer(function HomePage() {
  const [couponCount, setCouponCount] = useState<number>();
  const [chromeMetrics] = useState(resolvePageChromeMetrics);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextCouponCount = await fetchCouponUsedCount();
      setCouponCount(nextCouponCount);
    },
  });
  const memberProfile = rootStore.member.profile;
  const memberName = memberProfile?.nickname || '微信用户';
  const memberLevel = memberProfile?.levelName || '初级会员';
  const memberPoints = memberProfile?.points ?? 1280;
  const couponBadgeText = typeof couponCount === 'number' ? `优惠券 ${couponCount}张` : '优惠券 8张';
  const heroBannerImageSrc = '';
  const shortcutImageSrc = '';
  const openTimeImageSrc = '';
  const rankImageSrc = '';
  const activityImageSrc = '';
  const recommendImageSrc = '';
  const memberBenefitImageSrc = '';
  const playCategoryImageSrc = '';
  const fixedNavStyle: CSSProperties = {
    paddingTop: `${chromeMetrics.statusBarHeight + chromeMetrics.headerContentTopGap}px`,
    paddingRight: `${chromeMetrics.menuRightReserve + 18}px`,
  };

  // 跳转到独立分包页面，主包只持有路径字符串不 import 业务代码。
  function navigateToSubPackage(path: MiniPackageRoute) {
    Taro.navigateTo({ url: path });
  }

  // 展示轻量业务提示，用于当前尚未接入真实页面的入口。
  // 登录后执行业务动作，避免页面散写登录字段判断。
  async function runAfterLogin(reason: string, handler: () => void) {
    const authed = await pageRuntime.ensureLogin(reason);
    if (!authed) return;

    handler();
  }

  // 点击快捷入口时根据配置选择分包跳转、登录守卫或业务提示。
  async function handleHomeAction(action?: HomeShortcutEntry['action'] | HomeSectionCard['action'] | HomePlayCategory['action']) {
    if (action === 'phone') {
      await callWechatPhone(PARK_PHONE);
      return;
    }

    if (action === 'location') {
      await openWechatLocation(PARK_LOCATION);
      return;
    }

    if (action === 'map') {
      navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketParkGuide);
      return;
    }

    if (action === 'shareIncome' || action === 'deferred') {
      await showWechatToast('该服务将在核心板块完成后开放');
    }
  }

  async function handleShortcutPress(entry: HomeShortcutEntry) {
    const action = () => {
      if (entry.path) {
        navigateToSubPackage(entry.path);
        return;
      }

      void handleHomeAction(entry.action);
    };

    if (entry.requireLogin) {
      await runAfterLogin(`登录后可使用${entry.title}`, action);
      return;
    }

    action();
  }

  // 点击签到按钮，未登录时先拉起登录弹窗。
  async function handleSignIn() {
    await runAfterLogin('登录后可完成签到', () => {
      void showWechatToast('签到成功', 'success');
    });
  }

  function handleSearch() {
    navigateToSubPackage(MINI_PACKAGE_ROUTES.mallSearch);
  }

  async function handleScan() {
    const scanResult = await scanWechatCode();
    if (!scanResult?.result) return;

    if (scanResult.result.startsWith('/pkg-')) {
      Taro.navigateTo({ url: scanResult.result });
      return;
    }

    const shouldCopy = await showWechatConfirm({
      title: '扫码结果',
      content: scanResult.result,
      confirmText: '复制内容',
      cancelText: '关闭',
    });

    if (shouldCopy) await copyWechatText(scanResult.result, '扫码内容已复制');
  }

  // 会员福利入口保留登录守卫。
  async function handleMemberBenefitPress() {
    await runAfterLogin('登录后可查看会员专享福利', () => {
      navigateToSubPackage(MINI_PACKAGE_ROUTES.memberHome);
    });
  }

  // 当前首页仅保留开园时间卡，不再展示交通指南 / 乐园导览双按钮。
  function handleSchedulePress() {
    navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketHome);
  }

  async function handleBannerPress(entry: HomeBannerEntry) {
    const action = () => navigateToSubPackage(entry.path);
    if (entry.requireLogin) {
      await runAfterLogin('登录后可查看会员专享内容', action);
      return;
    }

    action();
  }

  function handleSectionMorePress(section: 'rank' | 'activity' | 'recommend' | 'play') {
    if (section === 'recommend') {
      navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketParkGuide);
      return;
    }

    if (section === 'play' || section === 'rank' || section === 'activity') {
      navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketHome);
    }
  }

  async function handleSectionCardPress(card: HomeSectionCard) {
    if (card.path) {
      navigateToSubPackage(card.path);
      return;
    }

    await handleHomeAction(card.action);
  }

  async function handlePlayCategoryPress(category: HomePlayCategory) {
    if (category.path) {
      navigateToSubPackage(category.path);
      return;
    }

    await handleHomeAction(category.action);
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="首页" navbar={false} className="_pg-shell" reserveTabBarSpace scrollViewProps={{}}>
        <View className="_pg-page">
          <View className="_pg-nav" style={fixedNavStyle}>
            <View className="_pg-nav_scan" onClick={handleScan}>
              <AppIcon name="scan" size={16} color="#ffffff" />
            </View>
            <View className="_pg-nav_search" onClick={handleSearch}>
              <AppIcon name="search" size={16} color="#e85f9d" />
              <Text className="_pg-nav_search-placeholder">搜索项目 / 演出 / 餐饮</Text>
            </View>
          </View>

          <View className="_pg-hero">
            <Swiper className="_pg-hero_banner" autoplay circular interval={4500}>
              {heroBannerEntries.map((entry) => (
                <SwiperItem key={entry.key}>
                  <View className="_pg-hero_banner-slide" onClick={() => handleBannerPress(entry)}>
                    {renderHomeImage('_pg-hero_banner-image', heroBannerImageSrc)}
                  </View>
                </SwiperItem>
              ))}
            </Swiper>
            <View className="_pg-hero_fade" />
          </View>

          <View className="_pg-content">
            <View className="_pg-member-card">
              <View className="_pg-member-card_header">
                <View>
                  <Text className="_pg-member-card_hello">{memberName}，您好！</Text>
                  <Text className="_pg-member-card_level">1 {memberLevel}</Text>
                </View>
                <View className="_pg-member-card_right">
                  <Text className="_pg-member-card_coupon">{couponBadgeText}</Text>
                  <Text className="_pg-member-card_points">乐园积分 {memberPoints}</Text>
                </View>
              </View>

              <View className="_pg-shortcuts">
                {shortcutEntries.map((entry) => (
                  <View className="_pg-shortcut" key={entry.key} onClick={() => handleShortcutPress(entry)}>
                    {renderHomeImage('_pg-shortcut_art', shortcutImageSrc)}
                  </View>
                ))}
              </View>
            </View>

            <View className="_pg-open-card" onClick={handleSchedulePress}>
              {renderHomeImage('_pg-open-card_image', openTimeImageSrc)}
              <View className="_pg-open-card_content">
                <View className="_pg-open-card_line">
                  <Text className="_pg-open-card_title">今日开园时间：</Text>
                  <Text className="_pg-open-card_time">10:00~17:00</Text>
                  <Text className="_pg-open-card_phone">（详情请咨询4009778899）</Text>
                </View>
                <Text className="_pg-open-card_desc">详细节目单，欢迎戳一戳~</Text>
              </View>
            </View>

            <View className="_pg-section _pg-section--rank">
              <View className="_pg-section_header">
                <View className="_pg-section_title-wrap">
                  <Text className="_pg-section_mark">♡</Text>
                  <Text className="_pg-section_title">热玩榜单</Text>
                </View>
                <View className="_pg-section_more" onClick={() => handleSectionMorePress('rank')}>
                  <Text>查看全部</Text>
                  <Text className="_pg-section_arrow">›</Text>
                </View>
              </View>
              <ScrollView className="_pg-rank_scroll" scrollX enhanced showScrollbar={false}>
                <View className="_pg-rank_track">
                  {hotCards.map((card, index) => (
                    <View
                      className={`_pg-rank-card ${index === 0 ? '_pg-rank-card--primary' : '_pg-rank-card--peek'}`}
                      key={card.key}
                      onClick={() => handleSectionCardPress(card)}
                    >
                      {renderHomeImage('_pg-rank-card_image', rankImageSrc)}
                      {card.rank ? (
                        <View className="_pg-rank-card_rank">
                          <Text>{card.rank}</Text>
                        </View>
                      ) : null}
                      <View className="_pg-rank-card_body">
                        <Text className="_pg-rank-card_title">{card.title}</Text>
                        <Text className="_pg-rank-card_desc">{card.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View className="_pg-section">
              <View className="_pg-section_header">
                <View className="_pg-section_title-wrap">
                  <Text className="_pg-section_mark">✦</Text>
                  <Text className="_pg-section_title">精选活动</Text>
                </View>
                <View className="_pg-section_more" onClick={() => handleSectionMorePress('activity')}>
                  <Text>查看全部</Text>
                  <Text className="_pg-section_arrow">›</Text>
                </View>
              </View>
              {activityCards.map((card) => (
                <View className="_pg-feature-card" key={card.key} onClick={() => handleSectionCardPress(card)}>
                  {renderHomeImage('_pg-feature-card_image', activityImageSrc)}
                  <View className="_pg-feature-card_body">
                    <View>
                      <Text className="_pg-feature-card_title">{card.title}</Text>
                      <Text className="_pg-feature-card_desc">{card.description}</Text>
                    </View>
                    {card.tag ? <Text className="_pg-feature-card_tag">{card.tag}</Text> : null}
                  </View>
                </View>
              ))}
            </View>

            <View className="_pg-section">
              <View className="_pg-section_header">
                <View className="_pg-section_title-wrap">
                  <Text className="_pg-section_mark">✦</Text>
                  <Text className="_pg-section_title">精彩推荐</Text>
                </View>
                <View className="_pg-section_more" onClick={() => handleSectionMorePress('recommend')}>
                  <Text>查看全部</Text>
                  <Text className="_pg-section_arrow">›</Text>
                </View>
              </View>
              <View className="_pg-card-grid">
                {recommendCards.map((card) => (
                  <View className="_pg-guide-card" key={card.key} onClick={() => handleSectionCardPress(card)}>
                    {renderHomeImage('_pg-guide-card_image', recommendImageSrc)}
                    <View className="_pg-guide-card_body">
                      <Text className="_pg-guide-card_title">{card.title}</Text>
                      <Text className="_pg-guide-card_desc">{card.description}</Text>
                      {card.tag ? <Text className="_pg-guide-card_tag">{card.tag}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="_pg-benefit-card" onClick={handleMemberBenefitPress}>
              {renderHomeImage('_pg-benefit-card_image', memberBenefitImageSrc)}
            </View>

            <View className="_pg-section _pg-section--last">
              <View className="_pg-section_header">
                <View className="_pg-section_title-wrap">
                  <Text className="_pg-section_mark">▱</Text>
                  <Text className="_pg-section_title">玩转乐园</Text>
                </View>
                <View className="_pg-section_more" onClick={() => handleSectionMorePress('play')}>
                  <Text>查看全部</Text>
                  <Text className="_pg-section_arrow">›</Text>
                </View>
              </View>
              <View className="_pg-play_grid">
                {playCategories.map((category) => (
                  <View className="_pg-play-card" key={category.key} onClick={() => handlePlayCategoryPress(category)}>
                    {renderHomeImage('_pg-play-card_image', playCategoryImageSrc)}
                    <Text className="_pg-play-card_title">{category.title}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </PageShell>
    </View>
  ));
});

export default HomePage;
