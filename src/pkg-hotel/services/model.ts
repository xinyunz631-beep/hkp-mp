const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_BOOKING_WINDOW_DAYS = 90;
export const DEFAULT_MAX_NIGHTS = 7;
export const DEFAULT_MAX_ROOMS = 3;

export interface HotelStayRange {
  checkIn: string;
  checkOut: string;
}

export interface HotelOccupancyRoom {
  id: string;
  adults: number;
  childAges: number[];
}

export interface HotelOccupancy {
  roomCount: number;
  rooms: HotelOccupancyRoom[];
}

export interface HotelGalleryImage {
  id: string;
  src: string;
}

export interface HotelLocationData {
  latitude?: number;
  longitude?: number;
  name: string;
  address: string;
}

export interface HotelFilterOption {
  key: string;
  label: string;
}

export type HotelProductKind = 'room' | 'package';

export interface HotelRatePlanData {
  id: string;
  title: string;
  breakfastText: string;
  bedText: string;
  cancelRule: string;
  policyText: string;
  filterKeys: string[];
  price: number;
  stock: number;
}

export interface HotelProductCardData {
  id: string;
  kind: HotelProductKind;
  title: string;
  subtitle: string;
  imageSrc: string;
  galleryImages: HotelGalleryImage[];
  floorText: string;
  areaText: string;
  bedText: string;
  breakfastText: string;
  capacityText: string;
  cancelRule: string;
  includeText: string;
  tagsText: string;
  filterKeys: string[];
  price: number;
  stock: number;
  ratePlans: HotelRatePlanData[];
}

export interface HotelHomeTabData {
  id: string;
  label: string;
  heroTitle: string;
  heroSubtitle: string;
  galleryImages: HotelGalleryImage[];
  address: string;
  areaText: string;
  introText: string;
  introRichText?: string;
  checkInTimeText: string;
  checkOutTimeText: string;
  phoneNumber: string;
  location: HotelLocationData;
  products: HotelProductCardData[];
}

export interface HotelHomeData {
  title: string;
  bookingWindowDays: number;
  maxNights: number;
  maxRooms: number;
  hotels: HotelHomeTabData[];
  filterOptions: HotelFilterOption[];
}

export interface HotelRoomFeatureData {
  label: string;
  value: string;
}

export interface HotelRoomDetailData {
  hotelId: string;
  hotelName: string;
  hotelAddress: string;
  phoneNumber: string;
  checkInTimeText: string;
  checkOutTimeText: string;
  product: HotelProductCardData;
  stayRange: HotelStayRange;
  occupancy: HotelOccupancy;
  nights: number;
  featureGroups: HotelRoomFeatureData[];
}

export interface HotelGuestFieldData {
  id: string;
  label: string;
  placeholder: string;
  value: string;
}

export interface HotelCheckoutCouponData {
  id: string;
  title: string;
  amountText: string;
  thresholdText: string;
  validityText: string;
  status: 'available' | 'used' | 'expired' | 'disabled';
  tag?: string;
  minimumAmount: number;
  discountAmount: number;
}

export interface HotelCheckoutData {
  draftId: string;
  hotelId: string;
  hotelName: string;
  hotelAddress: string;
  productId: string;
  productTitle: string;
  productSubtitle: string;
  productImageSrc: string;
  ratePlanId: string;
  ratePlanTitle: string;
  roomTagsText: string;
  stayDateText: string;
  nightsText: string;
  checkIn: string;
  checkOut: string;
  occupancy: HotelOccupancy;
  roomCount: number;
  maxRoomCount: number;
  unitAmount: number;
  productAmount?: number;
  totalAmount: number;
  discountAmount: number;
  guestFields: HotelGuestFieldData[];
  contactNamePlaceholder: string;
  contactNameValue: string;
  mobilePlaceholder: string;
  mobileValue: string;
  selectedCouponId?: string;
  couponText: string;
  couponNoticeText?: string;
  coupons: HotelCheckoutCouponData[];
  discountText: string;
  invoiceText: string;
  cancelRule: string;
  checkInTimeText: string;
  checkOutTimeText: string;
}

// 格式化酒店日期 key，所有酒店 BFF 请求统一使用 YYYY-MM-DD。
export function formatHotelDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 生成相对日期，供入住/离店日期选择使用。
export function addHotelDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatHotelDateKey(date);
}

// 获取默认入住日期，默认今天入住、明天离店。
export function createDefaultHotelStayRange(): HotelStayRange {
  const checkIn = formatHotelDateKey(new Date());
  return {
    checkIn,
    checkOut: addHotelDays(checkIn, 1),
  };
}

// 获取默认入住人数，默认一间两成人。
export function createDefaultHotelOccupancy(): HotelOccupancy {
  return {
    roomCount: 1,
    rooms: [
      {
        id: 'room-1',
        adults: 2,
        childAges: [],
      },
    ],
  };
}

// 归一化入住人数，避免页面传参越界影响确认单。
export function normalizeHotelOccupancy(occupancy?: HotelOccupancy): HotelOccupancy {
  const defaultOccupancy = createDefaultHotelOccupancy();
  const roomCount = Math.min(Math.max(occupancy?.roomCount || defaultOccupancy.roomCount, 1), DEFAULT_MAX_ROOMS);
  const rooms = Array.from({ length: roomCount }, (_, index) => {
    const currentRoom = occupancy?.rooms[index] ?? defaultOccupancy.rooms[0];
    return {
      id: `room-${index + 1}`,
      adults: Math.min(Math.max(currentRoom?.adults || 2, 1), 4),
      childAges: (currentRoom?.childAges ?? []).slice(0, 3),
    };
  });

  return {
    roomCount,
    rooms,
  };
}

// 生成人数摘要，用于房型详情和订单确认页展示。
export function summarizeHotelOccupancy(occupancy?: HotelOccupancy) {
  const normalizedOccupancy = normalizeHotelOccupancy(occupancy);
  const firstRoom = normalizedOccupancy.rooms[0] ?? createDefaultHotelOccupancy().rooms[0];
  const childText = firstRoom.childAges.length > 0 ? `${firstRoom.childAges.length}儿童` : '0儿童';
  return `${normalizedOccupancy.roomCount}间 ${firstRoom.adults}成人${childText}`;
}

// 计算入住间夜，超过系统可展示上限时按前端交互上限收口。
export function calculateHotelNights(range: HotelStayRange) {
  const checkInDate = new Date(`${range.checkIn}T00:00:00`);
  const checkOutDate = new Date(`${range.checkOut}T00:00:00`);
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) return 1;
  return Math.max(1, Math.min(DEFAULT_MAX_NIGHTS, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / ONE_DAY_MS)));
}

// 序列化入住人数，用于跨页面传参。
export function serializeHotelOccupancy(occupancy: HotelOccupancy) {
  return encodeURIComponent(JSON.stringify(normalizeHotelOccupancy(occupancy)));
}

// 解析入住人数页面参数，解析失败时回到默认一间两成人。
export function parseHotelOccupancy(value?: string): HotelOccupancy {
  if (!value) return createDefaultHotelOccupancy();

  try {
    const decodedValue = decodeURIComponent(value);
    return normalizeHotelOccupancy(JSON.parse(decodedValue) as HotelOccupancy);
  } catch {
    return createDefaultHotelOccupancy();
  }
}

// 格式化入住日期文案。
export function formatHotelStayDateText(range: HotelStayRange) {
  const formatMonthDay = (dateKey: string) => {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return `${formatMonthDay(range.checkIn)}-${formatMonthDay(range.checkOut)}`;
}
