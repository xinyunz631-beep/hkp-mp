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
import {
  fetchMiniProgramPageAds,
  findMiniProgramSlotAds,
  resolveMiniProgramAdDescription,
  resolveMiniProgramAdImage,
  resolveMiniProgramAdTitle,
} from '@/core/services/mini-program-ad';
import { rootStore } from '@/core/store';
import type { MiniProgramAdPageAdsResponse, MiniProgramAdView } from '@/core/types/mini-program-ad';
import { adClick, resolveMiniProgramAdClickTarget, type MiniProgramAdClickTarget } from '@/core/utils/ad-click';
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

interface HomeShortcutEntry extends MiniProgramAdClickTarget {
  key: string;
  title: string;
  path?: string;
  imageSrc?: string;
  requireLogin?: boolean;
  action?: 'phone' | 'shareIncome' | 'location' | 'map';
  deferred?: boolean;
}

interface HomeSectionCard extends MiniProgramAdClickTarget {
  id: string;
  title: string;
  description: string;
  tag?: string;
  rank?: string;
  path?: string;
  imageSrc?: string;
  action?: 'location' | 'map';
}

interface HomePlayCategory extends MiniProgramAdClickTarget {
  id: string;
  title: string;
  path?: string;
  imageSrc?: string;
  action?: 'location' | 'phone' | 'deferred';
}

interface HomeBannerEntry extends MiniProgramAdClickTarget {
  key: string;
  path?: string;
  imageSrc?: string;
  requireLogin?: boolean;
}

type HomeScrollHandler = NonNullable<ScrollViewProps['onScroll']>;

const HOME_TOP_BANNER_SLOT_CODES = ['index_top_banner'];
const HOME_LEGACY_BANNER_SLOT_CODES = ['index_banner'];
const HOME_NAV_SLOT_CODES = ['index_nav_grid'];
const HOME_SCHEDULE_SLOT_CODES = ['index_schedule'];
const HOME_HOT_SLOT_CODES = ['index_hot_project', 'index_hot_projects'];
const HOME_ACTIVITY_SLOT_CODES = ['index_activity', 'index_feature_activity'];
const HOME_RECOMMEND_SLOT_CODES = ['index_recommend', 'index_recommendation'];
const HOME_PLAY_LIFE_SLOT_CODES = ['index_play_life', 'index_life'];
const HOME_SECTION_MORE_CONFIG = {
  rank: { path: MINI_PACKAGE_ROUTES.ticketParkList, slotCode: HOME_HOT_SLOT_CODES[0], title: '热玩榜单' },
  activity: { path: MINI_PACKAGE_ROUTES.ticketActivityList, slotCode: HOME_ACTIVITY_SLOT_CODES[0], title: '精选活动' },
  recommend: { path: MINI_PACKAGE_ROUTES.ticketActivityList, slotCode: HOME_RECOMMEND_SLOT_CODES[0], title: '精彩推荐' },
  play: { path: MINI_PACKAGE_ROUTES.ticketActivityList, slotCode: HOME_PLAY_LIFE_SLOT_CODES[0], title: '玩转乐园' },
} as const;

function renderHomeImage(className: string, src: string) {
  return <AppImage className={className} src={src} mode="aspectFill" emptyState="error" />;
}

// 拼接小程序路由参数，避免首页“查看更多”列表页丢失资源位上下文。
function appendRouteQuery(path: string, params: Record<string, string>) {
  const query = Object.entries(params)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `${path}?${query}` : path;
}

// 首页广告已进入真实接口链路，核心资源位缺失时直接暴露配置问题，不再回退旧本地内容。
function assertHomeAdPayloadReady(payload: MiniProgramAdPageAdsResponse) {
  const requiredSlots = [
    { name: '顶部内容', codes: [...HOME_TOP_BANNER_SLOT_CODES, ...HOME_LEGACY_BANNER_SLOT_CODES] },
    { name: '快捷入口', codes: HOME_NAV_SLOT_CODES },
    { name: '节目单', codes: HOME_SCHEDULE_SLOT_CODES },
    { name: '热玩榜单', codes: HOME_HOT_SLOT_CODES },
    { name: '精选活动', codes: HOME_ACTIVITY_SLOT_CODES },
    { name: '精彩推荐', codes: HOME_RECOMMEND_SLOT_CODES },
    { name: '玩转乐园', codes: HOME_PLAY_LIFE_SLOT_CODES },
  ];
  const hasMissingSlot = requiredSlots.some((slot) => findMiniProgramSlotAds(payload, slot.codes).length === 0);

  if (hasMissingSlot) throw new Error('首页内容正在更新，请稍后重试');
}

// 把广告映射成顶部轮播项。
function mapAdToBannerEntry(ad: MiniProgramAdView, index: number): HomeBannerEntry {
  return {
    ...resolveMiniProgramAdClickTarget(ad),
    key: ad.id || ad.adNo || `banner-${index}`,
    imageSrc: resolveMiniProgramAdImage(ad, 'background'),
  };
}

function resolveHomeShortcutTitle(ad: MiniProgramAdView, index: number) {
  const title = resolveMiniProgramAdTitle(ad);
  return title || `入口${index + 1}`;
}

// 把广告映射成快捷入口项。
function mapAdToShortcutEntry(ad: MiniProgramAdView, index: number): HomeShortcutEntry {
  const title = resolveHomeShortcutTitle(ad, index);

  return {
    ...resolveMiniProgramAdClickTarget(ad),
    key: ad.id || ad.adNo || `shortcut-${index}`,
    title,
    imageSrc: resolveMiniProgramAdImage(ad, 'icon'),
    action: title === '分享收益' ? 'shareIncome' : undefined,
  };
}

// 把广告映射成首页横向内容卡。
function mapAdToSectionCard(ad: MiniProgramAdView, index: number, prefix: string): HomeSectionCard {
  return {
    ...resolveMiniProgramAdClickTarget(ad),
    id: ad.id || ad.adNo || `${prefix}-${index}`,
    title: resolveMiniProgramAdTitle(ad) || '乐园推荐',
    description: resolveMiniProgramAdDescription(ad) || '',
    tag: ad.badgeText || ad.content,
    rank: prefix === 'hot' ? `top${index + 1}` : undefined,
    imageSrc: resolveMiniProgramAdImage(ad, 'material'),
  };
}

// 把广告映射成吃喝玩乐入口。
function mapAdToPlayCategory(ad: MiniProgramAdView, index: number): HomePlayCategory {
  return {
    ...resolveMiniProgramAdClickTarget(ad),
    id: ad.id || ad.adNo || `play-${index}`,
    title: resolveMiniProgramAdTitle(ad) || `推荐${index + 1}`,
    imageSrc: resolveMiniProgramAdImage(ad, 'material'),
  };
}

function normalizeHomeAdJumpType(jumpType?: string) {
  return jumpType?.trim().replace(/[\s-]+/g, '_').toUpperCase();
}

function isHomeMiniProgramPathValue(value?: string) {
  const trimmedValue = value?.trim();
  return Boolean(trimmedValue && (
    trimmedValue.startsWith('/')
    || trimmedValue.startsWith('pages/')
    || trimmedValue.startsWith('pkg-')
  ));
}

function hasExecutableAdTarget(target: MiniProgramAdClickTarget) {
  const jumpType = normalizeHomeAdJumpType(target.jumpType);
  return Boolean(
    target.jumpTarget
    || target.jumpPath
    || isHomeMiniProgramPathValue(target.jumpUrl)
    || target.richText
    || target.richTextHtml
    || (jumpType === 'H5' && target.jumpUrl)
    || (jumpType === 'CUSTOM' && target.jumpCustomValue)
    || (jumpType === 'AD_DETAIL' && (target.detailAdNo || target.adNo || target.id))
    || ((jumpType === 'OTHERMINIPROGRAM' || jumpType === 'OTHER_MINI_PROGRAM')
      && (target.jumpAppId || target.jumpMiniProgramAppId))
  );
}

// 渲染主包首页，按当前 Pencil 750px 开发稿实现首页结构和接口图占位。
const HomePage = observer(function HomePage() {
  const [homeAds, setHomeAds] = useState<MiniProgramAdPageAdsResponse>();
  const [chromeMetrics] = useState(resolvePageChromeMetrics);
  const [navSearchSolid, setNavSearchSolid] = useState(false);
  const navSearchSolidRef = useRef(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextHomeAds = await fetchMiniProgramPageAds();
      assertHomeAdPayloadReady(nextHomeAds);
      setHomeAds(nextHomeAds);
    },
  });
  const memberProfile = rootStore.memberInfo;
  const memberLevel = resolveMemberLevel(memberProfile);
  const memberName = memberProfile?.nickname || '微信用户';
  const couponBadgeText = '我的优惠券';
  const topBannerAds = findMiniProgramSlotAds(homeAds, HOME_TOP_BANNER_SLOT_CODES);
  const legacyBannerAds = findMiniProgramSlotAds(homeAds, HOME_LEGACY_BANNER_SLOT_CODES);
  const bannerAds = topBannerAds.length ? topBannerAds : legacyBannerAds;
  const navAds = findMiniProgramSlotAds(homeAds, HOME_NAV_SLOT_CODES);
  const scheduleAds = findMiniProgramSlotAds(homeAds, HOME_SCHEDULE_SLOT_CODES);
  const hotAds = findMiniProgramSlotAds(homeAds, HOME_HOT_SLOT_CODES);
  const activityAds = findMiniProgramSlotAds(homeAds, HOME_ACTIVITY_SLOT_CODES);
  const recommendAds = findMiniProgramSlotAds(homeAds, HOME_RECOMMEND_SLOT_CODES);
  const playLifeAds = findMiniProgramSlotAds(homeAds, HOME_PLAY_LIFE_SLOT_CODES);
  const resolvedHeroBannerEntries = bannerAds.map(mapAdToBannerEntry);
  const resolvedShortcutEntries = navAds.slice(0, 8).map(mapAdToShortcutEntry);
  const scheduleAd = scheduleAds[0];
  const resolvedHotCards = hotAds.slice(0, 3).map((ad, index) => mapAdToSectionCard(ad, index, 'hot'));
  const resolvedActivityCards = activityAds.map((ad, index) => mapAdToSectionCard(ad, index, 'activity'));
  const resolvedRecommendCards = recommendAds.slice(0, 3).map((ad, index) => mapAdToSectionCard(ad, index, 'recommend'));
  const resolvedPlayCategories = playLifeAds.slice(0, 9).map(mapAdToPlayCategory);
  const fixedNavStyle: CSSProperties = {
    paddingTop: `${chromeMetrics.statusBarHeight + chromeMetrics.headerContentTopGap}px`,
    paddingRight: `${chromeMetrics.menuRightReserve + 18}px`,
  };

  // 跳转到独立分包页面，主包只持有路径字符串不 import 业务代码。
  function navigateToSubPackage(path: string) {
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

    if (action === 'shareIncome') {
      await showWechatToast('敬请期待');
      return;
    }

    if (action === 'deferred') {
      await showWechatToast('服务准备中，请稍后再试');
    }
  }

  async function handleShortcutPress(entry: HomeShortcutEntry) {
    const action = async () => {
      if (entry.action === 'shareIncome') {
        await handleHomeAction(entry.action);
        return;
      }

      if (hasExecutableAdTarget(entry)) {
        await adClick(entry);
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

  // 当前首页仅保留开园时间卡，不再展示交通指南 / 乐园导览双按钮。
  async function handleSchedulePress() {
    if (scheduleAd) {
      await adClick(scheduleAd);
      return;
    }
    await showWechatToast('节目单正在更新，请稍后再试');
  }

  async function handleBannerPress(entry: HomeBannerEntry) {
    if (!hasExecutableAdTarget(entry)) return;

    const action = async () => {
      await adClick(entry);
    };
    if (entry.requireLogin) {
      await runAfterLogin('登录后可查看会员专享内容', action);
      return;
    }

    await action();
  }

  function handleSectionMorePress(section: 'rank' | 'activity' | 'recommend' | 'play') {
    const config = HOME_SECTION_MORE_CONFIG[section];
    navigateToSubPackage(appendRouteQuery(config.path, { slotCode: config.slotCode, title: config.title }));
  }

  async function handleSectionCardPress(card: HomeSectionCard) {
    if (hasExecutableAdTarget(card)) {
      await adClick(card);
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
    if (hasExecutableAdTarget(category)) {
      await adClick(category);
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
                    {renderHomeImage('_pg-hero_banner-image', entry.imageSrc || '')}
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
                    {memberLevel.levelName}
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
                    {renderHomeImage('_pg-shortcut_art', entry.imageSrc || '')}
                  </View>
                ))}
              </View>
            </View>

            <View className="_pg-open-card" onClick={handleSchedulePress}>
              {renderHomeImage('_pg-open-card_image', resolveMiniProgramAdImage(scheduleAd, 'background') || '')}
              <View className="_pg-open-card_content">
                <View className="_pg-open-card_line">
                  <Text className="_pg-open-card_title">{resolveMiniProgramAdTitle(scheduleAd)}</Text>
                </View>
                <Text className="_pg-open-card_desc">{resolveMiniProgramAdDescription(scheduleAd)}</Text>
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
                  {resolvedHotCards.map((card) => (
                    <View
                      className="_pg-rank-card"
                      key={card.id}
                      onClick={() => handleSectionCardPress(card)}
                    >
                      {renderHomeImage('_pg-rank-card_image', card.imageSrc || '')}
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
                  {renderHomeImage('_pg-feature-card_image', card.imageSrc || '')}
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
                    {renderHomeImage('_pg-guide-card_image', card.imageSrc || '')}
                    <View className="_pg-guide-card_body">
                      <Text className="_pg-guide-card_title">{card.title}</Text>
                      <Text className="_pg-guide-card_desc">{card.description}</Text>
                      {card.tag ? <Text className="_pg-guide-card_tag">{card.tag}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="_pg-section _pg-section--last">
              <View className="_pg-section_header">
                <View className="_pg-section_title-wrap">
                  <AppIcon name="location" className="_pg-section_mark" size={16} color="#e5004f" />
                  <Text className="_pg-section_title">玩转乐园</Text>
                </View>
                {/* <View className="_pg-section_more" onClick={() => handleSectionMorePress('play')}>
                  <Text>查看全部</Text>
                  <AppIcon name="arrowRight" className="_pg-section_arrow" size={16} color="#a1a1aa" />
                </View> */}
              </View>
              <View className="_pg-play_grid">
                {resolvedPlayCategories.map((category) => (
                  <View className="_pg-play-card" key={category.id} onClick={() => handlePlayCategoryPress(category)}>
                    {renderHomeImage('_pg-play-card_image', category.imageSrc || '')}
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
