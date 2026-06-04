import { useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { AppShareButton } from '@/core/components/AppShareButton';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { TicketRichText } from '@/pkg-ticket/components/TicketRichText';
import { fetchActivityDetailData, type TicketActivityDetailData } from '@/pkg-ticket/services/activity';
import './index.scss';

function resolveActivityId() {
  return Taro.getCurrentInstance().router?.params?.id || '';
}

// 渲染乐园资讯详情页，正文内容由接口富文本承载。
const ActivityDetailPage = observer(function ActivityDetailPage() {
  const [detailData, setDetailData] = useState<TicketActivityDetailData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchActivityDetailData(resolveActivityId());
      setDetailData(nextData);
    },
  });
  const activity = detailData?.activity;

  useShareAppMessage(() => ({
    title: activity?.title || 'Hello Kitty Park',
    path: activity?.id
      ? `${MINI_PACKAGE_ROUTES.ticketActivityDetail}?id=${encodeURIComponent(activity.id)}`
      : MINI_PACKAGE_ROUTES.ticketActivityDetail,
    imageUrl: activity?.imageSrc || undefined,
  }));

  return pageRuntime.renderPage(() => {
    if (!activity) return null;

    return (
      <View className="_pg">
        <PageShell title="乐园资讯" className="_pg-shell">
          <View className="_pg-content">
            {activity.imageSrc ? (
              <AppImage className="_pg-hero" src={activity.imageSrc} mode="aspectFill" emptyState="error" />
            ) : null}

            <View className="_pg-title-row">
              <View className="_pg-title-row_main">
                <Text className="_pg-title-row_title">{activity.title}</Text>
                {activity.subtitle ? <Text className="_pg-title-row_subtitle">{activity.subtitle}</Text> : null}
              </View>
              <AppShareButton className="_pg-title-row_share" iconSize={22} iconColor="#111111" />
            </View>

            <View className="_pg-detail">
              <TicketRichText className="_pg-detail_rich-text" nodes={activity.richTextHtml} />
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default ActivityDetailPage;
