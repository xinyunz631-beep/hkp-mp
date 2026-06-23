import { useMemo, useState } from 'react';
import Taro, { useShareAppMessage } from '@tarojs/taro';
import { Swiper, SwiperItem, Text, View } from '@tarojs/components';
import { observer } from 'mobx-react';
import { AppBottomSheet } from '@/core/components/AppBottomSheet';
import { AppIcon } from '@/core/components/AppIcon';
import { AppImage } from '@/core/components/AppImage';
import { AppPopup } from '@/core/components/AppPopup';
import { AppShareButton } from '@/core/components/AppShareButton';
import { BaseEmpty } from '@/core/components/BaseEmpty';
import { DateSelectionPopup, QuantityStepper } from '@/core/components/commerce';
import { PageShare, PageShell } from '@/core/components/PageShell';
import { MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import { usePageRuntime } from '@/core/runtime/use-page-runtime';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import {
  callWechatPhone,
  openWechatLocation,
  previewWechatImages,
  showWechatToast,
} from '@/core/utils/wechat-actions';
import { fetchHotelHomeData, type HotelHomeData } from '@/pkg-hotel/services';
import {
  addHotelDays,
  createDefaultHotelOccupancy,
  createDefaultHotelStayRange,
  formatHotelDateKey,
  normalizeHotelOccupancy,
  parseHotelOccupancy,
  serializeHotelOccupancy,
  type HotelOccupancy,
  type HotelProductCardData,
  type HotelStayRange,
} from '@/pkg-hotel/services/model';
import { createHotelOrderDraft } from '@/pkg-hotel/services/order-draft';
import './index.scss';

const HOTEL_PAGE_TITLE = '畅‘住’HelloKittyPark';
const LOGIN_REASON = '登录后可提交酒店订单';

function formatDateLabel(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { week: '周三', date: '05.20' };

  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return {
    week: weeks[date.getDay()],
    date: `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`,
  };
}

function formatCalendarSummaryDate(dateText?: string) {
  if (!dateText) return '请选择';

  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '请选择';

  const todayKey = formatHotelDateKey(new Date());
  const tomorrowKey = addHotelDays(todayKey, 1);
  const weeks = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const suffix = dateText === todayKey
    ? ' 今天'
    : dateText === tomorrowKey
      ? ' 明天'
      : ` ${weeks[date.getDay()]}`;

  return `${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日${suffix}`;
}

function summarizeStayOccupancy(occupancy?: HotelOccupancy) {
  const normalizedOccupancy = normalizeHotelOccupancy(occupancy);
  const adultCount = normalizedOccupancy.rooms.reduce((sum, room) => sum + room.adults, 0);
  const childCount = normalizedOccupancy.rooms.reduce((sum, room) => sum + room.childAges.length, 0);
  return `${normalizedOccupancy.roomCount}间·${adultCount}成人·${childCount}儿童`;
}

function resolveNights(range: HotelStayRange) {
  const startDate = new Date(`${range.checkIn}T00:00:00`);
  const endDate = new Date(`${range.checkOut}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 1;
  return Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
}

function createDetailUrl({
  hotelId,
  productId,
  stayRange,
  occupancy,
}: {
  hotelId: string;
  productId: string;
  stayRange: HotelStayRange;
  occupancy: HotelOccupancy;
}) {
  const query = [
    `hotelId=${encodeURIComponent(hotelId)}`,
    `productId=${encodeURIComponent(productId)}`,
    `checkIn=${encodeURIComponent(stayRange.checkIn)}`,
    `checkOut=${encodeURIComponent(stayRange.checkOut)}`,
    `occupancy=${serializeHotelOccupancy(occupancy)}`,
  ].join('&');

  return `${MINI_PACKAGE_ROUTES.hotelRoomDetail}?${query}`;
}

const HotelIndexPage = observer(function HotelIndexPage() {
  const [pageData, setPageData] = useState<HotelHomeData>();
  const [activeHotelId, setActiveHotelId] = useState('');
  const [activeFilterKey, setActiveFilterKey] = useState('');
  const [stayRange, setStayRange] = useState<HotelStayRange>(() => createDefaultHotelStayRange());
  const [occupancy, setOccupancy] = useState<HotelOccupancy>(() => createDefaultHotelOccupancy());
  const [guestDraft, setGuestDraft] = useState<HotelOccupancy>(() => createDefaultHotelOccupancy());
  const [datePopupVisible, setDatePopupVisible] = useState(false);
  const [guestPopupVisible, setGuestPopupVisible] = useState(false);
  const [introPopupVisible, setIntroPopupVisible] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const pageRuntime = usePageRuntime({
    initPage: async () => {
      const params = Taro.getCurrentInstance().router?.params ?? {};
      const defaultRange = createDefaultHotelStayRange();
      const initialRange = params.checkIn && params.checkOut
        ? { checkIn: params.checkIn, checkOut: params.checkOut }
        : defaultRange;
      const defaultOccupancy = params.occupancy ? parseHotelOccupancy(params.occupancy) : createDefaultHotelOccupancy();
      const nextData = await fetchHotelHomeData({
        stayRange: initialRange,
        occupancy: defaultOccupancy,
      });

      setStayRange(initialRange);
      setOccupancy(defaultOccupancy);
      setGuestDraft(defaultOccupancy);
      setPageData(nextData);
      setActiveHotelId(nextData.hotels[0]?.id ?? '');
      setActiveFilterKey('');
      setBannerIndex(0);
    },
  });

  const activeHotel = useMemo(
    () => pageData?.hotels.find((hotel) => hotel.id === activeHotelId) ?? pageData?.hotels[0],
    [activeHotelId, pageData],
  );
  const products = activeHotel?.products ?? [];
  const validBannerImages = activeHotel?.galleryImages.filter((item) => Boolean(item.src)) ?? [];
  const checkInLabel = formatDateLabel(stayRange.checkIn);
  const checkOutLabel = formatDateLabel(stayRange.checkOut);
  const occupancyLabel = summarizeStayOccupancy(occupancy);
  const todayKey = formatHotelDateKey(new Date());
  const dateEndKey = addHotelDays(todayKey, pageData?.bookingWindowDays ?? 90);
  const normalizedGuestDraft = normalizeHotelOccupancy(guestDraft);

  function resolveCalendarRange(nextValue: string | string[]) {
    const dates = Array.isArray(nextValue) ? nextValue : nextValue ? [nextValue] : [];
    const hasPickedDate = dates.length > 0;
    const nextCheckIn = dates[0] || stayRange.checkIn;
    const nextCheckOut = dates[1] && dates[1] !== nextCheckIn
      ? dates[1]
      : (hasPickedDate ? '' : stayRange.checkOut);

    return {
      checkIn: nextCheckIn,
      checkOut: nextCheckOut,
    };
  }

  function renderHotelCalendarSummary(nextValue: string | string[]) {
    const nextRange = resolveCalendarRange(nextValue);

    return (
      <View className="_pg-calendar-summary">
        <View className="_pg-calendar-summary_item">
          <Text className="_pg-calendar-summary_label">入住</Text>
          <Text className="_pg-calendar-summary_value">{formatCalendarSummaryDate(nextRange.checkIn)}</Text>
        </View>
        <Text className="_pg-calendar-summary_dash">-</Text>
        <View className="_pg-calendar-summary_item _pg-calendar-summary_item--end">
          <Text className="_pg-calendar-summary_label">离店</Text>
          <Text className="_pg-calendar-summary_value">{formatCalendarSummaryDate(nextRange.checkOut)}</Text>
        </View>
      </View>
    );
  }

  function renderHotelCalendarConfirmText(nextValue: string | string[]) {
    const nextRange = resolveCalendarRange(nextValue);
    if (!nextRange.checkOut) return '请选择离店日期';

    return `确认${resolveNights(nextRange)}晚`;
  }

  useShareAppMessage(() => ({
    title: `${activeHotel?.heroTitle || 'Hello Kitty Park 酒店'}亲子度假`,
    path: MINI_PACKAGE_ROUTES.hotelHome,
    imageUrl: validBannerImages[0]?.src || undefined,
  }));

  async function refreshHotelData(nextParams: {
    nextStayRange?: HotelStayRange;
    nextOccupancy?: HotelOccupancy;
    nextFilterKey?: string;
    nextHotelId?: string;
  }) {
    const nextStayRange = nextParams.nextStayRange ?? stayRange;
    const nextOccupancy = nextParams.nextOccupancy ?? occupancy;
    const nextFilterKey = nextParams.nextFilterKey ?? activeFilterKey;
    const nextData = await fetchHotelHomeData({
      stayRange: nextStayRange,
      occupancy: nextOccupancy,
      filterKey: nextFilterKey,
    });

    setPageData(nextData);
    setStayRange(nextStayRange);
    setOccupancy(nextOccupancy);
    setGuestDraft(nextOccupancy);
    setActiveFilterKey(nextFilterKey);
    setActiveHotelId(nextParams.nextHotelId ?? nextData.hotels[0]?.id ?? '');
    setBannerIndex(0);
  }

  function handleHotelChange(hotelId: string) {
    void pageRuntime.withLoading(() => refreshHotelData({
      nextHotelId: hotelId,
      nextFilterKey: '',
    }));
  }

  function handleFilterPress(filterKey: string) {
    const nextFilterKey = activeFilterKey === filterKey ? '' : filterKey;
    void pageRuntime.withLoading(() => refreshHotelData({ nextFilterKey }));
  }

  async function handleDateConfirm(nextValue: string | string[]) {
    const nextRange = (Array.isArray(nextValue) ? nextValue : [nextValue]).filter(Boolean);
    const nextCheckIn = nextRange[0];
    const nextCheckOut = nextRange[1];
    if (!nextCheckIn || !nextCheckOut || nextCheckIn === nextCheckOut) {
      setDatePopupVisible(true);
      await showWechatToast('请选择离店日期');
      return;
    }

    setDatePopupVisible(false);
    await pageRuntime.withLoading(() => refreshHotelData({
      nextStayRange: {
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
      },
    }));
  }

  function openGuestPopup() {
    setGuestDraft(normalizeHotelOccupancy(occupancy));
    setGuestPopupVisible(true);
  }

  function updateGuestDraftRoomCount(nextRoomCount: number) {
    setGuestDraft((current) => {
      const normalizedCurrent = normalizeHotelOccupancy(current);
      const rooms = Array.from({ length: nextRoomCount }, (_, index) => normalizedCurrent.rooms[index] ?? {
        id: `room-${index + 1}`,
        adults: 2,
        childAges: [],
      });

      return normalizeHotelOccupancy({
        roomCount: nextRoomCount,
        rooms,
      });
    });
  }

  function updateGuestDraftRoom(index: number, patch: Partial<{ adults: number; childCount: number; childAge: number; childIndex: number }>) {
    setGuestDraft((current) => {
      const normalizedCurrent = normalizeHotelOccupancy(current);
      const rooms = normalizedCurrent.rooms.map((room, roomIndex) => {
        if (roomIndex !== index) return room;

        if (typeof patch.childCount === 'number') {
          return {
            ...room,
            childAges: Array.from({ length: patch.childCount }, (_, childIndex) => room.childAges[childIndex] ?? 6),
          };
        }

        if (typeof patch.childAge === 'number' && typeof patch.childIndex === 'number') {
          const nextChildAge = patch.childAge;
          const nextChildIndex = patch.childIndex;

          return {
            ...room,
            childAges: room.childAges.map((age, childIndex) => (
              childIndex === nextChildIndex ? nextChildAge : age
            )),
          };
        }

        return {
          ...room,
          adults: patch.adults ?? room.adults,
        };
      });

      return normalizeHotelOccupancy({
        roomCount: normalizedCurrent.roomCount,
        rooms,
      });
    });
  }

  async function handleGuestConfirm() {
    setGuestPopupVisible(false);
    await pageRuntime.withLoading(() => refreshHotelData({
      nextOccupancy: normalizedGuestDraft,
    }));
  }

  function handlePreviewBanner() {
    const urls = validBannerImages.map((item) => item.src);
    void previewWechatImages({
      urls,
      current: urls[bannerIndex],
      emptyText: '暂无酒店大图',
    });
  }

  function handleProductDetail(product: HotelProductCardData) {
    Taro.navigateTo({
      url: createDetailUrl({
        hotelId: activeHotel?.id ?? '',
        productId: product.id,
        stayRange,
        occupancy,
      }),
    });
  }

  async function handleProductBooking(product: HotelProductCardData) {
    const ratePlans = Array.isArray(product.ratePlans) ? product.ratePlans : [];
    const selectedRatePlan = ratePlans.find((ratePlan) => ratePlan.stock > 0) ?? ratePlans[0];

    if (!selectedRatePlan) {
      void showWechatToast('当前产品暂不可预订');
      return;
    }

    const draft = createHotelOrderDraft({
      hotelId: activeHotel?.id ?? '',
      hotelName: activeHotel?.heroTitle ?? '',
      hotelAddress: activeHotel?.address ?? '',
      hotelPhone: activeHotel?.phoneNumber ?? '',
      productId: product.id,
      product,
      ratePlanId: selectedRatePlan.id,
      stayRange,
      occupancy,
      checkInTimeText: activeHotel?.checkInTimeText ?? '',
      checkOutTimeText: activeHotel?.checkOutTimeText ?? '',
    });

    if (!draft) {
      void showWechatToast('当前产品暂不可预订');
      return;
    }

    navigateToMiniRoute(`${MINI_PACKAGE_ROUTES.hotelCheckout}?draftId=${encodeURIComponent(draft.id)}`, {
      loginReason: LOGIN_REASON,
    });
  }

  return pageRuntime.renderPage(() => {
    if (!pageData || !activeHotel) return null;

    return (
      <View className="_pg">
        <PageShell
          title={HOTEL_PAGE_TITLE}
          className="_pg-shell"
          reserveTabBarSpace={false}
        >
          <View className="_pg-content">
            <View className="_pg-tabs">
              {pageData.hotels.map((hotel) => {
                const active = hotel.id === activeHotel.id;

                return (
                  <View
                    className={`_pg-tabs_item ${active ? '_pg-tabs_item--active' : ''}`}
                    key={hotel.id}
                    onClick={() => handleHotelChange(hotel.id)}
                  >
                    <Text>{hotel.label}</Text>
                    {active ? <View className="_pg-tabs_indicator" /> : null}
                  </View>
                );
              })}
            </View>

            <View className='_pg-bannerroot'>
              <View className="_pg-banner" onClick={handlePreviewBanner}>
                <Swiper
                  className="_pg-banner_swiper"
                  circular={validBannerImages.length > 1}
                  current={bannerIndex}
                  onChange={(event) => setBannerIndex(event.detail.current)}
                >
                  {(validBannerImages.length > 0 ? validBannerImages : [{ id: 'empty', src: '' }]).map((image) => (
                    <SwiperItem className="_pg-banner_item" key={image.id}>
                      <AppImage className="_pg-banner_image" src={image.src} mode="aspectFill" />
                    </SwiperItem>
                  ))}
                </Swiper>
                <View className="_pg-banner_mask" />
                <Text className="_pg-banner_title">{activeHotel.heroTitle}</Text>
                {validBannerImages.length > 0 ? (
                  <Text className="_pg-banner_count">图片{validBannerImages.length}张</Text>
                ) : null}
              </View>
            </View>

            <View className="_pg-info-row" onClick={() => void openWechatLocation(activeHotel.location)}>
              <View className="_pg-info-row_main">
                <Text className="_pg-info-row_address">{activeHotel.address}</Text>
              </View>
              <View className="_pg-info-row_action">
                <Text>地图/导航</Text>
                <AppIcon name="arrowRight" className="_pg-info-row_arrow" size={16} color="#23262f" />
              </View>
            </View>

            <View className="_pg-info-row">
              <Text className="_pg-info-row_label">酒店介绍</Text>
              <View className="_pg-info-row_actions">
                <View className="_pg-info-row_detail" onClick={() => setIntroPopupVisible(true)}>
                  <Text>详情介绍</Text>
                  <AppIcon name="arrowRight" className="_pg-info-row_arrow" size={16} color="#4b5563" />
                </View>
                <Text className="_pg-info-row_split">｜</Text>
                <AppShareButton className="_pg-info-row_share" iconColor="#6b7280" />
              </View>
            </View>

            <View className="_pg-stay">
              <View className="_pg-stay_dates" onClick={() => setDatePopupVisible(true)}>
                <View className="_pg-stay_date-block">
                  <Text className="_pg-stay_date">{checkInLabel.date}</Text>
                  <Text className="_pg-stay_tag">住</Text>
                </View>
                <View className="_pg-stay_dash" />
                <View className="_pg-stay_date-block">
                  <Text className="_pg-stay_date">{checkOutLabel.date}</Text>
                  <Text className="_pg-stay_tag">离</Text>
                </View>
                <Text className="_pg-stay_night">共{resolveNights(stayRange)}晚</Text>
                <AppIcon name="arrowRight" className="_pg-stay_dates-arrow" size={14} color="#c8cdd6" />
              </View>
              <View className="_pg-stay_split" />
              <View className="_pg-stay_guest" onClick={openGuestPopup}>
                <Text className="_pg-stay_guest-text">{occupancyLabel}</Text>
                <AppIcon name="arrowRight" size={14} color="#c8cdd6" />
              </View>
            </View>

            <View className="_pg-filters">
              {pageData.filterOptions.map((filter) => (
                <View
                  className={`_pg-filters_item ${filter.key === activeFilterKey ? '_pg-filters_item--active' : ''}`}
                  key={filter.key}
                  onClick={() => handleFilterPress(filter.key)}
                >
                  <Text>{filter.label}</Text>
                </View>
              ))}
            </View>

            <View className="_pg-section">
              {products.length > 0 ? products.map((product) => (
                <View className="_pg-product-card" key={product.id} onClick={() => handleProductDetail(product)}>
                  <AppImage className="_pg-product-card_image" src={product.imageSrc} mode="aspectFill" />
                  <View className="_pg-product-card_main">
                    <Text className="_pg-product-card_title">{product.title}</Text>
                    <Text className="_pg-product-card_meta">{product.subtitle}</Text>
                    <View className="_pg-product-card_footer">
                      {typeof product.price === 'number' ? <Text className="_pg-product-card_price">¥{product.price}</Text> : null}
                      <View
                        className="_pg-product-card_button"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleProductBooking(product);
                        }}
                      >
                        <Text>预定</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )) : (
                <BaseEmpty
                  className="_pg-empty"
                  size="small"
                  title="当前条件暂无可订产品"
                  description="可调整日期、人数或筛选条件后再试"
                />
              )}
            </View>
          </View>

          <PageShare>
            <DateSelectionPopup
              visible={datePopupVisible}
              mode="range"
              title="选择入住日期"
              value={[stayRange.checkIn, stayRange.checkOut]}
              startDate={todayKey}
              endDate={dateEndKey}
              startText="入住"
              endText="离店"
              confirmText={renderHotelCalendarConfirmText}
              footerSummary={renderHotelCalendarSummary}
              onClose={() => setDatePopupVisible(false)}
              onConfirm={(nextValue) => void handleDateConfirm(nextValue)}
            />

            <AppPopup
              visible={introPopupVisible}
              className="_pg-intro-popup-shell"
              contentClassName="_pg-intro-popup"
              onClose={() => setIntroPopupVisible(false)}
            >
              <View className="_pg-intro-popup_header">
                <Text className="_pg-intro-popup_title">酒店介绍</Text>
                <View className="_pg-intro-popup_close" onClick={() => setIntroPopupVisible(false)}>
                  <AppIcon name="close" size={16} color="#667085" />
                </View>
              </View>
              <Text className="_pg-intro-popup_desc">{activeHotel.introText}</Text>
              <View className="_pg-intro-popup_line">
                <Text>入住时间</Text>
                <Text>{activeHotel.checkInTimeText}</Text>
              </View>
              <View className="_pg-intro-popup_line">
                <Text>退房时间</Text>
                <Text>{activeHotel.checkOutTimeText}</Text>
              </View>
              <View className="_pg-intro-popup_line" onClick={() => void callWechatPhone(activeHotel.phoneNumber)}>
                <Text>联系电话</Text>
                <View className="_pg-intro-popup_phone">
                  <Text>{activeHotel.phoneNumber}</Text>
                  <AppIcon name="phone" size={16} color="#d94a88" />
                </View>
              </View>
            </AppPopup>

            <AppBottomSheet
              visible={guestPopupVisible}
              className="_pg-guest-popup-shell"
              title="选择房间和入住人数"
              confirmText="确定"
              onClose={() => setGuestPopupVisible(false)}
              onConfirm={() => void handleGuestConfirm()}
            >
              <View className="_pg-guest-popup_row">
                <Text className="_pg-guest-popup_label">房间数</Text>
                <QuantityStepper
                  value={normalizedGuestDraft.roomCount}
                  min={1}
                  max={pageData.maxRooms}
                  onChange={updateGuestDraftRoomCount}
                />
              </View>
              {normalizedGuestDraft.rooms.map((room, roomIndex) => (
                <View className="_pg-guest-room" key={room.id}>
                  <Text className="_pg-guest-room_title">房间{roomIndex + 1}</Text>
                  <View className="_pg-guest-popup_row">
                    <Text className="_pg-guest-popup_label">成人</Text>
                    <QuantityStepper
                      value={room.adults}
                      min={1}
                      max={4}
                      onChange={(value) => updateGuestDraftRoom(roomIndex, { adults: value })}
                    />
                  </View>
                  <View className="_pg-guest-popup_row">
                    <Text className="_pg-guest-popup_label">儿童</Text>
                    <QuantityStepper
                      value={room.childAges.length}
                      min={0}
                      max={3}
                      onChange={(value) => updateGuestDraftRoom(roomIndex, { childCount: value })}
                    />
                  </View>
                  {room.childAges.map((age, childIndex) => (
                    <View className="_pg-guest-popup_row _pg-guest-popup_row--sub" key={`${room.id}-${childIndex}`}>
                      <Text className="_pg-guest-popup_label">儿童{childIndex + 1}年龄</Text>
                      <QuantityStepper
                        value={age}
                        min={0}
                        max={17}
                        onChange={(value) => updateGuestDraftRoom(roomIndex, { childIndex, childAge: value })}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </AppBottomSheet>
          </PageShare>
        </PageShell>
      </View>
    );
  });
});

export default HotelIndexPage;
