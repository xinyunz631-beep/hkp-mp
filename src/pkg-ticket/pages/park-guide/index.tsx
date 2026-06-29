import { useState } from 'react';
import { ScrollView, Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import {
  fetchParkGuideData,
  hasParkGuideContent,
  type TicketParkGuideData,
} from '@/pkg-ticket/services/park-guide';
import './index.scss';

// 渲染乐园导览页面；有运营配置时展示导览图和服务分区，无数据时保留业务空态。
const ParkGuidePage = observer(function ParkGuidePage() {
  const [guideData, setGuideData] = useState<TicketParkGuideData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextGuideData = await fetchParkGuideData();
      setGuideData(nextGuideData);
    },
  });
  const hasContent = hasParkGuideContent(guideData);

  function previewGuideMap() {
    if (!guideData?.imageSrc) return;
    Taro.previewImage({
      current: guideData.imageSrc,
      urls: [guideData.imageSrc],
    });
  }

  return pageRuntime.renderPage(() => (
    <View className="_pg">
      <PageShell title="乐园导览" className="_pg-shell" reserveTabBarSpace={false}>
        <View className="_pg-content">
          {hasContent ? (
            <>
              <View className="_pg-map-card">
                <Text className="_pg-map-card_title">{guideData?.title || '乐园导览'}</Text>
                {guideData?.description ? (
                  <Text className="_pg-map-card_desc">{guideData.description}</Text>
                ) : null}
                {guideData?.imageSrc ? (
                  <ScrollView className="_pg-map-card_scroller" scrollX showScrollbar={false}>
                    <AppImage
                      className="_pg-map-card_image"
                      src={guideData.imageSrc}
                      mode="aspectFill"
                      emptyState="error"
                      placeholderColor="#f1f5f9"
                      onClick={previewGuideMap}
                    />
                  </ScrollView>
                ) : null}
              </View>

              {guideData?.sections.length ? (
                <View className="_pg-section">
                  <Text className="_pg-section_title">服务分区</Text>
                  <View className="_pg-section_grid">
                    {guideData.sections.map((section) => (
                      <View className="_pg-section_item" key={section.id}>
                        {section.imageSrc ? (
                          <AppImage
                            className="_pg-section_item-image"
                            src={section.imageSrc}
                            mode="aspectFill"
                            emptyState="error"
                          />
                        ) : null}
                        <Text className="_pg-section_text">{section.title}</Text>
                        {section.description ? (
                          <Text className="_pg-section_desc">{section.description}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          ) : (
            <BaseEmpty
              className="_pg-state"
              title="导览信息准备中"
              description="园区导览信息开放后可在这里查看。"
            />
          )}
          <Text className="_pg-tip">到园后可结合现场指引和工作人员提示安排行程。</Text>
        </View>
      </PageShell>
    </View>
  ));
});

export default ParkGuidePage;
