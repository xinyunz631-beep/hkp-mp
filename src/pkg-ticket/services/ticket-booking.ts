import {
  HKP_PARK_ADDRESS,
  HKP_PARK_LOCATION,
  HKP_PARK_OPEN_TIME,
  HKP_TICKET_SERVICE_PHONE,
} from '@/core/constants/park-location';
import {
  fetchMiniProgramPageAds,
  findMiniProgramSlotAds,
  MINI_PROGRAM_AD_PAGE_CODES,
  resolveMiniProgramAdImage,
} from '@/core/services/mini-program-ad';
import type { MiniProgramAdView } from '@/core/types/mini-program-ad';
import { centToYuan, parseNumberLike } from '@/core/utils/money';
import {
  fetchBffTicketCalendarBatch,
  fetchBffTicketProducts,
  type BffTicketCalendarBatchDay,
  type BffTicketInventoryDay,
  type BffTicketImageAsset,
  type BffTicketProduct,
  type BffTicketProductCalendar,
  type BffTicketCalendarSkuInventory,
  type BffTicketSkuRule,
} from './ticket-api';
import type { HkpCouponSummary, HkpDateOption } from '@/core/types/hkp';
import { sanitizeMallRuntimeUrl } from '@/core/utils/mall-runtime';

export interface TicketBookingMapLocation {
  latitude: number;
  longitude: number;
  name: string;
  address: string;
}

export interface TicketCoupon extends HkpCouponSummary {
  minimumAmount: number;
  discountAmount: number;
}

export interface TicketBookingParkInfo {
  name: string;
  subtitle: string;
  openTime: string;
  hotline: string;
  notice: string;
  address: string;
  travelDate: string;
  imageCount: number;
  heroImages: string[];
  sellingPoints: string[];
  bookingTips: string[];
  warmTips: string[];
  rules: string[];
  ruleRichTexts: string[];
  warmTipRichTexts: string[];
  mapLocation: TicketBookingMapLocation;
}

export interface TicketProduct {
  id: string;
  identityKeys: string[];
  productCode: string;
  skuId: string;
  skuName: string;
  category: 'ticket' | 'annualCard' | 'fastPass';
  title: string;
  imageSrc: string;
  description: string;
  priceLabel: string;
  price: number;
  unitPriceCent: number;
  noticeText: string;
  tags: string[];
  validityText: string;
  stockText: string;
  limitText: string;
  defaultQuantity?: number;
  availableStock: number;
  maxQuantity: number;
  saleable: boolean;
  publishStatus?: string;
  travelerRoles?: string[];
  requiredFields?: string[];
  mobileRequired?: boolean;
  certificateRequired?: boolean;
  verificationMethod?: string;
  verificationMethods?: string[];
  fulfillmentType?: string;
  realNameRequired?: boolean;
  entryMethods?: string[];
  cardRule?: Record<string, unknown>;
  usageInstructionHtml?: string;
  ruleTexts: string[];
  ruleRichTexts: string[];
}

export interface TicketPackageProduct {
  id: string;
  title: string;
  soldText: string;
  priceText: string;
  imageSrc: string;
}

export type TicketBookingSectionKey = string;
export type TicketBookingSectionType = 'ticket' | 'annualCard' | 'fastPass' | 'package';

export interface TicketBookingSectionBadge {
  text: string;
  color?: string;
}

export interface TicketBookingSection {
  key: TicketBookingSectionKey;
  type: TicketBookingSectionType;
  title: string;
  badge?: TicketBookingSectionBadge;
  productIds?: string[];
  packageIds?: string[];
}

export interface TicketBookingData {
  parkInfo: TicketBookingParkInfo;
  sections: TicketBookingSection[];
  dates: HkpDateOption[];
  products: TicketProduct[];
  packages: TicketPackageProduct[];
  coupons: TicketCoupon[];
}

export interface FetchTicketBookingDataOptions {
  travelDate?: string;
}

const TICKET_BOOKING_AVAILABLE_DAYS = 30;
const TICKET_WEEKDAY_TITLES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const TICKET_CALENDAR_BATCH_SIZE = 20;
const PRODUCT_CALENDAR_SUMMARY_SKU_ID = '__product_calendar_summary__';
const TICKET_BOOKING_BANNER_SLOT_CODE = 'ticket_booking_banner';
const MINI_PROGRAM_CHANNELS = ['miniProgram', 'wechatMiniProgram', 'WECHAT_MINI_PROGRAM', 'weapp'];
const HIDDEN_UNAVAILABLE_STOCK_TEXTS = new Set(['待上线', '暂无可售日期', '暂无可售门票']);

interface TicketRequestCacheEntry<TData> {
  request: Promise<TData>;
  completedAt?: number;
}

const ticketBookingRequestCache = new Map<string, TicketRequestCacheEntry<TicketBookingData>>();
const ticketCalendarBatchRequestCache = new Map<string, TicketRequestCacheEntry<Record<string, BffTicketInventoryDay[]>>>();

// 补齐日期控件基础可选日期，真实库存可售性由统一订单确认接口校验。
function createTicketDates(): HkpDateOption[] {
  const today = new Date();
  return Array.from({ length: TICKET_BOOKING_AVAILABLE_DAYS + 1 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return {
      date: `${date.getFullYear()}-${month}-${day}`,
      title: index === 0 ? '今天' : index === 1 ? '明天' : TICKET_WEEKDAY_TITLES[date.getDay()],
      subtitle: '可选',
    };
  });
}

const ticketBookingData: TicketBookingData = {
  parkInfo: {
    name: '杭州 Hello Kitty 乐园',
    subtitle: '官方直营 · 主题乐园门票',
    openTime: HKP_PARK_OPEN_TIME,
    hotline: HKP_TICKET_SERVICE_PHONE,
    notice: '详细节目单，欢迎戳一戳～',
    address: HKP_PARK_ADDRESS,
    travelDate: createTicketDates()[0].date,
    imageCount: 1,
    heroImages: [''],
    sellingPoints: ['官方出票', '未使用可退', '身份证入园', '当日可订'],
    bookingTips: [
      '同一订单内票种统一使用同一个游玩日期。',
      '下单后请在确认订单页补全出行人手机号与证件信息。',
      '如需改期，请在未核销前重新选择日期并提交订单。',
    ],
    warmTips: [],
    rules: [
      '门票仅限所选游玩日期当天使用，入园时需出示购票人身份证件。',
      '未使用门票支持随时退，已核销或超过有效期后不可退。',
      '园区营业时间可能因天气、活动或设备维护调整，请以当日公告为准。',
      '优惠券以提交订单时可用状态为准，不可与线下活动重复叠加。',
    ],
    ruleRichTexts: [],
    warmTipRichTexts: [],
    mapLocation: {
      ...HKP_PARK_LOCATION,
    },
  },
  dates: createTicketDates(),
  sections: [],
  coupons: [],
  products: [],
  packages: [],
};

// 生成购票页基础壳数据，票种、套餐和价格必须由真实接口补齐。
function buildTicketBookingData(options: FetchTicketBookingDataOptions = {}): TicketBookingData {
  const travelDate = options.travelDate || ticketBookingData.parkInfo.travelDate;

  return {
    ...ticketBookingData,
    parkInfo: {
      ...ticketBookingData.parkInfo,
      travelDate,
    },
    dates: createTicketDates(),
    sections: [],
    products: [],
    packages: [],
  };
}

// 按后端结构化商品字段粗分票种类型，不再从标题猜履约。
function resolveProductCategory(item: BffTicketProduct): TicketProduct['category'] {
  const fulfillmentType = `${item.fulfillmentType || ''}`.toUpperCase();
  if (fulfillmentType === 'LOCAL_FAST_PASS_VOUCHER') return 'fastPass';
  if (fulfillmentType === 'ANNUAL_CARD_ASSET') return 'annualCard';

  if (item.productType === 'fastPass' || item.categorySection === 'fastPass') {
    return 'fastPass';
  }

  return item.productType === 'annualPass' || item.categorySection === 'annualPass' ? 'annualCard' : 'ticket';
}

// 将后端分为单位的价格转为页面使用的元单位价格。
function resolvePrice(priceCent?: number | string) {
  const amount = parseNumberLike(priceCent);
  if (typeof amount !== 'number') return 0;
  return Math.max(0, centToYuan(amount));
}

function sameSkuInventoryDay(day: BffTicketInventoryDay, sku: BffTicketSkuRule) {
  return day.skuId === PRODUCT_CALENDAR_SUMMARY_SKU_ID
    || day.skuId === sku.id
    || Boolean(sku.variantCode && day.skuId === sku.variantCode);
}

// 根据所选日期的库存日历取当前票种价量。
function resolveInventoryDay(sku: BffTicketSkuRule, inventoryDays: BffTicketInventoryDay[], visitDate: string) {
  return inventoryDays.find((day) => day.date === visitDate && sameSkuInventoryDay(day, sku));
}

function isPublishedTicketProduct(item: BffTicketProduct) {
  return !item.publishStatus || item.publishStatus === 'published';
}

function isMiniProgramTicketProduct(item: BffTicketProduct) {
  if (!item.channels?.length) return true;

  return item.channels.some((channel) => {
    const normalizedChannel = channel.trim();
    return MINI_PROGRAM_CHANNELS.some((miniChannel) => normalizedChannel.toLowerCase() === miniChannel.toLowerCase());
  });
}

function getTicketBookingRequestKey(travelDate: string) {
  return `ticket-booking:${travelDate}`;
}

function getTicketCalendarBatchRequestKey(productCodes: string[], startDate: string, endDate: string) {
  return `${productCodes.join(',')}:${startDate}:${endDate}`;
}

function getCachedTicketRequest<TData>(cache: Map<string, TicketRequestCacheEntry<TData>>, requestKey: string) {
  const cachedRequest = cache.get(requestKey);

  if (!cachedRequest) return undefined;

  // 只复用进行中的同 key 请求；完成态不缓存，确保用户下拉刷新会重新请求真实接口。
  if (!cachedRequest.completedAt) return cachedRequest.request;
  cache.delete(requestKey);
  return undefined;
}

function setCachedTicketRequest<TData>(
  cache: Map<string, TicketRequestCacheEntry<TData>>,
  requestKey: string,
  requestFactory: () => Promise<TData>,
) {
  const cacheEntry = {} as TicketRequestCacheEntry<TData>;
  const request = requestFactory()
    .then((data) => {
      cacheEntry.completedAt = Date.now();
      return data;
    })
    .catch((error) => {
      cache.delete(requestKey);
      throw error;
    });

  cacheEntry.request = request;
  cache.set(requestKey, cacheEntry);
  return request;
}

function chunkProductCodes(productCodes: string[]) {
  const chunks: string[][] = [];

  for (let index = 0; index < productCodes.length; index += TICKET_CALENDAR_BATCH_SIZE) {
    chunks.push(productCodes.slice(index, index + TICKET_CALENDAR_BATCH_SIZE));
  }

  return chunks;
}

function normalizeCalendarSaleStatus(status?: string) {
  const normalizedStatus = status?.replace(/[_-]/g, '').toLowerCase();
  if (normalizedStatus === 'onsale') return 'onSale';
  if (normalizedStatus === 'soldout') return 'soldOut';
  if (normalizedStatus === 'notsaleable') return 'notSaleable';
  return status;
}

function normalizeBatchSkuInventory(
  calendar: BffTicketProductCalendar,
  day: BffTicketCalendarBatchDay,
  sku: BffTicketCalendarSkuInventory,
): BffTicketInventoryDay {
  return {
    productId: calendar.productCode,
    skuId: sku.skuId || sku.variantCode || PRODUCT_CALENDAR_SUMMARY_SKU_ID,
    date: day.date,
    price: sku.priceCent ?? day.minPriceCent,
    availableStock: sku.availableStock,
    totalStock: sku.totalStock,
    soldStock: sku.soldStock,
    lockedStock: sku.lockedStock,
    publishStatus: sku.publishStatus,
    saleStatus: normalizeCalendarSaleStatus(sku.saleStatus || day.saleStatus),
    restrictionReason: sku.restrictionReason || day.restrictionReason || calendar.message,
    timeSlot: sku.timeSlot,
  };
}

// 新版批量日历返回 SKU 级价量；老响应缺 skuInventories 时保留商品摘要兜底。
function normalizeBatchCalendar(calendar: BffTicketProductCalendar): BffTicketInventoryDay[] {
  return (calendar.days || []).flatMap((day) => {
    if (day.skuInventories?.length) {
      return day.skuInventories.map((sku) => normalizeBatchSkuInventory(calendar, day, sku));
    }

    return [{
      productId: calendar.productCode,
      skuId: PRODUCT_CALENDAR_SUMMARY_SKU_ID,
      date: day.date,
      price: day.minPriceCent,
      availableStock: day.availableStock,
      saleStatus: normalizeCalendarSaleStatus(day.saleStatus),
      restrictionReason: day.restrictionReason || calendar.message,
    }];
  });
}

// 同一次页面加载内按后端批量上限合并日历请求，避免门票预定页跨商品 N+1。
function fetchBffTicketCalendarBatchOnce(productCodes: string[], startDate: string, endDate: string) {
  const requestKey = getTicketCalendarBatchRequestKey(productCodes, startDate, endDate);
  const cachedRequest = getCachedTicketRequest(ticketCalendarBatchRequestCache, requestKey);

  if (cachedRequest) return cachedRequest;

  return setCachedTicketRequest(
    ticketCalendarBatchRequestCache,
    requestKey,
    async () => {
      const calendars = await fetchBffTicketCalendarBatch({
        channel: 'MINI_PROGRAM',
        productCodes,
        startDate,
        endDate,
        visitDate: startDate,
        includeSkuInventory: true,
      });

      return calendars.reduce<Record<string, BffTicketInventoryDay[]>>((result, calendar) => {
        result[calendar.productCode] = normalizeBatchCalendar(calendar);
        return result;
      }, {});
    },
  );
}

function uniquePublishedTicketProductCodes(ticketProducts: BffTicketProduct[]) {
  const productCodes = ticketProducts
    .filter(isMiniProgramTicketProduct)
    .filter(isPublishedTicketProduct)
    .map((product) => product.productCode)
    .filter(Boolean);

  return Array.from(new Set(productCodes));
}

function resolvePublishStatusText(status?: string) {
  if (!status) return '';
  if (status === 'published') return '';
  return '';
}

function resolveUnavailableStockText(
  item: BffTicketProduct,
  inventoryDay: BffTicketInventoryDay | undefined,
  availableStock: number,
) {
  if (!isPublishedTicketProduct(item)) return resolvePublishStatusText(item.publishStatus);
  if (!inventoryDay) return '';
  if (inventoryDay.saleStatus === 'soldOut') return '当日已售罄';
  if (inventoryDay.saleStatus !== 'onSale') return inventoryDay.restrictionReason || '暂不可订';
  if (availableStock <= 0) return '当日已售罄';
  return '暂不可订';
}

function shouldHideTicketProductForMiniProgram(
  item: BffTicketProduct,
  inventoryDay: BffTicketInventoryDay | undefined,
  unavailableStockText: string,
) {
  if (!isPublishedTicketProduct(item)) return true;
  if (!inventoryDay) return true;
  return HIDDEN_UNAVAILABLE_STOCK_TEXTS.has(unavailableStockText);
}

function compactTags(tags: Array<string | undefined>) {
  return Array.from(new Set(tags.filter((tag): tag is string => Boolean(tag))));
}

// 汇总后端商品、SKU 和前端组合编号，线下物料码只要命中唯一编号即可承接快速购买。
function buildTicketProductIdentityKeys(item: BffTicketProduct, sku: BffTicketSkuRule, productId: string) {
  return compactTags([
    productId,
    item.id,
    item.productId,
    item.productCode,
    sku.id,
    sku.skuId,
    sku.variantCode,
    `${item.productCode}__${sku.id}`,
    sku.variantCode ? `${item.productCode}__${sku.variantCode}` : undefined,
  ]);
}

function compactRichTextSegments(rules: Array<string | undefined>) {
  return rules.filter((rule): rule is string => typeof rule === 'string' && Boolean(rule.trim()));
}

function resolveTicketProductImage(images?: BffTicketImageAsset[]) {
  const sortedImages = (images || [])
    .filter((image) => Boolean(image?.url))
    .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0));

  return sanitizeMallRuntimeUrl(sortedImages[0]?.url, { allowMockImage: true });
}

function buildProductRuleRichTexts(item: BffTicketProduct, sku: BffTicketSkuRule) {
  return compactRichTextSegments([
    sku.usageInstructionHtml,
    item.usageInstructionHtml,
  ]);
}

// 将票务商品和 SKU 归一为页面票种模型。
function normalizeTicketProduct(
  item: BffTicketProduct,
  sku: BffTicketSkuRule,
  visitDate: string,
  inventoryDay?: BffTicketInventoryDay,
): TicketProduct | undefined {
  if (!item.productCode || !item.title || !sku.id) return undefined;
  const productId = `${item.productCode}__${sku.id}`;
  const availableStock = inventoryDay?.availableStock ?? 0;
  const unitPriceCent = inventoryDay?.skuId === PRODUCT_CALENDAR_SUMMARY_SKU_ID
    ? inventoryDay?.price ?? sku.basePrice ?? item.minPrice ?? 0
    : inventoryDay?.price ?? sku.basePrice ?? item.minPrice ?? 0;
  const skuName = sku.name || '';
  const saleable = isPublishedTicketProduct(item) && inventoryDay?.saleStatus === 'onSale' && availableStock > 0;
  const skuMaxQuantity = sku.maxQuantity && sku.maxQuantity > 0 ? sku.maxQuantity : availableStock;
  const maxQuantity = saleable ? Math.max(0, Math.min(availableStock, skuMaxQuantity)) : 0;
  const unavailableStockText = saleable ? '' : resolveUnavailableStockText(item, inventoryDay, availableStock);
  if (!saleable && shouldHideTicketProductForMiniProgram(item, inventoryDay, unavailableStockText)) {
    return undefined;
  }
  const publishStatusTag = resolvePublishStatusText(item.publishStatus);
  const stockText = saleable ? '' : unavailableStockText;
  const category = resolveProductCategory(item);
  const fulfillmentType = sku.fulfillmentType || item.fulfillmentType;
  const requiredFields = sku.requiredFields || item.requiredFields;
  const realNameRequired = typeof sku.realNameRequired === 'boolean'
    ? sku.realNameRequired
    : typeof item.realNameRequired === 'boolean'
      ? item.realNameRequired
      : category !== 'fastPass';

  return {
    id: productId,
    identityKeys: buildTicketProductIdentityKeys(item, sku, productId),
    productCode: item.productCode,
    skuId: sku.id,
    skuName,
    category,
    title: skuName && skuName !== '标准票' ? `${item.title} ${skuName}` : item.title,
    imageSrc: resolveTicketProductImage(item.coverImages),
    description: item.subtitle || sku.audience || item.availableDateSummary || '',
    priceLabel: '网购价',
    price: resolvePrice(unitPriceCent),
    unitPriceCent,
    noticeText: '预定须知',
    tags: compactTags([publishStatusTag, item.badgeText, ...(item.tags || [])]),
    validityText: '所选游玩日当天有效',
    stockText,
    limitText: saleable
      ? sku.qualificationRule || item.refundRule || '请以下单页实名和库存规则为准'
      : unavailableStockText,
    availableStock,
    maxQuantity,
    saleable,
    publishStatus: item.publishStatus,
    travelerRoles: sku.travelerRoles,
    requiredFields,
    mobileRequired: sku.mobileRequired,
    certificateRequired: sku.certificateRequired,
    verificationMethod: sku.verificationMethod,
    verificationMethods: sku.verificationMethods || item.verificationMethods,
    fulfillmentType,
    realNameRequired,
    entryMethods: sku.entryMethods || item.entryMethods,
    cardRule: item.cardRule,
    usageInstructionHtml: sku.usageInstructionHtml || item.usageInstructionHtml,
    ruleTexts: [],
    ruleRichTexts: buildProductRuleRichTexts(item, sku),
  };
}

function resolveDateAvailabilityText(products: TicketProduct[]) {
  const saleableCount = products.filter((product) => product.saleable).length;
  if (saleableCount > 0) return `${saleableCount} 个票种可订`;
  if (products.length > 0) return '当前日期暂无可订票种';
  return '暂无可售门票';
}

// 解析广告配置里的门票预定页富文本，保持后端原文不加工。
function resolveTicketBookingAdRichText(ad?: MiniProgramAdView) {
  return [
    ad?.richTextHtml,
    ad?.richText,
    ad?.content,
  ].find((value) => typeof value === 'string' && Boolean(value.trim())) || '';
}

// 读取门票预定页广告资源位配置；图片可多条轮播，详情须知取第一条富文本。
async function fetchTicketBookingBannerAds() {
  const pageAds = await fetchMiniProgramPageAds(MINI_PROGRAM_AD_PAGE_CODES.ticket);
  return findMiniProgramSlotAds(pageAds, [TICKET_BOOKING_BANNER_SLOT_CODE]);
}

// 将广告资源位配置转换成门票预定页可消费的轮播图片和首条富文本。
function resolveTicketBookingBannerContent(ads: MiniProgramAdView[]) {
  const heroImages = ads
    .map((ad) => resolveMiniProgramAdImage(ad, 'background') || '')
    .filter(Boolean);
  const richText = resolveTicketBookingAdRichText(ads[0]);

  return {
    heroImages,
    richTexts: richText ? [richText] : [],
  };
}

// 合并门票预定页固定园区信息和广告富文本，固定信息统一来自常量文件。
function resolveParkInfoFromProducts(
  fallback: TicketBookingParkInfo,
  pageRichTexts: string[],
) {
  return {
    ...fallback,
    openTime: HKP_PARK_OPEN_TIME,
    hotline: HKP_TICKET_SERVICE_PHONE,
    address: HKP_PARK_ADDRESS,
    mapLocation: HKP_PARK_LOCATION,
    rules: [],
    ruleRichTexts: pageRichTexts,
    warmTipRichTexts: pageRichTexts,
  };
}

// 根据真实票种生成页面分区。
function buildSectionsFromProducts(products: TicketProduct[]) {
  const ticketProductIds = products.filter((product) => product.category === 'ticket').map((product) => product.id);
  const annualCardProductIds = products.filter((product) => product.category === 'annualCard').map((product) => product.id);
  const fastPassProductIds = products.filter((product) => product.category === 'fastPass').map((product) => product.id);
  const sections: TicketBookingSection[] = [];

  if (ticketProductIds.length) {
    sections.push({
      key: 'ticket',
      type: 'ticket',
      title: '门票',
      productIds: ticketProductIds,
    });
  }

  if (annualCardProductIds.length) {
    sections.push({
      key: 'annual-card',
      type: 'annualCard',
      title: '年卡',
      badge: { text: 'hot', color: 'red' },
      productIds: annualCardProductIds,
    });
  }

  if (fastPassProductIds.length) {
    sections.push({
      key: 'fast-pass',
      type: 'fastPass',
      title: '快速通',
      productIds: fastPassProductIds,
    });
  }

  return sections;
}

// 将真实接口数据归一成页面数据，接口缺失时不回退旧本地票种。
function buildTicketBookingDataFromApi(
  fallback: TicketBookingData,
  ticketProducts: BffTicketProduct[],
  inventoryMap: Record<string, BffTicketInventoryDay[]>,
  bannerAds: MiniProgramAdView[],
) {
  const miniProgramTicketProducts = ticketProducts
    .filter(isMiniProgramTicketProduct)
    .filter(isPublishedTicketProduct);
  const products = miniProgramTicketProducts
    .flatMap((product) => {
      const skuRules = product.skuRules || [];
      const inventoryDays = inventoryMap[product.productCode] || [];

      return skuRules.map((sku) => normalizeTicketProduct(
        product,
        sku,
        fallback.parkInfo.travelDate,
        resolveInventoryDay(sku, inventoryDays, fallback.parkInfo.travelDate),
      ));
    })
    .filter((item): item is TicketProduct => Boolean(item));

  const bannerContent = resolveTicketBookingBannerContent(bannerAds);
  const parkInfo = resolveParkInfoFromProducts(fallback.parkInfo, bannerContent.richTexts);
  const dateAvailabilityText = resolveDateAvailabilityText(products);

  return {
    ...fallback,
    parkInfo: {
      ...parkInfo,
      notice: dateAvailabilityText,
      heroImages: bannerContent.heroImages,
      imageCount: bannerContent.heroImages.filter(Boolean).length,
    },
    sections: buildSectionsFromProducts(products),
    products,
    packages: [],
    coupons: [],
  };
}

async function fetchTicketBookingDataUncached(fallback: TicketBookingData) {
  const startDate = fallback.parkInfo.travelDate;
  const endDate = fallback.parkInfo.travelDate;
  const [ticketProducts, bannerAds] = await Promise.all([
    fetchBffTicketProducts({ visitDate: startDate }),
    fetchTicketBookingBannerAds(),
  ]);
  const calendarBatchMaps = await Promise.all(
    chunkProductCodes(uniquePublishedTicketProductCodes(ticketProducts))
      .map((productCodes) => fetchBffTicketCalendarBatchOnce(productCodes, startDate, endDate)),
  );
  const inventoryMap = Object.assign({}, ...calendarBatchMaps) as Record<string, BffTicketInventoryDay[]>;

  return buildTicketBookingDataFromApi(fallback, ticketProducts, inventoryMap, bannerAds);
}

// 获取门票预定页面真实数据，接口失败时由页面异常态承接。
export async function fetchTicketBookingData(options: FetchTicketBookingDataOptions = {}) {
  const fallback = buildTicketBookingData(options);
  const requestKey = getTicketBookingRequestKey(fallback.parkInfo.travelDate);
  const cachedRequest = getCachedTicketRequest(ticketBookingRequestCache, requestKey);

  if (cachedRequest) return cachedRequest;

  return setCachedTicketRequest(
    ticketBookingRequestCache,
    requestKey,
    () => fetchTicketBookingDataUncached(fallback),
  );
}
