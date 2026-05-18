import { useState } from 'react';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { previewWechatImages, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchParkGuideData, type TicketParkGuideData } from '@/pkg-ticket/services/park-guide';
import './index.scss';

// 渲染乐园导览页面，提供地图占位和服务分区索引。
const ParkGuidePage = observer(function ParkGuidePage() {
  const [guideData, setGuideData] = useState<TicketParkGuideData>();
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchParkGuideData();
      setGuideData(nextData);
    },
  });

  return pageRuntime.renderPage(() => {
    if (!guideData) return null;

    return (
      <View className="_pg">
        <PageShell title={guideData.title} className="_pg-shell" reserveTabBarSpace={false}>
          <View className="_pg-content">
            <View className="_pg-map-card">
              <View className="_pg-map-card_header">
                <Text className="_pg-map-card_title">园区服务导览</Text>
                <Text className="_pg-map-card_desc">按吃、住、行、游等服务分区快速定位园内资源。</Text>
              </View>
              <AppImage
                className="_pg-map-card_image"
                src={guideData.imageSrc}
                mode="aspectFill"
                emptyState="error"
                onClick={() => previewWechatImages({ urls: [guideData.imageSrc], emptyText: '暂无导览大图' })}
              />
            </View>

            <View className="_pg-section">
              <Text className="_pg-section_title">服务分区</Text>
              <View className="_pg-section_grid">
                {guideData.sections.map((section) => (
                  <View
                    className="_pg-section_item"
                    key={section}
                    onClick={() => void showWechatToast(`已定位${section}类服务`)}
                  >
                    <Text className="_pg-section_text">{section}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text className="_pg-tip">到园后可结合现场指引和工作人员提示安排行程。</Text>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default ParkGuidePage;
