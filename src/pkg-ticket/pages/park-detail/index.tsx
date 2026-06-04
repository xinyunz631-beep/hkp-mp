import { useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppShareButton } from '@/core/components/AppShareButton';
import { PageFooter, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { previewWechatImages } from '@/core/utils/wechat-actions';
import { TicketRichText } from '@/pkg-ticket/components/TicketRichText';
import { fetchParkDetailData, type TicketParkDetailData } from '@/pkg-ticket/services/park-detail';
import './index.scss';

function resolveProjectId() {
  return Taro.getCurrentInstance().router?.params?.id || '';
}

// 渲染热玩项目详情页，项目数据按路由参数从接口获取，详情内容由富文本承载。
const ParkDetailPage = observer(function ParkDetailPage() {
  const [detailData, setDetailData] = useState<TicketParkDetailData>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchParkDetailData(resolveProjectId());
      setDetailData(nextData);
      setLiked(nextData.project.liked);
      setActiveIndex(0);
    },
  });

  const project = detailData?.project;
  const heroImages = (project?.heroImages ?? []).filter(Boolean);

  useShareAppMessage(() => ({
    title: project?.name || 'Hello Kitty Park',
    path: project?.id
      ? `${MINI_PACKAGE_ROUTES.ticketParkDetail}?id=${encodeURIComponent(project.id)}`
      : MINI_PACKAGE_ROUTES.ticketParkDetail,
    imageUrl: heroImages.find(Boolean) || undefined,
  }));

  function handlePreviewImage() {
    void previewWechatImages({
      urls: heroImages,
      current: heroImages[activeIndex],
      emptyText: '暂无项目图片',
    });
  }

  function handleLikePress() {
    setLiked((nextLiked) => !nextLiked);
  }

  function handleTicketPress() {
    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.ticketBooking });
  }

  function handleHotelPress() {
    Taro.navigateTo({ url: MINI_PACKAGE_ROUTES.hotelHome });
  }

  return pageRuntime.renderPage(() => {
    if (!project) return null;

    const likeCount = project.likeCount + (liked && !project.liked ? 1 : 0) - (!liked && project.liked ? 1 : 0);
    const likeText = `${likeCount}人喜欢`;

    return (
      <View className="_pg">
        <PageShell title="热玩项目" className="_pg-shell">
          <View className="_pg-content">
            {heroImages.length > 0 ? (
              <View className="_pg-hero">
                <Swiper
                  className="_pg-hero_swiper"
                  circular
                  onChange={(event) => setActiveIndex(event.detail.current)}
                >
                  {heroImages.map((imageSrc, index) => (
                    <SwiperItem key={`${imageSrc}-${index}`}>
                      <View className="_pg-hero_slide" onClick={handlePreviewImage}>
                        <AppImage className="_pg-hero_image" src={imageSrc} mode="aspectFill" emptyState="error" />
                      </View>
                    </SwiperItem>
                  ))}
                </Swiper>
              </View>
            ) : null}

            <View className="_pg-summary">
              <View className="_pg-summary_main">
                <Text className="_pg-summary_title">{project.name}</Text>
                <View className="_pg-summary_meta">
                  <AppIcon name="location" className="_pg-summary_meta-icon" size={13} color="#626a73" />
                  <Text>{project.locationText}</Text>
                </View>
                <View className="_pg-summary_meta">
                  <AppIcon name="ask" className="_pg-summary_meta-icon" size={13} color="#626a73" />
                  <Text>{project.statusText}</Text>
                </View>
              </View>
              <View className="_pg-summary_actions">
                <AppShareButton className="_pg-summary_action" iconColor="#18181b">
                  <AppIcon name="share" size={22} color="#18181b" />
                  <Text>分享</Text>
                </AppShareButton>
                <View className="_pg-summary_action" onClick={handleLikePress}>
                  <AppIcon name="heart" size={22} color={liked ? '#e5004f' : '#18181b'} />
                  <Text>{likeText}</Text>
                </View>
              </View>
            </View>

            <View className="_pg-detail">
              <TicketRichText className="_pg-detail_rich-text" nodes={project.detailHtml} />
            </View>
          </View>

          <PageFooter>
            <View className="_pg-footer">
              <View className="_pg-footer_button" onClick={handleTicketPress}>
                <Text>购买门票</Text>
              </View>
              <View className="_pg-footer_button" onClick={handleHotelPress}>
                <Text>酒店预定</Text>
              </View>
            </View>
          </PageFooter>
        </PageShell>
      </View>
    );
  });
});

export default ParkDetailPage;
