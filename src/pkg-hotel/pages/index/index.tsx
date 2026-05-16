import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { fetchHotelHomeData, type HotelHomeData } from '@/pkg-hotel/services';
import './index.scss';

function showComingSoon(title: string) {
  Taro.showToast({ title, icon: 'none' });
}

const HotelIndexPage = observer(function HotelIndexPage() {
  const [pageData, setPageData] = useState<HotelHomeData>();
  const [activeHotelId, setActiveHotelId] = useState('');
  const [activeFilterKey, setActiveFilterKey] = useState('queen');
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const nextData = await fetchHotelHomeData();
      setPageData(nextData);
      setActiveHotelId(nextData.hotels[0]?.id ?? '');
      setActiveFilterKey(nextData.filterOptions[0]?.key ?? '');
    },
  });

  const activeHotel = useMemo(
    () => pageData?.hotels.find((hotel) => hotel.id === activeHotelId) ?? pageData?.hotels[0],
    [activeHotelId, pageData],
  );
  const activeFilterLabel = pageData?.filterOptions.find((item) => item.key === activeFilterKey)?.label;
  const visibleRooms = useMemo(() => {
    if (!activeHotel) return [];
    if (!activeFilterLabel) return activeHotel.rooms;

    const matchedRooms = activeHotel.rooms.filter((room) => room.tagsText.includes(activeFilterLabel));
    return matchedRooms.length > 0 ? matchedRooms : activeHotel.rooms;
  }, [activeFilterLabel, activeHotel]);

  function handleRoomDetail(roomId: string) {
    Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.hotelRoomDetail}?roomId=${roomId}` });
  }

  function handleRoomBooking(roomId: string) {
    Taro.navigateTo({ url: `${MINI_PACKAGE_ROUTES.hotelCheckout}?roomId=${roomId}` });
  }

  return pageRuntime.renderPage(() => {
    if (!pageData || !activeHotel) return null;

    const heroImageSrc = activeHotel.heroImageSrc;

    return (
      <View className="_pg">
        <PageShell
          title={pageData.title}
          className="_pg-shell"
          reserveTabBarSpace={false}
          navbarRight={(
            <View className="_pg-nav-action" onClick={() => showComingSoon('分享能力即将开放')}>
              <AppIcon name="share" size={16} color="#23262f" />
            </View>
          )}
        >
          <View className="_pg-content">
            <View className="_pg-tabs">
              {pageData.hotels.map((hotel) => (
                <View
                  className={`_pg-tabs_item ${hotel.id === activeHotel.id ? '_pg-tabs_item--active' : ''}`}
                  key={hotel.id}
                  onClick={() => {
                    setActiveHotelId(hotel.id);
                    setActiveFilterKey(pageData.filterOptions[0]?.key ?? '');
                  }}
                >
                  <Text>{hotel.label}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-hero">
              <AppImage className="_pg-hero_image" src={heroImageSrc} mode="aspectFill" />
              <View className="_pg-hero_mask" />
              <View className="_pg-hero_caption">
                <Text className="_pg-hero_title">{activeHotel.heroTitle}</Text>
                <Text className="_pg-hero_subtitle">{activeHotel.heroSubtitle}</Text>
              </View>
              <Text className="_pg-hero_count">{activeHotel.galleryCountText}</Text>
              <View className="_pg-hero_dots">
                <View className="_pg-hero_dot" />
                <View className="_pg-hero_dot" />
                <View className="_pg-hero_dot _pg-hero_dot--active" />
                <View className="_pg-hero_dot" />
              </View>
            </View>

            <View className="_pg-info-row" onClick={() => showComingSoon('地图导航即将开放')}>
              <View className="_pg-info-row_main">
                <Text className="_pg-info-row_address">{activeHotel.address}</Text>
                <Text className="_pg-info-row_area">{activeHotel.areaText}</Text>
              </View>
              <Text className="_pg-info-row_action">地图/导航 ›</Text>
            </View>

            <View className="_pg-info-row" onClick={() => showComingSoon('酒店介绍详情即将开放')}>
              <Text className="_pg-info-row_label">酒店介绍</Text>
              <Text className="_pg-info-row_action">详情 ›</Text>
            </View>

            <View className="_pg-stay">
              <View className="_pg-stay_item">
                <Text className="_pg-stay_week">{pageData.stayPanel.checkInWeek}</Text>
                <Text className="_pg-stay_date">{pageData.stayPanel.checkInDate}</Text>
              </View>
              <View className="_pg-stay_middle">
                <Text className="_pg-stay_night">{pageData.stayPanel.nightsText}</Text>
              </View>
              <View className="_pg-stay_item">
                <Text className="_pg-stay_week">{pageData.stayPanel.checkOutWeek}</Text>
                <Text className="_pg-stay_date">{pageData.stayPanel.checkOutDate}</Text>
              </View>
              <View className="_pg-stay_guest" onClick={() => showComingSoon('入住人数调整即将开放')}>
                <Text className="_pg-stay_guest-top">每间</Text>
                <Text className="_pg-stay_guest-bottom">{pageData.stayPanel.roomGuestText}</Text>
              </View>
            </View>

            <View className="_pg-filters">
              {pageData.filterOptions.map((filter) => (
                <View
                  className={`_pg-filters_item ${filter.key === activeFilterKey ? '_pg-filters_item--active' : ''}`}
                  key={filter.key}
                  onClick={() => setActiveFilterKey(filter.key)}
                >
                  <Text>{filter.label}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-section">
              {visibleRooms.map((room) => (
                <View className="_pg-room-card" key={room.id} onClick={() => handleRoomDetail(room.id)}>
                  <AppImage className="_pg-room-card_image" src={room.imageSrc} mode="aspectFill" />
                  <View className="_pg-room-card_main">
                    <Text className="_pg-room-card_title">{room.title}</Text>
                    <Text className="_pg-room-card_tags">{room.tagsText}</Text>
                    <Text className="_pg-room-card_arrow">›</Text>
                  </View>
                  <View className="_pg-room-card_aside">
                    <Text className="_pg-room-card_price">¥{room.price.toFixed(2)}</Text>
                    <View
                      className="_pg-room-card_button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRoomBooking(room.id);
                      }}
                    >
                      预订
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View className="_pg-section-title">
              <Text>套餐推荐</Text>
            </View>

            <View className="_pg-section">
              {activeHotel.packages.map((item) => (
                <View className="_pg-room-card _pg-room-card--package" key={item.id}>
                  <AppImage className="_pg-room-card_image" src={item.imageSrc} mode="aspectFill" />
                  <View className="_pg-room-card_main">
                    <Text className="_pg-room-card_title">{item.title}</Text>
                    <Text className="_pg-room-card_sales">{item.salesText}</Text>
                  </View>
                  <View className="_pg-room-card_aside">
                    <Text className="_pg-room-card_price">¥{item.price.toFixed(2)}</Text>
                    <View className="_pg-room-card_button" onClick={() => handleRoomBooking(activeHotel.rooms[0]?.id ?? '')}>
                      预订
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </PageShell>
      </View>
    );
  });
});

export default HotelIndexPage;
