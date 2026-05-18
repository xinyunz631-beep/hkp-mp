import { useMemo, useState } from 'react';
import Taro from '@tarojs/taro';
import { Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { DateSelectionPopup } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import {
  openWechatLocation,
  previewWechatImages,
  showWechatConfirm,
  showWechatShareGuide,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import { fetchHotelHomeData, type HotelHomeData } from '@/pkg-hotel/services';
import './index.scss';

const HOTEL_LOCATION = {
  latitude: 30.6386,
  longitude: 119.684,
  name: '银润锦江城堡酒店',
  address: '安吉县天使大道8号',
};

const stayRangeDefault = ['2026-10-25', '2026-10-26'];
const guestOptions = ['每间 2成人 0儿童', '每间 2成人 1儿童', '每间 1成人 1儿童'];

function formatDateLabel(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { week: '周日', date: '10月25日' };

  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    week: weeks[date.getDay()],
    date: `${date.getMonth() + 1}月${date.getDate()}日`,
  };
}

function resolveNights(range: string[]) {
  const [start, end] = range;
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  const nights = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  return `${nights}晚`;
}

const HotelIndexPage = observer(function HotelIndexPage() {
  const [pageData, setPageData] = useState<HotelHomeData>();
  const [activeHotelId, setActiveHotelId] = useState('');
  const [activeFilterKey, setActiveFilterKey] = useState('queen');
  const [stayRange, setStayRange] = useState<string[]>(stayRangeDefault);
  const [datePopupVisible, setDatePopupVisible] = useState(false);
  const [guestOptionIndex, setGuestOptionIndex] = useState(0);
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
  const checkInLabel = formatDateLabel(stayRange[0]);
  const checkOutLabel = formatDateLabel(stayRange[1]);
  const roomGuestText = guestOptions[guestOptionIndex] || guestOptions[0];
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

  async function handleIntroPress() {
    await showWechatConfirm({
      title: activeHotel?.heroTitle || '酒店介绍',
      content: `${activeHotel?.heroSubtitle || '亲子度假酒店'}，位于${activeHotel?.address || HOTEL_LOCATION.address}，适合乐园游玩前后入住。`,
      confirmText: '知道了',
      cancelText: '关闭',
    });
  }

  async function handleGuestPress() {
    const nextIndex = (guestOptionIndex + 1) % guestOptions.length;
    setGuestOptionIndex(nextIndex);
    await showWechatToast(`已切换为${guestOptions[nextIndex]}`);
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
            <View className="_pg-nav-action" onClick={() => void showWechatShareGuide()}>
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
              <AppImage
                className="_pg-hero_image"
                src={heroImageSrc}
                mode="aspectFill"
                onClick={() => previewWechatImages({ urls: [heroImageSrc], emptyText: '暂无酒店大图' })}
              />
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

            <View className="_pg-info-row" onClick={() => void openWechatLocation({ ...HOTEL_LOCATION, name: activeHotel.heroTitle, address: activeHotel.address })}>
              <View className="_pg-info-row_main">
                <Text className="_pg-info-row_address">{activeHotel.address}</Text>
                <Text className="_pg-info-row_area">{activeHotel.areaText}</Text>
              </View>
              <Text className="_pg-info-row_action">地图/导航 ›</Text>
            </View>

            <View className="_pg-info-row" onClick={() => void handleIntroPress()}>
              <Text className="_pg-info-row_label">酒店介绍</Text>
              <Text className="_pg-info-row_action">详情 ›</Text>
            </View>

            <View className="_pg-stay">
              <View className="_pg-stay_item" onClick={() => setDatePopupVisible(true)}>
                <Text className="_pg-stay_week">{checkInLabel.week}</Text>
                <Text className="_pg-stay_date">{checkInLabel.date}</Text>
              </View>
              <View className="_pg-stay_middle" onClick={() => setDatePopupVisible(true)}>
                <Text className="_pg-stay_night">{resolveNights(stayRange)}</Text>
              </View>
              <View className="_pg-stay_item" onClick={() => setDatePopupVisible(true)}>
                <Text className="_pg-stay_week">{checkOutLabel.week}</Text>
                <Text className="_pg-stay_date">{checkOutLabel.date}</Text>
              </View>
              <View className="_pg-stay_guest" onClick={() => void handleGuestPress()}>
                <Text className="_pg-stay_guest-top">每间</Text>
                <Text className="_pg-stay_guest-bottom">{roomGuestText.replace('每间 ', '')}</Text>
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

          <PageShare>
            <DateSelectionPopup
              visible={datePopupVisible}
              mode="range"
              title="选择入住日期"
              value={stayRange}
              startDate="2026-01-01"
              endDate="2026-12-31"
              onClose={() => setDatePopupVisible(false)}
              onConfirm={(nextValue) => {
                const nextRange = Array.isArray(nextValue) ? nextValue : [nextValue];
                if (nextRange.length >= 2) setStayRange(nextRange.slice(0, 2));
                setDatePopupVisible(false);
              }}
            />
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default HotelIndexPage;
