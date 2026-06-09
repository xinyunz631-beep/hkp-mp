import { CSSProperties, useMemo, useState } from 'react';
import { ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppPopup } from '@/core/components/AppPopup';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { rootStore } from '@/core/store';
import { resolveMemberAvatar, resolveMemberLevel, type MemberLevelDisplay } from '@/core/utils/member-profile';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import {
  fetchMemberGrowthData,
  type MemberGrowthData,
  type MemberGrowthLevel,
} from '@/pkg-member/services/member-growth';
import './index.scss';

function sortLevels(levels: MemberGrowthLevel[]) {
  return [...levels].sort((firstLevel, secondLevel) => (
    firstLevel.growthThreshold - secondLevel.growthThreshold
  ));
}

function resolveCurrentLevel(data: MemberGrowthData, memberLevel: MemberLevelDisplay) {
  return data.levels.find((level) => (
    level.id === memberLevel.levelId
    || level.levelNo === memberLevel.levelNo
    || level.name === memberLevel.levelName
  )) ?? data.levels[0];
}

function resolveLevelPosition(index: number, total: number) {
  if (total <= 1) return 0;

  return (index / (total - 1)) * 100;
}

function resolveProgressPercent(levels: MemberGrowthLevel[], growthValue: number) {
  if (levels.length <= 1) return 0;

  const firstLevel = levels[0];
  if (growthValue <= firstLevel.growthThreshold) return 0;

  for (let index = 0; index < levels.length - 1; index += 1) {
    const currentLevel = levels[index];
    const nextLevel = levels[index + 1];
    if (growthValue > nextLevel.growthThreshold) continue;

    const segmentStart = resolveLevelPosition(index, levels.length);
    const segmentSize = 100 / (levels.length - 1);
    const segmentRange = Math.max(1, nextLevel.growthThreshold - currentLevel.growthThreshold);
    const segmentRatio = (growthValue - currentLevel.growthThreshold) / segmentRange;

    return Math.min(100, Math.max(0, segmentStart + segmentSize * segmentRatio));
  }

  return 100;
}

function resolveGrowthHint(levels: MemberGrowthLevel[], growthValue: number) {
  const nextLevel = levels.find((level) => growthValue < level.growthThreshold);

  if (!nextLevel) return '已达到最高等级';

  return `距${nextLevel.name}还差 ${nextLevel.growthThreshold - growthValue} 成长值`;
}

function renderLevelBadge(level: MemberGrowthLevel, active: boolean) {
  return (
    <View
      className={`_pg-level-badge ${active ? '_pg-level-badge--active' : ''}`}
      style={{ '--_pg-level-color': level.themeColor } as CSSProperties}
    >
      <Text className="_pg-level-badge_no">{level.levelNo}</Text>
      <Text className="_pg-level-badge_name">{level.name}</Text>
    </View>
  );
}

// 渲染会员权益页面，权益图先用图片占位承载，后续替换路径即可。
const MemberGrowthPage = observer(function MemberGrowthPage() {
  const [pageData, setPageData] = useState<MemberGrowthData>();
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [levelRuleVisible, setLevelRuleVisible] = useState(false);
  const memberProfile = rootStore.memberInfo;
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMemberGrowthData();
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可查看会员权益',
  });

  const memberLevel = useMemo(
    () => resolveMemberLevel(memberProfile, pageData?.member),
    [memberProfile, pageData],
  );
  const sortedLevels = useMemo(
    () => (pageData ? sortLevels(pageData.levels) : []),
    [pageData],
  );
  const currentLevel = useMemo(
    () => (pageData ? resolveCurrentLevel(pageData, memberLevel) : undefined),
    [memberLevel, pageData],
  );
  const selectedLevel = useMemo(
    () => sortedLevels.find((level) => level.id === selectedLevelId) ?? currentLevel,
    [currentLevel, selectedLevelId, sortedLevels],
  );
  const progressPercent = useMemo(
    () => resolveProgressPercent(sortedLevels, memberLevel.growthValue),
    [memberLevel.growthValue, sortedLevels],
  );
  const growthHint = useMemo(
    () => resolveGrowthHint(sortedLevels, memberLevel.growthValue),
    [memberLevel.growthValue, sortedLevels],
  );
  const selectedLevelIndex = Math.max(0, sortedLevels.findIndex((level) => level.id === selectedLevel?.id));

  function openLevelRulePopup() {
    setLevelRuleVisible(true);
  }

  function closeLevelRulePopup() {
    setLevelRuleVisible(false);
  }

  function openGrowthDetail() {
    navigateToMiniRoute(MINI_PACKAGE_ROUTES.memberGrowthDetail);
  }

  function handleBenefitSwiperChange(currentIndex: number) {
    const nextLevel = sortedLevels[currentIndex];
    if (!nextLevel) return;

    setSelectedLevelId(nextLevel.id);
  }

  function renderLevelMarker(level: MemberGrowthLevel, index: number, levels: MemberGrowthLevel[]) {
    const isCurrent = level.id === currentLevel?.id;
    const isSelected = level.id === selectedLevel?.id;
    const markerClassName = [
      '_pg-progress_marker',
      isCurrent ? '_pg-progress_marker--current' : '',
      isSelected ? '_pg-progress_marker--selected' : '',
    ].filter(Boolean).join(' ');

    return (
      <View
        className={markerClassName}
        key={level.id}
        style={{
          left: `${resolveLevelPosition(index, levels.length)}%`,
          '--_pg-level-color': level.themeColor,
        } as CSSProperties}
        onClick={() => setSelectedLevelId(level.id)}
      >
        {isSelected ? <View className="_pg-progress_marker-pointer" /> : null}
        <View className="_pg-progress_marker-dot">
          <Text>{level.levelNo}</Text>
        </View>
        <Text className="_pg-progress_marker-name">{level.name}</Text>
        <Text className="_pg-progress_marker-value">{level.growthThreshold}</Text>
      </View>
    );
  }

  function renderBenefitSwiper(levels: MemberGrowthLevel[], benefitImageSrc: string) {
    return (
      <Swiper
        className="_pg-benefit-swiper"
        current={selectedLevelIndex}
        circular={levels.length > 1}
        previousMargin="34px"
        nextMargin="34px"
        onChange={(event) => handleBenefitSwiperChange(event.detail.current)}
      >
        {levels.map((level) => {
          const isSelected = level.id === selectedLevel?.id;
          const slideClassName = [
            '_pg-benefit-slide',
            isSelected ? '_pg-benefit-slide--selected' : '',
          ].filter(Boolean).join(' ');

          return (
            <SwiperItem className={slideClassName} key={level.id}>
              <ScrollView
                className="_pg-benefit-scroll"
                scrollY
                enhanced
                showScrollbar={false}
              >
                <AppImage
                  className="_pg-benefit-image"
                  src={benefitImageSrc}
                  mode="aspectFill"
                  width="100%"
                  height={920}
                  placeholderColor="#d9e0e8"
                  showErrorIcon={false}
                />
              </ScrollView>
            </SwiperItem>
          );
        })}
      </Swiper>
    );
  }

  function renderGrowthSummary() {
    return (
      <View className="_pg-growth-summary">
        <Text className="_pg-growth-summary_label">当前成长值</Text>
        <Text className="_pg-growth-summary_value">{memberLevel.growthValue}</Text>
        <Text className="_pg-growth-summary_hint">{growthHint}</Text>
      </View>
    );
  }

  function renderProgressFooter(levels: MemberGrowthLevel[]) {
    return (
      <View className="_pg-progress-footer">
        <View className="_pg-progress-card">
          <View className="_pg-progress_track">
            <View className="_pg-progress_line" />
            <View className="_pg-progress_fill" style={{ width: `${progressPercent}%` }} />
            {levels.map((levelItem, index) => renderLevelMarker(levelItem, index, levels))}
          </View>
        </View>
      </View>
    );
  }

  function renderLevelRulePopup(data: MemberGrowthData) {
    return (
      <View className="_pg-rule-popup">
        <Text className="_pg-rule-popup_title">会员等级对照表</Text>
        {data.levelRuleIntro.map((line) => (
          <Text className="_pg-rule-popup_intro" key={line}>{line}</Text>
        ))}
        <View className="_pg-level-table">
          <View className="_pg-level-table_header">
            <Text className="_pg-level-table_header-text">等级</Text>
            <Text className="_pg-level-table_header-text">对应成长值门槛</Text>
          </View>
          {sortLevels(data.levels).map((level) => (
            <View className="_pg-level-table_row" key={level.id}>
              {renderLevelBadge(level, level.id === memberLevel.levelId || level.levelNo === memberLevel.levelNo)}
              <Text className="_pg-level-table_value" style={{ color: level.themeColor }}>
                {level.growthThreshold}
              </Text>
            </View>
          ))}
        </View>
        <View className="_pg-rule-popup_button" onClick={closeLevelRulePopup}>
          <Text>了解了</Text>
        </View>
      </View>
    );
  }

  return pageRuntime.renderPage(() => {
    if (!pageData || !currentLevel || !selectedLevel || sortedLevels.length === 0) return null;

    const displayName = memberProfile?.nickname || '微信用户';
    const displayAvatar = resolveMemberAvatar(memberProfile, pageData.avatarImageSrc);
    const memberBenefitImageSrc = '';

    return (
      <View className="_pg">
        <PageShell
          title="会员权益"
          className="_pg-shell"
          scrollView={false}
          footer={renderProgressFooter(sortedLevels)}
        >
          <View className="_pg-page">
            <AppImage
              className="_pg-bg"
              src={pageData.backgroundImageSrc}
              mode="aspectFill"
              placeholderColor="transparent"
              showErrorIcon={false}
            />
            <View className="_pg-hero">
              <View className="_pg-rule-entry" onClick={openLevelRulePopup}>
                <Text>等级规则</Text>
              </View>
              <View className="_pg-profile">
                <AppImage
                  className="_pg-profile_avatar"
                  src={displayAvatar}
                  width={96}
                  height={96}
                  placeholderColor="#ffffff"
                  showErrorIcon={false}
                />
                <View className="_pg-profile_main">
                  <Text className="_pg-profile_name">{displayName}</Text>
                  <View className="_pg-profile_actions">
                    <View className="_pg-profile_level">
                      {renderLevelBadge(currentLevel, true)}
                    </View>
                    <View
                      className="_pg-profile_growth"
                      onClick={openGrowthDetail}
                    >
                      <Text>成长值</Text>
                      <AppIcon name="arrowRight" size={14} color="#444444" />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View className="_pg-body">
              {/* {renderGrowthSummary()} */}
              {renderBenefitSwiper(sortedLevels, memberBenefitImageSrc)}
            </View>
          </View>

          <PageShare>
            <AppPopup
              visible={levelRuleVisible}
              className="_pg-rule-popup-shell"
              contentClassName="_pg-rule-popup-wrap"
              position="center"
              round={false}
              safeArea={false}
              onClose={closeLevelRulePopup}
            >
              {renderLevelRulePopup(pageData)}
            </AppPopup>
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default MemberGrowthPage;
