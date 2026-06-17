import { request } from '@/core/request';
import {
  addHotelDays,
  calculateHotelNights,
  DEFAULT_BOOKING_WINDOW_DAYS,
  DEFAULT_MAX_NIGHTS,
  DEFAULT_MAX_ROOMS,
  type HotelFilterOption,
  type HotelGalleryImage,
  type HotelHomeData,
  type HotelHomeTabData,
  type HotelOccupancy,
  type HotelProductCardData,
  type HotelProductKind,
  type HotelRatePlanData,
  type HotelRoomDetailData,
  type HotelStayRange,
} from './model';

interface BackendPageResult<TItem> {
  list?: TItem[];
  records?: TItem[];
  items?: TItem[];
  total?: number;
}

interface BffHotelProfileView {
  hotelId?: string;
  hotelName?: string;
  label?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  address?: string;
  areaText?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  introText?: string;
  introRichText?: string;
  phoneNumber?: string;
  galleryImages?: Array<Record<string, unknown>>;
  checkInTimeText?: string;
  checkOutTimeText?: string;
  bookingWindowDays?: number;
  maxNights?: number;
  maxRooms?: number;
}

interface BffHotelRoomView {
  roomTypeId?: string;
  hotelId?: string;
  kind?: string;
  titleTemplate?: string;
  subtitleTemplate?: string;
  imageUrl?: string;
  galleryImages?: Array<Record<string, unknown>>;
  floorText?: string;
  areaText?: string;
  bedText?: string;
  breakfastText?: string;
  baseAdultCount?: number;
  baseChildCount?: number;
  maxAdultCount?: number;
  maxChildCount?: number;
  capacityText?: string;
  includeText?: string;
  facilityTags?: string[];
  filterKeys?: string[];
  sortOrder?: number;
  ratePlans?: Array<Record<string, unknown>>;
}

interface BffHotelInventoryDayView {
  hotelId?: string;
  roomTypeId?: string;
  ratePlanId?: string;
  date?: string;
  price?: number;
  totalStock?: number;
  soldStock?: number;
  lockedStock?: number;
  availableStock?: number;
  saleStatus?: string;
  stopSell?: boolean;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
}

interface BffHotelDetailResponse {
  profile?: BffHotelProfileView;
  rooms?: BffHotelRoomView[];
}

interface FetchHotelHomeParams {
  stayRange: HotelStayRange;
  occupancy: HotelOccupancy;
  filterKey?: string;
}

interface FetchRoomDetailParams extends FetchHotelHomeParams {
  hotelId?: string;
  productId?: string;
}

type InventoryLookup = Map<string, BffHotelInventoryDayView[]>;

function appendQuery(url: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `${url}?${query}` : url;
}

function normalizePageList<TItem>(result: BackendPageResult<TItem>) {
  return result.list || result.records || result.items || [];
}

function text(value: unknown, defaultValue = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : defaultValue;
}

function number(value: unknown, defaultValue = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

function readImageSrc(item: Record<string, unknown>) {
  return text(item.src) || text(item.url) || text(item.imageUrl) || text(item.thumbUrl);
}

function mapGalleryImages(images?: Array<Record<string, unknown>>): HotelGalleryImage[] {
  return (images || [])
    .map((item, index) => ({
      id: text(item.id) || text(item.uid) || `image-${index + 1}`,
      src: readImageSrc(item),
    }))
    .filter((item) => Boolean(item.src));
}

function mapProfile(profile: BffHotelProfileView, products: HotelProductCardData[]): HotelHomeTabData {
  const hotelId = text(profile.hotelId);
  const hotelName = text(profile.hotelName) || text(profile.heroTitle) || hotelId;
  const galleryImages = mapGalleryImages(profile.galleryImages);

  return {
    id: hotelId,
    label: text(profile.label) || hotelName,
    heroTitle: text(profile.heroTitle) || hotelName,
    heroSubtitle: text(profile.heroSubtitle),
    galleryImages,
    address: text(profile.address),
    areaText: text(profile.areaText),
    introText: text(profile.introText),
    introRichText: text(profile.introRichText),
    checkInTimeText: text(profile.checkInTimeText),
    checkOutTimeText: text(profile.checkOutTimeText),
    phoneNumber: text(profile.phoneNumber),
    location: {
      latitude: profile.latitude,
      longitude: profile.longitude,
      name: text(profile.locationName) || hotelName,
      address: text(profile.locationAddress) || text(profile.address),
    },
    products,
  };
}

function resolveTemplate(template: string | undefined, nights: number) {
  return text(template).replace('{nights}', `${nights}晚`);
}

function mapInventoryKey(roomTypeId: string, ratePlanId: string) {
  return `${roomTypeId}::${ratePlanId}`;
}

function groupInventory(records: BffHotelInventoryDayView[]) {
  return records.reduce<InventoryLookup>((result, item) => {
    const roomTypeId = text(item.roomTypeId);
    const ratePlanId = text(item.ratePlanId);
    if (!roomTypeId || !ratePlanId) return result;
    const key = mapInventoryKey(roomTypeId, ratePlanId);
    result.set(key, [...(result.get(key) || []), item]);
    return result;
  }, new Map());
}

function resolveRatePlanInventory(roomTypeId: string, ratePlanId: string, lookup: InventoryLookup) {
  const nights = lookup.get(mapInventoryKey(roomTypeId, ratePlanId)) || [];
  const restricted = nights.some((item) => (
    item.stopSell ||
    item.closedToArrival ||
    item.closedToDeparture ||
    item.saleStatus !== 'onSale'
  ));
  const stock = nights.length
    ? Math.min(...nights.map((item) => number(item.availableStock)))
    : 0;
  const price = nights.length
    ? Math.max(0, Math.round(nights.reduce((sum, item) => sum + number(item.price), 0) / nights.length / 100))
    : 0;

  return {
    price,
    stock: restricted ? 0 : stock,
  };
}

function mapRatePlan(room: BffHotelRoomView, plan: Record<string, unknown>, lookup: InventoryLookup): HotelRatePlanData {
  const roomTypeId = text(room.roomTypeId);
  const ratePlanId = text(plan.ratePlanId) || text(plan.id);
  const inventory = resolveRatePlanInventory(roomTypeId, ratePlanId, lookup);

  return {
    id: ratePlanId,
    title: text(plan.title) || text(plan.ratePlanName) || ratePlanId,
    breakfastText: text(plan.breakfastText) || text(room.breakfastText),
    bedText: text(plan.bedText) || text(room.bedText),
    cancelRule: text(plan.cancelRule),
    policyText: text(plan.policyText),
    filterKeys: Array.isArray(plan.filterKeys) ? plan.filterKeys.map(String) : [],
    price: inventory.price,
    stock: inventory.stock,
  };
}

function mapRoom(room: BffHotelRoomView, stayRange: HotelStayRange, lookup: InventoryLookup): HotelProductCardData {
  const nights = calculateHotelNights(stayRange);
  const roomTypeId = text(room.roomTypeId);
  const galleryImages = mapGalleryImages(room.galleryImages);
  const ratePlans = (room.ratePlans || []).map((plan) => mapRatePlan(room, plan, lookup));
  const displayRatePlan = ratePlans.find((plan) => plan.stock > 0) || ratePlans[0];
  const facilityTags = Array.isArray(room.facilityTags) ? room.facilityTags.map(String) : [];
  const filterKeys = Array.isArray(room.filterKeys) ? room.filterKeys.map(String) : [];
  const tagsText = [
    text(room.floorText),
    text(room.areaText),
    text(room.bedText),
    text(displayRatePlan?.breakfastText) || text(room.breakfastText),
  ].filter(Boolean).join(' ');

  return {
    id: roomTypeId,
    kind: room.kind === 'room' ? 'room' : 'package' as HotelProductKind,
    title: resolveTemplate(room.titleTemplate, nights) || roomTypeId,
    subtitle: resolveTemplate(room.subtitleTemplate, nights),
    imageSrc: text(room.imageUrl) || galleryImages[0]?.src || '',
    galleryImages,
    floorText: text(room.floorText),
    areaText: text(room.areaText),
    bedText: text(room.bedText),
    breakfastText: text(displayRatePlan?.breakfastText) || text(room.breakfastText),
    capacityText: text(room.capacityText),
    cancelRule: text(displayRatePlan?.cancelRule),
    includeText: text(room.includeText) || facilityTags.join('、'),
    tagsText,
    filterKeys: Array.from(new Set([...filterKeys, ...ratePlans.flatMap((plan) => plan.filterKeys)])),
    price: displayRatePlan?.price || 0,
    stock: displayRatePlan?.stock || 0,
    ratePlans,
  };
}

function mapFilterOptions(products: HotelProductCardData[]): HotelFilterOption[] {
  const options = products.flatMap((product) => product.filterKeys);
  return Array.from(new Set(options)).map((key) => ({
    key,
    label: key,
  }));
}

async function fetchHotelProfiles() {
  const result = await request<BackendPageResult<BffHotelProfileView>>({
    url: appendQuery('/api/bff/hotels', { page: 1, size: 20 }),
    method: 'GET',
  });
  return normalizePageList(result).filter((item) => Boolean(item.hotelId));
}

export async function fetchBffHotelRooms(hotelId: string, stayRange: HotelStayRange) {
  return request<BffHotelRoomView[]>({
    url: appendQuery(`/api/bff/hotels/${encodeURIComponent(hotelId)}/rooms`, {
      checkInDate: stayRange.checkIn,
      checkOutDate: stayRange.checkOut,
    }),
    method: 'GET',
  });
}

async function fetchBffHotelInventory(hotelId: string, stayRange: HotelStayRange) {
  const inventoryEndDate = addHotelDays(stayRange.checkOut, -1);
  const result = await request<BackendPageResult<BffHotelInventoryDayView>>({
    url: appendQuery(`/api/bff/hotels/${encodeURIComponent(hotelId)}/inventory`, {
      startDate: stayRange.checkIn,
      endDate: inventoryEndDate,
      page: 1,
      size: 500,
    }),
    method: 'GET',
  });
  return normalizePageList(result);
}

export async function fetchBffHotelDetail(hotelId: string) {
  return request<BffHotelDetailResponse>({
    url: `/api/bff/hotels/${encodeURIComponent(hotelId)}`,
    method: 'GET',
  });
}

// 获取酒店首页真实数据，接口异常时由页面异常态承接，不回退本地 mock。
export async function fetchHotelHomeFromBff({
  stayRange,
  filterKey,
}: FetchHotelHomeParams): Promise<HotelHomeData> {
  const profiles = await fetchHotelProfiles();
  const hotelTabs = await Promise.all(profiles.map(async (profile) => {
    const hotelId = text(profile.hotelId);
    const [rooms, inventory] = await Promise.all([
      fetchBffHotelRooms(hotelId, stayRange),
      fetchBffHotelInventory(hotelId, stayRange),
    ]);
    const lookup = groupInventory(inventory);
    const products = rooms
      .map((room) => mapRoom(room, stayRange, lookup))
      .filter((product) => !filterKey || product.filterKeys.includes(filterKey));
    return mapProfile(profile, products);
  }));
  const firstProfile = profiles[0];
  const allProducts = hotelTabs.flatMap((hotel) => hotel.products);

  return {
    title: '酒店',
    bookingWindowDays: firstProfile?.bookingWindowDays || DEFAULT_BOOKING_WINDOW_DAYS,
    maxNights: firstProfile?.maxNights || DEFAULT_MAX_NIGHTS,
    maxRooms: firstProfile?.maxRooms || DEFAULT_MAX_ROOMS,
    hotels: hotelTabs,
    filterOptions: mapFilterOptions(allProducts),
  };
}

// 获取房型详情真实数据，按 hotelId/productId 定位，找不到即返回空态错误。
export async function fetchRoomDetailFromBff({
  hotelId,
  productId,
  stayRange,
  occupancy,
}: FetchRoomDetailParams): Promise<HotelRoomDetailData> {
  if (!hotelId || !productId) {
    throw new Error('缺少酒店或房型信息');
  }

  const [detail, inventory] = await Promise.all([
    fetchBffHotelDetail(hotelId),
    fetchBffHotelInventory(hotelId, stayRange),
  ]);
  const profile = detail.profile;
  const room = detail.rooms?.find((item) => item.roomTypeId === productId);
  if (!profile || !room) {
    throw new Error('房型信息不存在');
  }

  const product = mapRoom(room, stayRange, groupInventory(inventory));
  const hotelName = text(profile.heroTitle) || text(profile.hotelName) || hotelId;

  return {
    hotelId,
    hotelName,
    hotelAddress: text(profile.address),
    phoneNumber: text(profile.phoneNumber),
    checkInTimeText: text(profile.checkInTimeText),
    checkOutTimeText: text(profile.checkOutTimeText),
    product,
    stayRange,
    occupancy,
    nights: calculateHotelNights(stayRange),
    featureGroups: [
      { label: '产品包含', value: product.includeText },
      { label: '入住人数', value: product.capacityText },
      { label: '取消规则', value: product.cancelRule },
      { label: '入住时间', value: `${text(profile.checkInTimeText)}，${text(profile.checkOutTimeText)}` },
      { label: '酒店地址', value: text(profile.address) },
    ],
  };
}
