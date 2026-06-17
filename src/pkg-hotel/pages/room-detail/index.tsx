import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { FixedSubmitBar } from '@/core/components/commerce';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { previewWechatImages, showWechatToast } from '@/core/utils/wechat-actions';
import { fetchRoomDetailData, type HotelRoomDetailData } from '@/pkg-hotel/services/room-detail';
import {
  createDefaultHotelStayRange,
  formatHotelStayDateText,
  parseHotelOccupancy,
  serializeHotelOccupancy,
  summarizeHotelOccupancy,
  type HotelRatePlanData,
  type HotelStayRange,
} from '@/pkg-hotel/services/model';
import { createHotelOrderDraft } from '@/pkg-hotel/services/order-draft';
import './index.scss';

const LOGIN_REASON = '登录后可提交酒店订单';

function resolveInitialParams() {
  const params = Taro.getCurrentInstance().router?.params ?? {};
  const checkIn = params.checkIn || createDefaultHotelStayRange().checkIn;
  const checkOut = params.checkOut || createDefaultHotelStayRange().checkOut;

  return {
    hotelId: params.hotelId,
    productId: params.productId || params.roomId,
    stayRange: {
      checkIn,
      checkOut,
    } as HotelStayRange,
    occupancy: parseHotelOccupancy(params.occupancy),
  };
}

const RoomDetailPage = observer(function RoomDetailPage() {
  const [roomDetailData, setRoomDetailData] = useState<HotelRoomDetailData>();
  const [bannerIndex, setBannerIndex] = useState(0);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const params = resolveInitialParams();
      const nextData = await fetchRoomDetailData(params);

      setRoomDetailData(nextData);
      setBannerIndex(0);
    },
  });

  function handlePreviewImages() {
    const galleryImages = roomDetailData?.product.galleryImages.filter((item) => item.src) ?? [];
    const urls = galleryImages.map((item) => item.src);
    void previewWechatImages({
      urls,
      current: urls[bannerIndex],
      emptyText: '暂无房型大图',
    });
  }

  async function handleBooking(ratePlan: HotelRatePlanData) {
    if (!roomDetailData) return;

    if (ratePlan.stock <= 0) {
      void showWechatToast('当前房型已订满');
      return;
    }

    const draft = createHotelOrderDraft({
      hotelId: roomDetailData.hotelId,
      hotelName: roomDetailData.hotelName,
      hotelAddress: roomDetailData.hotelAddress,
      hotelPhone: roomDetailData.phoneNumber,
      productId: roomDetailData.product.id,
      product: roomDetailData.product,
      ratePlanId: ratePlan.id,
      stayRange: roomDetailData.stayRange,
      occupancy: roomDetailData.occupancy,
      checkInTimeText: roomDetailData.checkInTimeText,
      checkOutTimeText: roomDetailData.checkOutTimeText,
    });

    if (!draft) {
      void showWechatToast('当前产品暂不可预订');
      return;
    }

    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.hotelCheckout}?draftId=${encodeURIComponent(draft.id)}`, {
      loginReason: LOGIN_REASON,
    });
  }

  function handleBackToSearch() {
    if (!roomDetailData) return;

    Taro.navigateTo({
      url: `${MINI_PACKAGE_ROUTES.hotelHome}?checkIn=${encodeURIComponent(roomDetailData.stayRange.checkIn)}&checkOut=${encodeURIComponent(roomDetailData.stayRange.checkOut)}&occupancy=${serializeHotelOccupancy(roomDetailData.occupancy)}`,
    });
  }

  return pageRuntime.renderPage(() => {
    if (!roomDetailData) return null;

    const galleryImages = roomDetailData.product.galleryImages.filter((item) => item.src);
    const displayImages = galleryImages.length > 0 ? galleryImages : [{ id: 'empty', src: '' }];
    const primaryRatePlan = roomDetailData.product.ratePlans.find((ratePlan) => ratePlan.stock > 0)
      ?? roomDetailData.product.ratePlans[0];

    return (
      <View className="_pg">
        <PageShell
          title="房型详情"
          className="_pg-shell"
          reserveTabBarSpace={false}
          footer={(
            <FixedSubmitBar
              className="_pg-submit"
              label={<Text className="_pg-submit_label">起价</Text>}
              amountText={<Text className="_pg-submit_amount">¥{primaryRatePlan.price}</Text>}
              buttonText="立即预订"
              disabled={primaryRatePlan.stock <= 0}
              onSubmit={() => {
                void handleBooking(primaryRatePlan);
              }}
            />
          )}
        >
          <View className="_pg-content">
            <View className="_pg-banner" onClick={handlePreviewImages}>
              <Swiper
                className="_pg-banner_swiper"
                circular={galleryImages.length > 1}
                current={bannerIndex}
                onChange={(event) => setBannerIndex(event.detail.current)}
              >
                {displayImages.map((image) => (
                  <SwiperItem className="_pg-banner_item" key={image.id}>
                    <AppImage className="_pg-banner_image" src={image.src} mode="aspectFill" />
                  </SwiperItem>
                ))}
              </Swiper>
              {galleryImages.length > 0 ? <Text className="_pg-banner_count">图片{galleryImages.length}张</Text> : null}
            </View>

            <View className="_pg-card">
              <Text className="_pg-title">{roomDetailData.product.title}</Text>
              <Text className="_pg-subtitle">{roomDetailData.product.subtitle}</Text>
              <View className="_pg-tags">
                <Text>{roomDetailData.product.breakfastText}</Text>
                <Text>{roomDetailData.product.bedText}</Text>
                <Text>{roomDetailData.product.capacityText}</Text>
              </View>
            </View>

            <View className="_pg-card">
              <View className="_pg-stay" onClick={handleBackToSearch}>
                <View>
                  <Text className="_pg-stay_label">入住日期</Text>
                  <Text className="_pg-stay_value">
                    {formatHotelStayDateText(roomDetailData.stayRange)} 共{roomDetailData.nights}晚
                  </Text>
                </View>
                <AppIcon name="arrowRight" size={16} color="#9ca3af" />
              </View>
              <View className="_pg-stay">
                <View>
                  <Text className="_pg-stay_label">入住人数</Text>
                  <Text className="_pg-stay_value">{summarizeHotelOccupancy(roomDetailData.occupancy)}</Text>
                </View>
              </View>
            </View>

            <View className="_pg-card">
              <Text className="_pg-section-title">可订价规</Text>
              {roomDetailData.product.ratePlans.map((ratePlan) => (
                <View className="_pg-rate" key={ratePlan.id}>
                  <View className="_pg-rate_main">
                    <Text className="_pg-rate_title">{ratePlan.title}</Text>
                    <Text className="_pg-rate_desc">{ratePlan.policyText}</Text>
                    <Text className="_pg-rate_rule">{ratePlan.cancelRule}</Text>
                  </View>
                  <View className="_pg-rate_aside">
                    <Text className="_pg-rate_price">¥{ratePlan.price}</Text>
                    <View
                      className={`_pg-rate_button ${ratePlan.stock <= 0 ? '_pg-rate_button--disabled' : ''}`}
                      onClick={() => handleBooking(ratePlan)}
                    >
                      <Text>{ratePlan.stock <= 0 ? '满房' : '预订'}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View className="_pg-card">
              <Text className="_pg-section-title">预订须知</Text>
              {roomDetailData.featureGroups.map((item) => (
                <View className="_pg-detail-row" key={item.label}>
                  <Text className="_pg-detail-row_label">{item.label}</Text>
                  <Text className="_pg-detail-row_value">{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default RoomDetailPage;
