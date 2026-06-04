import { CSSProperties, useMemo, useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { AppImage } from '@/core/components/AppImage';
import { AppPopup } from '@/core/components/AppPopup';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { rootStore } from '@/core/store';
import { resolveMemberAvatar, resolveMemberLevel, type MemberLevelDisplay } from '@/core/utils/member-profile';
import {
  fetchMemberGrowthData,
  type MemberGrowthData,
  type MemberGrowthLevel,
} from '@/pkg-member/services/member-growth';
import './index.scss';

function resolveCurrentLevel(data: MemberGrowthData, memberLevel: MemberLevelDisplay) {
  return data.levels.find((level) => (
    level.id === memberLevel.levelId
    || level.levelNo === memberLevel.levelNo
    || level.name === memberLevel.levelName
  )) ?? data.levels[0];
}

function renderLevelBadge(level: MemberGrowthLevel) {
  return (
    <View
      className="_pg-level-badge"
      style={{ '--_pg-level-color': level.themeColor } as CSSProperties}
    >
      <Text className="_pg-level-badge_no">{level.levelNo}</Text>
      <Text className="_pg-level-badge_name">{level.name}</Text>
    </View>
  );
}

function formatGrowthValue(value: number) {
  if (value > 0) return `+${value}`;

  return `${value}`;
}

// 成长值从会员等级页拆为独立落地页，避免在同一页面里切换两套业务状态。
const MemberGrowthDetailPage = observer(function MemberGrowthDetailPage() {
  const [pageData, setPageData] = useState<MemberGrowthData>();
  const [growthRuleVisible, setGrowthRuleVisible] = useState(false);
  const memberProfile = rootStore.member.profile;
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchMemberGrowthData();
      setPageData(nextData);
    },
    loginRequired: true,
    loginReason: '登录后可查看成长值',
  });

  const memberLevel = useMemo(
    () => resolveMemberLevel(memberProfile, pageData?.member),
    [memberProfile, pageData],
  );
  const currentLevel = useMemo(
    () => (pageData ? resolveCurrentLevel(pageData, memberLevel) : undefined),
    [memberLevel, pageData],
  );

  function openGrowthRulePopup() {
    setGrowthRuleVisible(true);
  }

  function closeGrowthRulePopup() {
    setGrowthRuleVisible(false);
  }

  function renderGrowthCard(data: MemberGrowthData) {
    return (
      <View className="_pg-growth-card">
        <Text className="_pg-growth-card_title">成长值明细</Text>
        {data.growthRecords.length > 0 ? (
          <View className="_pg-growth-list">
            {data.growthRecords.map((record) => (
              <View className="_pg-growth-record" key={record.id}>
                <View className="_pg-growth-record_body">
                  <Text className="_pg-growth-record_title">{record.title}</Text>
                  <Text className="_pg-growth-record_time">{record.time}</Text>
                </View>
                <Text className="_pg-growth-record_value">{formatGrowthValue(record.value)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="_pg-growth-empty">
            <BaseEmpty
              title="暂无成长值记录"
              description="消费、活动和会员任务获得成长值后会展示在这里"
              size="small"
            />
          </View>
        )}
      </View>
    );
  }

  function renderGrowthRulePopup(data: MemberGrowthData) {
    return (
      <View className="_pg-rule-popup">
        <Text className="_pg-rule-popup_title">成长值说明</Text>
        <View className="_pg-growth-rules">
          {data.growthRuleSections.map((section) => (
            <View className="_pg-growth-rule" key={section.id}>
              <Text className="_pg-growth-rule_title">{section.title}</Text>
              <Text className="_pg-growth-rule_content">{section.content}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return pageRuntime.renderPage(() => {
    if (!pageData || !currentLevel) return null;

    const displayName = memberProfile?.nickname || '微信用户';
    const displayAvatar = resolveMemberAvatar(memberProfile, pageData.avatarImageSrc);

    return (
      <View className="_pg">
        <PageShell title="成长值明细" className="_pg-shell" scrollViewProps={{}}>
          <View className="_pg-page">
            <AppImage
              className="_pg-bg"
              src={pageData.backgroundImageSrc}
              mode="aspectFill"
              placeholderColor="#fff8fb"
              showErrorIcon={false}
            />
            <View className="_pg-hero">
              <View className="_pg-rule-entry" onClick={openGrowthRulePopup}>
                <Text>成长值规则</Text>
              </View>
              <View className="_pg-profile">
                <AppImage
                  className="_pg-profile_avatar"
                  src={displayAvatar}
                  width={104}
                  height={104}
                  placeholderColor="#ffffff"
                  showErrorIcon={false}
                />
                <View className="_pg-profile_main">
                  <Text className="_pg-profile_name">{displayName}</Text>
                  <View className="_pg-profile_actions">
                    <View className="_pg-profile_level">
                      {renderLevelBadge(currentLevel)}
                    </View>
                    <View className="_pg-profile_growth _pg-profile_growth--active">
                      <Text>成长值</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View className="_pg-body">
              {renderGrowthCard(pageData)}
            </View>
          </View>

          <PageShare>
            <AppPopup
              visible={growthRuleVisible}
              className="_pg-rule-popup-shell"
              contentClassName="_pg-rule-popup-wrap"
              position="center"
              round={false}
              safeArea={false}
              onClose={closeGrowthRulePopup}
            >
              {renderGrowthRulePopup(pageData)}
            </AppPopup>
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default MemberGrowthDetailPage;
