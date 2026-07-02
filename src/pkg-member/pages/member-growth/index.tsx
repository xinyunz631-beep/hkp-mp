import { CSSProperties, useMemo, useState } from 'react';
import { ScrollView, Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppPopup } from '@/core/components/AppPopup';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { MemberAvatar } from '@/core/components/MemberAvatar';
import { MemberLevelBadge } from '@/core/components/MemberLevelBadge';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { resolveMemberLevel, type MemberLevelDisplay } from '@/core/utils/member-profile';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import {
  fetchMemberGrowthData,
  type MemberGrowthBenefit,
  type MemberGrowthData,
  type MemberGrowthLevel,
} from '@/pkg-member/services/member-growth';
import './index.scss';

const BENEFIT_TONES = ['shopping', 'food', 'birthday', 'activity'] as const;
type BenefitTone = typeof BENEFIT_TONES[number];

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

function resolveBenefitTone(benefit: MemberGrowthBenefit, index: number): BenefitTone {
  const content = `${benefit.title}${benefit.summary}${benefit.highlightText}`;
  if (/生日|礼遇|礼品|birthday/i.test(content)) return 'birthday';
  if (/餐|美食|小吃|甜品|料理|食/i.test(content)) return 'food';
  if (/活动|游戏|好礼|参与/i.test(content)) return 'activity';
  if (/购物|商城|商店|商品|消费/i.test(content)) return 'shopping';

  return BENEFIT_TONES[index % BENEFIT_TONES.length];
}

function resolveBenefitFallbackText(benefit: MemberGrowthBenefit) {
  return benefit.title.trim().slice(0, 1) || '惠';
}

function mergeClassNames(...classNames: Array<string | false | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

function isSummaryWhitespace(value: string) {
  return /\s/.test(value);
}

function resolveBenefitHighlightRanges(summary: string, highlightText: string) {
  const normalizedHighlightText = highlightText.replace(/\s+/g, '').toLowerCase();
  const ranges: Array<{ startIndex: number; endIndex: number }> = [];
  if (!summary || !normalizedHighlightText) return ranges;

  for (let startIndex = 0; startIndex < summary.length; startIndex += 1) {
    if (isSummaryWhitespace(summary[startIndex])) continue;

    let highlightIndex = 0;
    let endIndex = startIndex;

    for (; endIndex < summary.length && highlightIndex < normalizedHighlightText.length; endIndex += 1) {
      const summaryChar = summary[endIndex];
      if (isSummaryWhitespace(summaryChar)) continue;
      if (summaryChar.toLowerCase() !== normalizedHighlightText[highlightIndex]) break;

      highlightIndex += 1;
    }

    if (highlightIndex === normalizedHighlightText.length) {
      ranges.push({ startIndex, endIndex });
      startIndex = endIndex - 1;
    }
  }

  return ranges;
}

function renderBenefitSummaryText(benefit: MemberGrowthBenefit) {
  const summary = benefit.summary.trim();
  const highlightText = benefit.highlightText.trim();
  const summaryNodes = [];

  if (!highlightText) return <Text className="_pg-benefit-row_summary-text">{summary}</Text>;

  const highlightRanges = resolveBenefitHighlightRanges(summary, highlightText);

  if (highlightRanges.length > 0) {
    let cursor = 0;

    highlightRanges.forEach((range, index) => {
      const beforeText = summary.slice(cursor, range.startIndex);
      const matchedText = summary.slice(range.startIndex, range.endIndex);

      if (beforeText) {
        summaryNodes.push(<Text className="_pg-benefit-row_summary-copy" key={`copy-${index}`}>{beforeText}</Text>);
      }
      summaryNodes.push(
        <Text className="_pg-benefit-row_summary-highlight" key={`highlight-${index}`}>{matchedText}</Text>,
      );
      cursor = range.endIndex;
    });

    const afterText = summary.slice(cursor);
    if (afterText) summaryNodes.push(<Text className="_pg-benefit-row_summary-copy" key="after">{afterText}</Text>);
  } else {
    if (summary) {
      summaryNodes.push(<Text className="_pg-benefit-row_summary-copy" key="summary">{summary}</Text>);
    }
    summaryNodes.push(
      <Text className="_pg-benefit-row_summary-highlight" key="highlight">
        {summary ? ` ${highlightText}` : highlightText}
      </Text>,
    );
  }

  return <View className="_pg-benefit-row_summary-text">{summaryNodes}</View>;
}

// 渲染会员权益页面，按 CRM BFF 返回的等级、成长值和权益内容展示。
const MemberGrowthPage = observer(function MemberGrowthPage() {
  const [pageData, setPageData] = useState<MemberGrowthData>();
  const [selectedLevelId, setSelectedLevelId] = useState('');
  const [levelRuleVisible, setLevelRuleVisible] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMemberGrowthData({ includeRecords: false });
      setPageData(nextData);
    },
    refreshOnShow: true,
    loginRequired: true,
    loginReason: '登录后可查看会员权益',
  });

  const memberLevel = useMemo(
    () => resolveMemberLevel(pageData?.member),
    [pageData],
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

  function renderBenefitContent(level: MemberGrowthLevel) {
    const displayBenefits = level.benefits;

    if (displayBenefits.length > 0) {
      return (
        <View className="_pg-benefit-list">
          {displayBenefits.map((benefit, index) => {
            const tone = resolveBenefitTone(benefit, index);

            return (
              <View
                className={mergeClassNames('_pg-benefit-row', `_pg-benefit-row--${tone}`)}
                key={benefit.id}
              >
                <View className="_pg-benefit-row_icon-frame">
                  <Text className="_pg-benefit-row_icon-text">
                    {resolveBenefitFallbackText(benefit)}
                  </Text>
                </View>
                <View className="_pg-benefit-row_body">
                  <Text className="_pg-benefit-row_title">{benefit.title}</Text>
                  {benefit.summary || benefit.highlightText ? (
                    <View className="_pg-benefit-row_summary">
                      <Text className="_pg-benefit-row_dot" />
                      {renderBenefitSummaryText(benefit)}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      );
    }

    return (
      <View className="_pg-benefit-empty">
        <BaseEmpty
          title={`${level.name}权益暂未配置`}
          description="权益内容同步后会在这里展示"
          size="small"
        />
      </View>
    );
  }

  function renderBenefitSwiper(levels: MemberGrowthLevel[]) {
    return (
      <Swiper
        className="_pg-benefit-swiper"
        current={selectedLevelIndex}
        circular={levels.length > 1}
        previousMargin="0px"
        nextMargin="0px"
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
              <View className="_pg-benefit-slide_inner">
                <ScrollView
                  className="_pg-benefit-scroll"
                  scrollY
                  enhanced
                  showScrollbar={false}
                >
                  {renderBenefitContent(level)}
                </ScrollView>
              </View>
            </SwiperItem>
          );
        })}
      </Swiper>
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
              <MemberLevelBadge
                levelNo={level.levelNo}
                levelName={level.name}
                themeColor={level.themeColor}
              />
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
    if (!pageData) return null;

    if (sortedLevels.length === 0) {
      return (
        <View className="_pg">
          <PageShell
            title="Hello Kitty Park"
            className="_pg-shell"
            scrollViewProps={{}}
          >
            <View className="_pg-empty-page">
              <BaseEmpty
                title="暂无会员等级信息"
                description="会员等级配置同步后可查看权益"
              />
            </View>
          </PageShell>
        </View>
      );
    }

    if (!currentLevel || !selectedLevel) return null;

    const displayName = pageData.memberName || '微信用户';

    return (
      <View className="_pg">
        <PageShell
          title="Hello Kitty Park"
          className="_pg-shell"
          scrollView={false}
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
                <MemberAvatar
                  className="_pg-profile_avatar"
                  src={pageData.avatarImageSrc}
                />
                <View className="_pg-profile_main">
                  <Text className="_pg-profile_name">{displayName}</Text>
                  <View className="_pg-profile_actions">
                    <View className="_pg-profile_level">
                      <MemberLevelBadge
                        levelNo={currentLevel.levelNo}
                        levelName={currentLevel.name}
                        themeColor={currentLevel.themeColor}
                      />
                    </View>
                    <View
                      className="_pg-profile_growth"
                      onClick={openGrowthDetail}
                    >
                      <Text>{`成长值(${memberLevel.growthValue})`}</Text>
                      <AppIcon name="arrowRight" size={14} color="#444444" />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View className="_pg-body">
              {renderBenefitSwiper(sortedLevels)}
            </View>
            {renderProgressFooter(sortedLevels)}
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
