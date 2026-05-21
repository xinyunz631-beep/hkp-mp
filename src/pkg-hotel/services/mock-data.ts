const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BOOKING_WINDOW_DAYS = 90;
const DEFAULT_MAX_NIGHTS = 7;
const DEFAULT_MAX_ROOMS = 3;

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
  totalAmount: number;
  discountAmount: number;
  guestFields: HotelGuestFieldData[];
  contactNamePlaceholder: string;
  contactNameValue: string;
  mobilePlaceholder: string;
  mobileValue: string;
  couponText: string;
  discountText: string;
  invoiceText: string;
  cancelRule: string;
  checkInTimeText: string;
  checkOutTimeText: string;
}

interface HotelProductSeed extends Omit<HotelProductCardData, 'title' | 'subtitle' | 'price' | 'stock' | 'tagsText' | 'ratePlans'> {
  titleTemplate: string;
  subtitleTemplate: string;
  ratePlans: Array<Omit<HotelRatePlanData, 'price' | 'stock'> & {
    basePrice: number;
    baseStock: number;
  }>;
}

interface HotelHomeSeed extends Omit<HotelHomeTabData, 'products'> {
  products: HotelProductSeed[];
}

const hotelGalleryImages: HotelGalleryImage[] = [
  {
    id: 'castle-room-family',
    src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'castle-room-bed',
    src: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'castle-room-window',
    src: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
  },
];

const productGalleryImages: HotelGalleryImage[] = [
  {
    id: 'room-main',
    src: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'room-second',
    src: 'https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 'room-third',
    src: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=900&q=80',
  },
];

const hotelHomeSeed: HotelHomeSeed = {
  id: 'castle-hotel',
  label: '安吉银润锦江城堡酒店',
  heroTitle: '安吉银润锦江城堡酒店',
  heroSubtitle: 'Hello Kitty Park 亲子度假酒店',
  galleryImages: hotelGalleryImages,
  address: '浙江省安吉县天使大道8号',
  areaText: '杭州 Hello Kitty 乐园旁',
  introText: '酒店位于乐园度假区核心位置，适合亲子家庭在游玩前后入住。部分房型含乐园门票或亲子早餐，具体以预订页展示为准。',
  checkInTimeText: '14:00后入住',
  checkOutTimeText: '12:00前退房',
  phoneNumber: '4009778899',
  location: {
    latitude: 30.6386,
    longitude: 119.684,
    name: '安吉银润锦江城堡酒店',
    address: '浙江省安吉县天使大道8号',
  },
  products: [
    {
      id: 'luxury-queen-ticket',
      kind: 'package',
      titleTemplate: '豪华大床房{nights}+Hello Kitty乐园门票2张',
      subtitleTemplate: '3-5,7层 35㎡ 大床 双早',
      imageSrc: productGalleryImages[0].src,
      galleryImages: productGalleryImages,
      floorText: '3-5,7层',
      areaText: '35㎡',
      bedText: '大床',
      breakfastText: '双早',
      capacityText: '建议2成人入住',
      cancelRule: '入住日前一天18:00前可取消',
      includeText: '含Hello Kitty乐园门票2张',
      filterKeys: ['double-breakfast', 'queen'],
      ratePlans: [
        {
          id: 'queen-ticket-breakfast',
          title: '双早+门票套餐',
          breakfastText: '双早',
          bedText: '大床',
          cancelRule: '入住日前一天18:00前可取消',
          policyText: '套餐内门票需在入住期间使用，门票权益以园区现场规则为准。',
          filterKeys: ['double-breakfast', 'queen'],
          basePrice: 699,
          baseStock: 6,
        },
      ],
    },
    {
      id: 'luxury-twin-ticket',
      kind: 'package',
      titleTemplate: '豪华双床房{nights}+Hello Kitty乐园门票2张',
      subtitleTemplate: '3-5,7层 35㎡ 双床 双早',
      imageSrc: productGalleryImages[1].src,
      galleryImages: productGalleryImages,
      floorText: '3-5,7层',
      areaText: '35㎡',
      bedText: '双床',
      breakfastText: '双早',
      capacityText: '建议2成人入住',
      cancelRule: '入住日前一天18:00前可取消',
      includeText: '含Hello Kitty乐园门票2张',
      filterKeys: ['double-breakfast', 'twin'],
      ratePlans: [
        {
          id: 'twin-ticket-breakfast',
          title: '双早+门票套餐',
          breakfastText: '双早',
          bedText: '双床',
          cancelRule: '入住日前一天18:00前可取消',
          policyText: '套餐内门票需在入住期间使用，门票权益以园区现场规则为准。',
          filterKeys: ['double-breakfast', 'twin'],
          basePrice: 699,
          baseStock: 5,
        },
      ],
    },
    {
      id: 'view-parent-child',
      kind: 'package',
      titleTemplate: '景观亲子房{nights}+2大小门票+竹林鸡煲简餐1份',
      subtitleTemplate: '3-5,7层 大床,儿童边床 2大小早',
      imageSrc: productGalleryImages[2].src,
      galleryImages: productGalleryImages,
      floorText: '3-5,7层',
      areaText: '42㎡',
      bedText: '大床,儿童边床',
      breakfastText: '2大小早',
      capacityText: '建议2成人1儿童入住',
      cancelRule: '入住日前一天18:00前可取消',
      includeText: '含2大1小门票与竹林鸡煲简餐1份',
      filterKeys: ['family-breakfast', 'family-bed', 'queen'],
      ratePlans: [
        {
          id: 'family-ticket-meal',
          title: '2大小早+门票+简餐',
          breakfastText: '2大小早',
          bedText: '大床,儿童边床',
          cancelRule: '入住日前一天18:00前可取消',
          policyText: '儿童权益适用于1名符合园区儿童政策的儿童，现场以园区核验为准。',
          filterKeys: ['family-breakfast', 'family-bed', 'queen'],
          basePrice: 928,
          baseStock: 4,
        },
      ],
    },
    {
      id: 'superior-parent-child',
      kind: 'package',
      titleTemplate: '高级亲子房{nights}+2大小门票+竹林鸡煲简餐1份',
      subtitleTemplate: '3-5,7层 大床,儿童边床 2大小早',
      imageSrc: productGalleryImages[0].src,
      galleryImages: productGalleryImages,
      floorText: '3-5,7层',
      areaText: '40㎡',
      bedText: '大床,儿童边床',
      breakfastText: '2大小早',
      capacityText: '建议2成人1儿童入住',
      cancelRule: '入住日前一天18:00前可取消',
      includeText: '含2大1小门票与竹林鸡煲简餐1份',
      filterKeys: ['family-breakfast', 'family-bed', 'queen'],
      ratePlans: [
        {
          id: 'superior-family-ticket-meal',
          title: '2大小早+门票+简餐',
          breakfastText: '2大小早',
          bedText: '大床,儿童边床',
          cancelRule: '入住日前一天18:00前可取消',
          policyText: '儿童权益适用于1名符合园区儿童政策的儿童，现场以园区核验为准。',
          filterKeys: ['family-breakfast', 'family-bed', 'queen'],
          basePrice: 928,
          baseStock: 3,
        },
      ],
    },
    {
      id: 'twin-room-only',
      kind: 'room',
      titleTemplate: '豪华双床房{nights}',
      subtitleTemplate: '3-5,7层 35㎡ 双床 无早',
      imageSrc: productGalleryImages[1].src,
      galleryImages: productGalleryImages,
      floorText: '3-5,7层',
      areaText: '35㎡',
      bedText: '双床',
      breakfastText: '无早',
      capacityText: '建议2成人入住',
      cancelRule: '入住日前一天18:00前可取消',
      includeText: '仅含酒店住宿',
      filterKeys: ['no-breakfast', 'twin'],
      ratePlans: [
        {
          id: 'twin-no-breakfast',
          title: '无早灵活取消',
          breakfastText: '无早',
          bedText: '双床',
          cancelRule: '入住日前一天18:00前可取消',
          policyText: '房费仅含住宿，不含早餐与乐园门票。',
          filterKeys: ['no-breakfast', 'twin'],
          basePrice: 599,
          baseStock: 8,
        },
      ],
    },
  ],
};

export const hotelFilterOptions: HotelFilterOption[] = [
  { key: 'double-breakfast', label: '双早' },
  { key: 'no-breakfast', label: '无早' },
  { key: 'family-breakfast', label: '2大小早' },
  { key: 'family-bed', label: '大床,儿童边床' },
  { key: 'twin', label: '双床' },
];

export function formatHotelDateKey(date: Date) {
  const pad = (value: number) => `${value}`.padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addHotelDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setDate(date.getDate() + days);
  return formatHotelDateKey(date);
}

export function createDefaultHotelStayRange(): HotelStayRange {
  const checkIn = formatHotelDateKey(new Date());
  return {
    checkIn,
    checkOut: addHotelDays(checkIn, 1),
  };
}

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

export function normalizeHotelOccupancy(occupancy?: HotelOccupancy): HotelOccupancy {
  const fallback = createDefaultHotelOccupancy();
  const roomCount = Math.min(Math.max(occupancy?.roomCount || fallback.roomCount, 1), DEFAULT_MAX_ROOMS);
  const rooms = Array.from({ length: roomCount }, (_, index) => {
    const currentRoom = occupancy?.rooms[index] ?? fallback.rooms[0];
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

export function summarizeHotelOccupancy(occupancy?: HotelOccupancy) {
  const normalizedOccupancy = normalizeHotelOccupancy(occupancy);
  const firstRoom = normalizedOccupancy.rooms[0] ?? createDefaultHotelOccupancy().rooms[0];
  const childText = firstRoom.childAges.length > 0 ? `${firstRoom.childAges.length}儿童` : '0儿童';
  return `${normalizedOccupancy.roomCount}间 ${firstRoom.adults}成人${childText}`;
}

export function calculateHotelNights(range: HotelStayRange) {
  const checkInDate = new Date(`${range.checkIn}T00:00:00`);
  const checkOutDate = new Date(`${range.checkOut}T00:00:00`);
  if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) return 1;
  return Math.max(1, Math.min(DEFAULT_MAX_NIGHTS, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / ONE_DAY_MS)));
}

export function serializeHotelOccupancy(occupancy: HotelOccupancy) {
  return encodeURIComponent(JSON.stringify(normalizeHotelOccupancy(occupancy)));
}

export function parseHotelOccupancy(value?: string): HotelOccupancy {
  if (!value) return createDefaultHotelOccupancy();

  try {
    const decodedValue = decodeURIComponent(value);
    return normalizeHotelOccupancy(JSON.parse(decodedValue) as HotelOccupancy);
  } catch {
    return createDefaultHotelOccupancy();
  }
}

export function formatHotelStayDateText(range: HotelStayRange) {
  const formatMonthDay = (dateKey: string) => {
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateKey;
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return `${formatMonthDay(range.checkIn)}-${formatMonthDay(range.checkOut)}`;
}

function resolveDatePriceDelta(range: HotelStayRange) {
  const date = new Date(`${range.checkIn}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  return (date.getDate() % 4) * 20;
}

function resolveStockDelta(range: HotelStayRange) {
  const date = new Date(`${range.checkIn}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 0;
  return date.getDate() % 3;
}

function resolveHotelProduct(seed: HotelProductSeed, range: HotelStayRange, occupancy: HotelOccupancy): HotelProductCardData {
  const nights = calculateHotelNights(range);
  const priceDelta = resolveDatePriceDelta(range) + (occupancy.roomCount - 1) * 16;
  const stockDelta = resolveStockDelta(range);
  const ratePlans = seed.ratePlans.map((ratePlan) => ({
    ...ratePlan,
    price: ratePlan.basePrice + priceDelta,
    stock: Math.max(0, ratePlan.baseStock - stockDelta),
  }));
  const availableRatePlans = ratePlans.filter((ratePlan) => ratePlan.stock > 0);
  const displayRatePlan = availableRatePlans[0] ?? ratePlans[0];
  const title = seed.titleTemplate.replace('{nights}', `${nights}晚`);
  const subtitle = seed.subtitleTemplate.replace('{nights}', `${nights}晚`);

  return {
    id: seed.id,
    kind: seed.kind,
    title,
    subtitle,
    imageSrc: seed.imageSrc,
    galleryImages: seed.galleryImages,
    floorText: seed.floorText,
    areaText: seed.areaText,
    bedText: seed.bedText,
    breakfastText: displayRatePlan?.breakfastText ?? seed.breakfastText,
    capacityText: seed.capacityText,
    cancelRule: displayRatePlan?.cancelRule ?? seed.cancelRule,
    includeText: seed.includeText,
    tagsText: `${seed.floorText} ${seed.areaText} ${seed.bedText} ${displayRatePlan?.breakfastText ?? seed.breakfastText}`,
    filterKeys: seed.filterKeys,
    price: displayRatePlan?.price ?? 0,
    stock: displayRatePlan?.stock ?? 0,
    ratePlans,
  };
}

export function resolveHotelHomeData({
  stayRange = createDefaultHotelStayRange(),
  occupancy = createDefaultHotelOccupancy(),
  filterKey,
}: {
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
  filterKey?: string;
} = {}): HotelHomeData {
  const normalizedOccupancy = normalizeHotelOccupancy(occupancy);
  const products = hotelHomeSeed.products
    .map((product) => resolveHotelProduct(product, stayRange, normalizedOccupancy))
    .filter((product) => !filterKey || product.filterKeys.includes(filterKey));

  return {
    title: '畅‘住’HelloKittyPark',
    bookingWindowDays: DEFAULT_BOOKING_WINDOW_DAYS,
    maxNights: DEFAULT_MAX_NIGHTS,
    maxRooms: DEFAULT_MAX_ROOMS,
    filterOptions: hotelFilterOptions,
    hotels: [
      {
        ...hotelHomeSeed,
        products,
      },
    ],
  };
}

export function findHotelProduct({
  hotelId,
  productId,
  stayRange = createDefaultHotelStayRange(),
  occupancy = createDefaultHotelOccupancy(),
}: {
  hotelId?: string;
  productId?: string;
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
}) {
  const homeData = resolveHotelHomeData({ stayRange, occupancy });
  const hotel = homeData.hotels.find((item) => item.id === hotelId) ?? homeData.hotels[0];
  const product = hotel?.products.find((item) => item.id === productId) ?? hotel?.products[0];

  if (!hotel || !product) return undefined;

  return {
    hotel,
    product,
  };
}

export function resolveHotelRoomDetailData({
  hotelId,
  productId,
  stayRange = createDefaultHotelStayRange(),
  occupancy = createDefaultHotelOccupancy(),
}: {
  hotelId?: string;
  productId?: string;
  stayRange?: HotelStayRange;
  occupancy?: HotelOccupancy;
} = {}): HotelRoomDetailData {
  const matched = findHotelProduct({ hotelId, productId, stayRange, occupancy }) ?? findHotelProduct({});
  const hotel = matched?.hotel ?? resolveHotelHomeData().hotels[0];
  const product = matched?.product ?? hotel.products[0];

  return {
    hotelId: hotel.id,
    hotelName: hotel.heroTitle,
    hotelAddress: hotel.address,
    phoneNumber: hotel.phoneNumber,
    product,
    stayRange,
    occupancy: normalizeHotelOccupancy(occupancy),
    nights: calculateHotelNights(stayRange),
    featureGroups: [
      { label: '产品包含', value: product.includeText },
      { label: '入住人数', value: product.capacityText },
      { label: '取消规则', value: product.cancelRule },
      { label: '入住时间', value: `${hotel.checkInTimeText}，${hotel.checkOutTimeText}` },
      { label: '酒店地址', value: hotel.address },
    ],
  };
}
