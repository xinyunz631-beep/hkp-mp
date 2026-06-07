import { CSSProperties, useRef, useState } from 'react';
import Taro from '@tarojs/taro';
import { ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import type { ScrollViewProps } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageRoot, PageShell } from '@/core/components/PageShell';
import { HKP_PARK_HOTLINE, HKP_PARK_LOCATION } from '@/core/constants/park-location';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchCouponUsedCount } from '@/core/services/home';
import {
  fetchMiniProgramPageAds,
  findMiniProgramSlotAds,
  resolveMiniProgramAdDescription,
  resolveMiniProgramAdImage,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';
import { rootStore } from '@/core/store';
import type { MiniProgramAdJumpType, MiniProgramAdPageAdsResponse, MiniProgramAdView } from '@/core/types/mini-program-ad';
import { resolveMemberLevel } from '@/core/utils/member-profile';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { resolvePageChromeMetrics } from '@/core/utils/style';
import {
  callWechatPhone,
  copyWechatText,
  openWechatLocation,
  scanWechatCode,
  showWechatConfirm,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import './index.scss';

interface HomeAdJumpTarget {
  jumpType?: MiniProgramAdJumpType;
  jumpPath?: string;
  jumpAppId?: string;
  jumpUrl?: string;
  jumpCustomValue?: string;
}

interface HomeShortcutEntry extends HomeAdJumpTarget {
  key: string;
  title: string;
  path?: string;
  imageSrc?: string;
  requireLogin?: boolean;
  action?: 'phone' | 'shareIncome' | 'location' | 'map';
  deferred?: boolean;
}

interface HomeSectionCard extends HomeAdJumpTarget {
  id: string;
  title: string;
  description: string;
  tag?: string;
  rank?: string;
  path?: string;
  imageSrc?: string;
  action?: 'location' | 'map';
}

interface HomePlayCategory extends HomeAdJumpTarget {
  id: string;
  title: string;
  path?: string;
  imageSrc?: string;
  action?: 'location' | 'phone' | 'deferred';
}

interface HomeBannerEntry extends HomeAdJumpTarget {
  key: string;
  path?: string;
  imageSrc?: string;
  requireLogin?: boolean;
}

type HomeScrollHandler = NonNullable<ScrollViewProps['onScroll']>;

const shortcutEntries: HomeShortcutEntry[] = [
  { key: 'exchange', title: '兑换专区', path: MINI_PACKAGE_ROUTES.memberExchange, requireLogin: true },
  { key: 'coupon', title: '领券中心', path: MINI_PACKAGE_ROUTES.memberCouponCenter, requireLogin: true },
  { key: 'service', title: '服务专区', path: MINI_PACKAGE_ROUTES.ticketHome },
  { key: 'mall', title: '官方商城', path: MINI_PACKAGE_ROUTES.mallHome },
  { key: 'contact', title: '联系客服', action: 'phone' },
  { key: 'share', title: '分享收益', requireLogin: true, action: 'shareIncome', deferred: true },
  { key: 'guide', title: '导航至乐园', action: 'location' },
  { key: 'map', title: '园内地图', path: MINI_PACKAGE_ROUTES.ticketParkGuide, action: 'map' },
];

const hotCards: HomeSectionCard[] = [
  { id: '1000000000001001', title: '欢乐漂流', description: '日间游览人气路线', rank: 'top1', path: MINI_PACKAGE_ROUTES.ticketParkDetail },
  { id: '1000000000001002', title: '缤纷摩天轮', description: '亲子高空观景项目', rank: 'top2', path: MINI_PACKAGE_ROUTES.ticketParkDetail },
];

const activityCards: HomeSectionCard[] = [
  { id: '2000000000001003', title: '乐园助力，嗨吃玩乐', description: '为世界杯喝彩', tag: '进行中', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
];

const recommendCards: HomeSectionCard[] = [
  { id: '3000000000001001', title: '交通动线', description: '入园、停车与接驳指引', tag: '快速查看', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '3000000000001002', title: '项目排队', description: '热门项目开放与等待', tag: '实时提醒', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
];

const playCategories: HomePlayCategory[] = [
  { id: '5000000000001001', title: '吃', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '5000000000001002', title: '住', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '5000000000001003', title: '行', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '5000000000001004', title: '游', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '5000000000001005', title: '购', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '5000000000001006', title: '娱', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '5000000000001007', title: '商', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '5000000000001008', title: '学', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
  { id: '5000000000001009', title: '情', path: MINI_PACKAGE_ROUTES.ticketActivityDetail },
];

const heroBannerEntries: HomeBannerEntry[] = [
  { key: 'main', path: MINI_PACKAGE_ROUTES.ticketBooking, imageSrc: 'https://hellokitty-uat.yoursite.xin/ng/2f87c96ee684f066feab967a35f2ef9b.jpg' },
  { key: 'event', path: MINI_PACKAGE_ROUTES.ticketHome },
  { key: 'member', path: MINI_PACKAGE_ROUTES.memberGrowth, requireLogin: true },
];

const MAIN_ROUTE_SET = new Set<string>(Object.values(MINI_MAIN_ROUTES));

function renderHomeImage(className: string, src: string) {
  return <AppImage className={className} src={src} mode="aspectFill" emptyState="error" />;
}

// 将后台广告路径里的旧首页路径归一到当前小程序真实首页。
function normalizeAdMiniProgramPath(path?: string) {
  if (!path || path === '/') return undefined;
  if (path === '/pages/index/index') return MINI_MAIN_ROUTES.home;
  return path;
}

// 广告跳转对象只保留首页需要的跳转字段，避免页面感知后端完整 DTO。
function buildAdJumpTarget(ad: MiniProgramAdView): HomeAdJumpTarget {
  return {
    jumpType: ad.jumpType,
    jumpPath: normalizeAdMiniProgramPath(ad.jumpPath || ad.jumpTarget),
    jumpAppId: ad.jumpAppId || ad.jumpMiniProgramAppId,
    jumpUrl: ad.jumpUrl,
    jumpCustomValue: ad.jumpCustomValue,
  };
}

// 把广告映射成顶部轮播项。
function mapAdToBannerEntry(ad: MiniProgramAdView, index: number): HomeBannerEntry {
  return {
    key: ad.id || ad.adNo || `banner-${index}`,
    imageSrc: resolveMiniProgramAdImage(ad, 'background'),
    ...buildAdJumpTarget(ad),
  };
}

// 把广告映射成快捷入口项。
function mapAdToShortcutEntry(ad: MiniProgramAdView, index: number): HomeShortcutEntry {
  return {
    key: ad.id || ad.adNo || `shortcut-${index}`,
    title: resolveMiniProgramAdTitle(ad) || `入口${index + 1}`,
    imageSrc: resolveMiniProgramAdImage(ad, 'icon'),
    ...buildAdJumpTarget(ad),
  };
}

// 把广告映射成首页横向内容卡。
function mapAdToSectionCard(ad: MiniProgramAdView, index: number, prefix: string): HomeSectionCard {
  return {
    id: ad.id || ad.adNo || `${prefix}-${index}`,
    title: resolveMiniProgramAdTitle(ad) || '乐园推荐',
    description: resolveMiniProgramAdDescription(ad) || '',
    tag: ad.badgeText || ad.content,
    rank: prefix === 'hot' ? `top${index + 1}` : undefined,
    imageSrc: resolveMiniProgramAdImage(ad, 'material'),
    ...buildAdJumpTarget(ad),
  };
}

// 把广告映射成吃喝玩乐入口。
function mapAdToPlayCategory(ad: MiniProgramAdView, index: number): HomePlayCategory {
  return {
    id: ad.id || ad.adNo || `play-${index}`,
    title: resolveMiniProgramAdTitle(ad) || `推荐${index + 1}`,
    imageSrc: resolveMiniProgramAdImage(ad, 'material'),
    ...buildAdJumpTarget(ad),
  };
}

// 渲染主包首页，按当前 Pencil 750px 开发稿实现首页结构和接口图占位。
const HomePage = observer(function HomePage() {
  const [couponCount, setCouponCount] = useState<number>();
  const [homeAds, setHomeAds] = useState<MiniProgramAdPageAdsResponse>();
  const [chromeMetrics] = useState(resolvePageChromeMetrics);
  const [navSearchSolid, setNavSearchSolid] = useState(false);
  const navSearchSolidRef = useRef(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const [nextCouponCount, nextHomeAds] = await Promise.all([
        fetchCouponUsedCount(),
        fetchMiniProgramPageAds(),
      ]);
      setCouponCount(nextCouponCount);
      setHomeAds(nextHomeAds);
    },
  });
  const memberProfile = rootStore.member.profile;
  const memberLevel = resolveMemberLevel(memberProfile);
  const memberName = memberProfile?.nickname || '微信用户';
  const couponBadgeText = `优惠券${couponCount ?? 0}张`;
  const heroBannerImageSrc = '';
  const shortcutImageSrc = '';
  const openTimeImageSrc = '';
  const rankImageSrc = '';
  const activityImageSrc = '';
  const recommendImageSrc = '';
  const memberBenefitImageSrc = '';
  const playCategoryImageSrc = '';
  const topBannerAds = findMiniProgramSlotAds(homeAds, ['index_top_banner']);
  const legacyBannerAds = findMiniProgramSlotAds(homeAds, ['index_banner']);
  const bannerAds = topBannerAds.length ? topBannerAds : legacyBannerAds;
  const navAds = findMiniProgramSlotAds(homeAds, ['index_nav_grid']);
  const scheduleAds = findMiniProgramSlotAds(homeAds, ['index_schedule']);
  const hotAds = findMiniProgramSlotAds(homeAds, ['index_hot_project', 'index_hot_projects']);
  const activityAds = findMiniProgramSlotAds(homeAds, ['index_activity', 'index_feature_activity']);
  const recommendAds = findMiniProgramSlotAds(homeAds, ['index_recommend', 'index_recommendation']);
  const memberBenefitAds = findMiniProgramSlotAds(homeAds, ['index_member_benefit', 'index_member_benefits']);
  const playLifeAds = findMiniProgramSlotAds(homeAds, ['index_play_life', 'index_life']);
  const resolvedHeroBannerEntries = bannerAds.length ? bannerAds.map(mapAdToBannerEntry) : heroBannerEntries;
  const resolvedShortcutEntries = navAds.length ? navAds.slice(0, 8).map(mapAdToShortcutEntry) : shortcutEntries;
  const scheduleAd = scheduleAds[0];
  const resolvedHotCards = hotAds.length ? hotAds.map((ad, index) => mapAdToSectionCard(ad, index, 'hot')) : hotCards;
  const resolvedActivityCards = activityAds.length ? activityAds.map((ad, index) => mapAdToSectionCard(ad, index, 'activity')) : activityCards;
  const resolvedRecommendCards = recommendAds.length ? recommendAds.map((ad, index) => mapAdToSectionCard(ad, index, 'recommend')) : recommendCards;
  const memberBenefitAd = memberBenefitAds[0];
  const resolvedPlayCategories = playLifeAds.length ? playLifeAds.slice(0, 9).map(mapAdToPlayCategory) : playCategories;
  const fixedNavStyle: CSSProperties = {
    paddingTop: `${chromeMetrics.statusBarHeight + chromeMetrics.headerContentTopGap}px`,
    paddingRight: `${chromeMetrics.menuRightReserve + 18}px`,
  };

  // 跳转到独立分包页面，主包只持有路径字符串不 import 业务代码。
  function navigateToSubPackage(path: string) {
    if (MAIN_ROUTE_SET.has(path)) {
      Taro.switchTab({ url: path });
      return;
    }
    navigateToMiniRoute(path);
  }

  // 展示轻量业务提示，用于当前尚未接入真实页面的入口。
  // 登录后执行业务动作，避免页面散写登录字段判断。
  async function runAfterLogin(reason: string, handler: () => void | Promise<void>) {
    const authed = await pageRuntime.ensureLogin(reason);
    if (!authed) return;

    await handler();
  }

  // 点击快捷入口时根据配置选择分包跳转、登录守卫或业务提示。
  async function handleHomeAction(action?: HomeShortcutEntry['action'] | HomeSectionCard['action'] | HomePlayCategory['action']) {
    if (action === 'phone') {
      await callWechatPhone(HKP_PARK_HOTLINE);
      return;
    }

    if (action === 'location') {
      await openWechatLocation(HKP_PARK_LOCATION);
      return;
    }

    if (action === 'map') {
      navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketParkGuide);
      return;
    }

    if (action === 'shareIncome' || action === 'deferred') {
      await showWechatToast('服务准备中，请稍后再试');
    }
  }

  // 执行后台广告维护的跳转配置，当前小程序路径直接跳，其他小程序调微信能力，H5/自定义先复制配置值。
  async function handleAdJump(target: HomeAdJumpTarget, fallbackPath?: string) {
    const miniPath = normalizeAdMiniProgramPath(target.jumpPath || fallbackPath);
    if (target.jumpType === 'otherMiniProgram' && target.jumpAppId) {
      await Taro.navigateToMiniProgram({ appId: target.jumpAppId, path: miniPath });
      return;
    }

    if ((target.jumpType === 'h5' || target.jumpType === 'custom') && !miniPath) {
      const copyText = target.jumpType === 'h5' ? target.jumpUrl : target.jumpCustomValue;
      if (copyText) {
        await copyWechatText(copyText, '内容已复制');
        return;
      }
    }

    if (miniPath) {
      navigateToSubPackage(miniPath);
      return;
    }

    await showWechatToast('服务准备中，请稍后再试');
  }

  async function handleShortcutPress(entry: HomeShortcutEntry) {
    const action = async () => {
      if (entry.jumpType || entry.jumpPath || entry.path) {
        await handleAdJump(entry, entry.path);
        return;
      }

      await handleHomeAction(entry.action);
    };

    if (entry.requireLogin) {
      await runAfterLogin(`登录后可使用${entry.title}`, action);
      return;
    }

    await action();
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

  function handleCouponPress() {
    navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberCoupons);
  }

  function handleMemberLevelPress() {
    navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberGrowth);
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
    await runAfterLogin('登录后可查看会员专享福利', async () => {
      if (memberBenefitAd) {
        await handleAdJump(buildAdJumpTarget(memberBenefitAd), MINI_PACKAGE_ROUTES.memberGrowth);
        return;
      }
      navigateToSubPackage(MINI_PACKAGE_ROUTES.memberGrowth);
    });
  }

  // 当前首页仅保留开园时间卡，不再展示交通指南 / 乐园导览双按钮。
  async function handleSchedulePress() {
    if (scheduleAd) {
      await handleAdJump(buildAdJumpTarget(scheduleAd), MINI_PACKAGE_ROUTES.ticketSchedule);
      return;
    }
    navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketSchedule);
  }

  async function handleBannerPress(entry: HomeBannerEntry) {
    const action = () => handleAdJump(entry, entry.path);
    if (entry.requireLogin) {
      await runAfterLogin('登录后可查看会员专享内容', action);
      return;
    }

    await action();
  }

  function handleSectionMorePress(section: 'rank' | 'activity' | 'recommend' | 'play') {
    if (section === 'rank') {
      navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketParkList);
      return;
    }

    if (section === 'recommend' || section === 'play') {
      navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketActivityList);
      return;
    }

    if (section === 'activity') {
      navigateToSubPackage(MINI_PACKAGE_ROUTES.ticketActivityList);
      return;
    }
  }

  async function handleSectionCardPress(card: HomeSectionCard) {
    if (card.jumpType || card.jumpPath || card.jumpUrl || card.jumpCustomValue) {
      await handleAdJump(card, card.path);
      return;
    }

    if (card.path) {
      const url = card.path === MINI_PACKAGE_ROUTES.ticketParkDetail || card.path === MINI_PACKAGE_ROUTES.ticketActivityDetail
        ? `${card.path}?id=${encodeURIComponent(card.id)}`
        : card.path;
      navigateToMiniRoute(url);
      return;
    }

    await handleHomeAction(card.action);
  }

  async function handlePlayCategoryPress(category: HomePlayCategory) {
    if (category.jumpType || category.jumpPath || category.jumpUrl || category.jumpCustomValue) {
      await handleAdJump(category, category.path);
      return;
    }

    if (category.path) {
      const url = category.path === MINI_PACKAGE_ROUTES.ticketActivityDetail
        ? `${category.path}?id=${encodeURIComponent(category.id)}`
        : category.path;
      navigateToMiniRoute(url);
      return;
    }

    await handleHomeAction(category.action);
  }

  const handleHomeScroll: HomeScrollHandler = (event) => {
    const nextNavSearchSolid = event.detail.scrollTop > 140;
    if (navSearchSolidRef.current === nextNavSearchSolid) return;

    navSearchSolidRef.current = nextNavSearchSolid;
    setNavSearchSolid(nextNavSearchSolid);
  };

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell
        title="首页"
        navbar={false}
        className="_pg-shell"
        reserveTabBarSpace
        scrollViewProps={{ onScroll: handleHomeScroll }}
      >
        <PageRoot>
          <View className="_pg-nav" style={fixedNavStyle}>
            <View className="_pg-nav_scan" onClick={handleScan}>
              <AppIcon name="scan" size={14} color="#ffffff" />
            </View>
            <View className={`_pg-nav_search ${navSearchSolid ? '_pg-nav_search--solid' : ''}`} onClick={handleSearch}>
              <AppIcon name="search" size={14} color="#e85f9d" />
              {/* <Text className="_pg-nav_search-placeholder">搜索项目 / 演出 / 餐饮</Text> */}
              <Text className="_pg-nav_search-placeholder">搜一搜~</Text>
            </View>
          </View>
        </PageRoot>

        <View className="_pg-page">
          <View className="_pg-hero">
            <Swiper className="_pg-hero_banner" autoplay circular interval={4500}>
              {resolvedHeroBannerEntries.map((entry) => (
                <SwiperItem key={entry.key}>
                  <View className="_pg-hero_banner-slide" onClick={() => handleBannerPress(entry)}>
                    {renderHomeImage('_pg-hero_banner-image', entry.imageSrc || heroBannerImageSrc)}
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
                  <Text className="_pg-member-card_level" onClick={handleMemberLevelPress}>
                    {memberLevel.levelNo} {memberLevel.levelName}
                  </Text>
                </View>
                <View className="_pg-member-card_right">
                  <View className="_pg-member-card_coupon" onClick={handleCouponPress}>
                    <Text className="_pg-member-card_coupon-text">{couponBadgeText}</Text>
                    <AppIcon name="arrowRight" className="_pg-member-card_coupon-arrow" size={16} color="#db2777" />
                  </View>
                </View>
              </View>

              <View className="_pg-shortcuts">
                {resolvedShortcutEntries.map((entry) => (
                  <View className="_pg-shortcut" key={entry.key} onClick={() => handleShortcutPress(entry)}>
                    {renderHomeImage('_pg-shortcut_art', entry.imageSrc || shortcutImageSrc)}
                  </View>
                ))}
              </View>
            </View>

            <View className="_pg-open-card" onClick={handleSchedulePress}>
              {renderHomeImage('_pg-open-card_image', resolveMiniProgramAdImage(scheduleAd, 'background') || openTimeImageSrc)}
              <View className="_pg-open-card_content">
                <View className="_pg-open-card_line">
                  <Text className="_pg-open-card_title">{resolveMiniProgramAdTitle(scheduleAd) || '今日开园时间：'}</Text>
                  <Text className="_pg-open-card_time">10:00~17:00</Text>
                  <Text className="_pg-open-card_phone">（详情请咨询4009778899）</Text>
                </View>
                <Text className="_pg-open-card_desc">{resolveMiniProgramAdDescription(scheduleAd) || '详细节目单，欢迎戳一戳~'}</Text>
              </View>
            </View>

            <View className="_pg-section _pg-section--rank">
              <View className="_pg-section_header">
                <View className="_pg-section_title-wrap">
                  <AppIcon name="heart" className="_pg-section_mark" size={16} color="#e5004f" />
                  <Text className="_pg-section_title">热玩榜单</Text>
                </View>
                <View className="_pg-section_more" onClick={() => handleSectionMorePress('rank')}>
                  <Text>查看全部</Text>
                  <AppIcon name="arrowRight" className="_pg-section_arrow" size={16} color="#a1a1aa" />
                </View>
              </View>
              <ScrollView className="_pg-rank_scroll" scrollX enhanced showScrollbar={false}>
                <View className="_pg-rank_track">
                  {resolvedHotCards.map((card, index) => (
                    <View
                      className={`_pg-rank-card ${index === 0 ? '_pg-rank-card--primary' : '_pg-rank-card--peek'}`}
                      key={card.id}
                      onClick={() => handleSectionCardPress(card)}
                    >
                      {renderHomeImage('_pg-rank-card_image', card.imageSrc || rankImageSrc)}
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
                  <AppIcon name="gift" className="_pg-section_mark" size={16} color="#e5004f" />
                  <Text className="_pg-section_title">精选活动</Text>
                </View>
                <View className="_pg-section_more" onClick={() => handleSectionMorePress('activity')}>
                  <Text>查看全部</Text>
                  <AppIcon name="arrowRight" className="_pg-section_arrow" size={16} color="#a1a1aa" />
                </View>
              </View>
              {resolvedActivityCards.map((card) => (
                <View className="_pg-feature-card" key={card.id} onClick={() => handleSectionCardPress(card)}>
                  {renderHomeImage('_pg-feature-card_image', card.imageSrc || activityImageSrc)}
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
                  <AppIcon name="ticket" className="_pg-section_mark" size={16} color="#e5004f" />
                  <Text className="_pg-section_title">精彩推荐</Text>
                </View>
                <View className="_pg-section_more" onClick={() => handleSectionMorePress('recommend')}>
                  <Text>查看全部</Text>
                  <AppIcon name="arrowRight" className="_pg-section_arrow" size={16} color="#a1a1aa" />
                </View>
              </View>
              <View className="_pg-card-grid">
                {resolvedRecommendCards.map((card) => (
                  <View className="_pg-guide-card" key={card.id} onClick={() => handleSectionCardPress(card)}>
                    {renderHomeImage('_pg-guide-card_image', card.imageSrc || recommendImageSrc)}
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
              {renderHomeImage('_pg-benefit-card_image', resolveMiniProgramAdImage(memberBenefitAd, 'background') || memberBenefitImageSrc)}
            </View>

            <View className="_pg-section _pg-section--last">
              <View className="_pg-section_header">
                <View className="_pg-section_title-wrap">
                  <AppIcon name="location" className="_pg-section_mark" size={16} color="#e5004f" />
                  <Text className="_pg-section_title">玩转乐园</Text>
                </View>
                <View className="_pg-section_more" onClick={() => handleSectionMorePress('play')}>
                  <Text>查看全部</Text>
                  <AppIcon name="arrowRight" className="_pg-section_arrow" size={16} color="#a1a1aa" />
                </View>
              </View>
              <View className="_pg-play_grid">
                {resolvedPlayCategories.map((category) => (
                  <View className="_pg-play-card" key={category.id} onClick={() => handlePlayCategoryPress(category)}>
                    {renderHomeImage('_pg-play-card_image', category.imageSrc || playCategoryImageSrc)}
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
