import { request } from '@/core/request';
import type { BffAnnualCard } from '@/core/services/bff-order-api';

export type MemberAnnualCardStatus = 'all' | 'pendingActivation' | 'active' | 'expired' | 'closed';

export interface MemberAnnualCardItem {
  id: string;
  cardNo: string;
  title: string;
  skuName?: string;
  status: MemberAnnualCardStatus;
  statusText: string;
  holderName: string;
  holderMobileText: string;
  holderIdCardText: string;
  validityText: string;
  orderNo?: string;
  entryMethods: string[];
  entryMethodLabels: string[];
  entryMethodText: string;
  activatedAtText: string;
  physicalCardNo: string;
  createdAtText: string;
  updatedAtText: string;
  usageInstructionHtml?: string;
  usageInstructionSummary?: string;
}

export interface MemberAnnualCardsData {
  tabs: Array<{ key: MemberAnnualCardStatus; text: string; count?: number }>;
  list: MemberAnnualCardItem[];
  total: number;
  page: number;
  size: number;
  hasMore: boolean;
}

export interface FetchMemberAnnualCardsOptions {
  status?: MemberAnnualCardStatus;
  page?: number;
  size?: number;
}

interface BackendPageResult<TItem> {
  list?: TItem[];
  records?: TItem[];
  items?: TItem[];
  total?: number;
  totalCount?: number;
  page?: number;
  current?: number;
  pageNo?: number;
  size?: number;
  pageSize?: number;
  hasMore?: boolean;
  statusCounts?: Record<string, number | string>;
}

const STATUS_TO_BACKEND: Record<Exclude<MemberAnnualCardStatus, 'all'>, string | string[]> = {
  pendingActivation: 'PENDING_ACTIVATION',
  active: 'ACTIVE',
  expired: 'EXPIRED',
  closed: ['VOID', 'REFUNDED'],
};
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const ENTRY_METHOD_TEXT_MAP: Record<string, string> = {
  ID_CARD: '身份证入园',
  PHYSICAL_CARD: '实体卡入园',
  QR_CODE: '二维码入园',
  FACE: '人脸入园',
  FACE_RECOGNITION: '人脸入园',
};

// 拼接年卡列表查询参数，避免把空筛选传给后端。
function appendQuery(url: string, params: Record<string, string | number | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => typeof value !== 'undefined' && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `${url}?${query}` : url;
}

// 标准化后端字符串字段，页面只消费后端真实返回值。
function normalizeString(value?: string) {
  return typeof value === 'string' ? value.trim() : '';
}

// 归一化后端数组字段，兼容少量历史 JSON 字符串形态但不生成假入园方式。
function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeString(String(item))).filter(Boolean);
  }

  if (typeof value !== 'string' || !value.trim()) return [];

  try {
    const parsedValue = JSON.parse(value) as unknown;
    if (Array.isArray(parsedValue)) {
      return parsedValue.map((item) => normalizeString(String(item))).filter(Boolean);
    }
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

// 提取富文本摘要，用于卡片列表的纯文本展示。
function stripHtml(value?: string) {
  return normalizeString(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// 兼容后端枚举和中文状态文案，归一到小程序页面状态。
function normalizeCardStatus(status?: string, statusText?: string): MemberAnnualCardStatus {
  const normalizedStatus = `${status || statusText || ''}`.replace(/[-_\s]/g, '').toUpperCase();
  if (normalizedStatus.includes('PENDINGACTIVATION') || normalizedStatus.includes('待激活')) return 'pendingActivation';
  if (normalizedStatus.includes('ACTIVE') || normalizedStatus.includes('已激活')) return 'active';
  if (normalizedStatus.includes('EXPIRED') || normalizedStatus.includes('过期')) return 'expired';
  if (normalizedStatus.includes('VOID') || normalizedStatus.includes('REFUND') || normalizedStatus.includes('作废') || normalizedStatus.includes('退款')) return 'closed';
  return 'pendingActivation';
}

// 生成状态展示文案，优先使用后端显式返回。
function resolveStatusText(status: MemberAnnualCardStatus, statusText?: string) {
  if (statusText) return statusText;
  if (status === 'pendingActivation') return '待激活';
  if (status === 'active') return '已激活';
  if (status === 'expired') return '已过期';
  if (status === 'closed') return '已失效';
  return '';
}

// 生成年卡有效期文案，待激活无有效期时保持空展示。
function resolveValidityText(card: BffAnnualCard) {
  const validFrom = normalizeString(card.validFrom);
  const validTo = normalizeString(card.validTo);
  if (validFrom && validTo) return `${validFrom} 至 ${validTo}`;
  if (validTo) return `有效至 ${validTo}`;
  return '';
}

// 生成年卡入园方式文案，完全来自后端 entryMethods 枚举。
function resolveEntryMethodLabels(entryMethods: string[]) {
  return Array.from(new Set(entryMethods
    .map((method) => ENTRY_METHOD_TEXT_MAP[method.toUpperCase()] || method)
    .filter(Boolean)
  ));
}

function resolveEntryMethodText(entryMethodLabels: string[]) {
  return entryMethodLabels.join('、');
}

// 将 BFF 年卡资产结构转换成小程序卡包页面模型。
function normalizeAnnualCard(card: BffAnnualCard): MemberAnnualCardItem | undefined {
  const cardId = normalizeString(card.cardId) || normalizeString(card.cardNo);
  if (!cardId) return undefined;

  const status = normalizeCardStatus(card.status, card.statusText);
  const usageInstructionHtml = normalizeString(card.usageInstructionHtml);
  const entryMethods = normalizeStringList(card.entryMethods ?? card.rawFields?.entryMethods);
  const entryMethodLabels = resolveEntryMethodLabels(entryMethods);

  return {
    id: cardId,
    cardNo: normalizeString(card.cardNo),
    title: normalizeString(card.productName) || '年卡',
    skuName: normalizeString(card.skuName),
    status,
    statusText: resolveStatusText(status, normalizeString(card.statusText)),
    holderName: normalizeString(card.holderName),
    holderMobileText: normalizeString(card.holderMobileMasked || card.holderMobile),
    holderIdCardText: normalizeString(card.holderIdCardMasked || card.holderIdCard),
    validityText: resolveValidityText(card),
    orderNo: normalizeString(card.orderNo),
    entryMethods,
    entryMethodLabels,
    entryMethodText: resolveEntryMethodText(entryMethodLabels),
    activatedAtText: normalizeString(card.activatedAt),
    physicalCardNo: normalizeString(card.physicalCardNo),
    createdAtText: normalizeString(card.createdAt),
    updatedAtText: normalizeString(card.updatedAt),
    usageInstructionHtml,
    usageInstructionSummary: normalizeString(card.usageInstructionSummary) || stripHtml(usageInstructionHtml),
  };
}

// 兼容后端分页字段命名，但不生成任何假业务数据。
function normalizePageResult(result: BackendPageResult<BffAnnualCard> | BffAnnualCard[], fallbackPage: number, fallbackSize: number) {
  if (Array.isArray(result)) {
    return {
      list: result,
      total: result.length,
      page: fallbackPage,
      size: fallbackSize,
      hasMore: false,
      statusCounts: {},
    };
  }

  const list = result.list || result.records || result.items || [];
  const total = result.total ?? result.totalCount ?? list.length;
  const page = result.page ?? result.current ?? result.pageNo ?? fallbackPage;
  const size = result.size ?? result.pageSize ?? fallbackSize;
  return {
    list,
    total,
    page,
    size,
    hasMore: typeof result.hasMore === 'boolean' ? result.hasMore : page * size < total,
    statusCounts: result.statusCounts || {},
  };
}

function parseStatusCount(value: number | string | undefined) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

// 优先读取后端汇总字段，避免汇总和明细同时存在时重复加总。
function readFirstStatusCount(statusCounts: Record<string, number | string>, keys: string[]) {
  for (const key of keys) {
    const numericValue = parseStatusCount(statusCounts[key]);
    if (typeof numericValue === 'number') return numericValue;
  }

  return undefined;
}

// 从后端状态计数明细中汇总指定状态数量。
function readSummedStatusCount(statusCounts: Record<string, number | string>, keys: string[]) {
  let sum = 0;
  let hasValue = false;
  for (const key of keys) {
    const numericValue = parseStatusCount(statusCounts[key]);
    if (typeof numericValue === 'number') {
      sum += numericValue;
      hasValue = true;
    }
  }

  return hasValue ? sum : undefined;
}

// 从状态计数汇总全部数量，避免筛选页 total 污染全部 tab。
function resolveAllStatusCount(total: number, statusCounts: Record<string, number | string>) {
  const allCount = readFirstStatusCount(statusCounts, ['ALL', 'all', 'TOTAL', 'total']);
  if (typeof allCount === 'number') return allCount;

  const knownCounts = [
    readFirstStatusCount(statusCounts, ['PENDING_ACTIVATION', 'pendingActivation']),
    readFirstStatusCount(statusCounts, ['ACTIVE', 'active']),
    readFirstStatusCount(statusCounts, ['EXPIRED', 'expired']),
    resolveClosedStatusCount(statusCounts),
  ].filter((count): count is number => typeof count === 'number');

  return knownCounts.length ? knownCounts.reduce((sum, count) => sum + count, 0) : total;
}

function resolveClosedStatusCount(statusCounts: Record<string, number | string>) {
  const closedCount = readFirstStatusCount(statusCounts, ['CLOSED', 'closed']);
  if (typeof closedCount === 'number') return closedCount;

  return readSummedStatusCount(statusCounts, ['VOID', 'void', 'REFUNDED', 'refunded']);
}

// 根据后端统计生成卡包筛选标签。
function buildTabs(total: number, statusCounts: Record<string, number | string>) {
  return [
    { key: 'all' as const, text: '全部', count: resolveAllStatusCount(total, statusCounts) },
    {
      key: 'pendingActivation' as const,
      text: '待激活',
      count: readFirstStatusCount(statusCounts, ['PENDING_ACTIVATION', 'pendingActivation']),
    },
    { key: 'active' as const, text: '已激活', count: readFirstStatusCount(statusCounts, ['ACTIVE', 'active']) },
    { key: 'expired' as const, text: '已过期', count: readFirstStatusCount(statusCounts, ['EXPIRED', 'expired']) },
    { key: 'closed' as const, text: '已失效', count: resolveClosedStatusCount(statusCounts) },
  ];
}

// 拉取单页年卡资产，当前会员身份由 BFF token 注入。
async function fetchAnnualCardPage(status: string | undefined, page: number, size: number) {
  const result = await request<BackendPageResult<BffAnnualCard> | BffAnnualCard[]>({
    url: appendQuery('/api/bff/members/annual-cards', {
      status,
      page,
      size,
    }),
    method: 'GET',
  });

  return normalizePageResult(result, page, size);
}

// 合并多个后端状态页，用于“已失效”同时覆盖作废和退款年卡。
function mergeAnnualCardPageResults(results: Array<Awaited<ReturnType<typeof fetchAnnualCardPage>>>, page: number, size: number) {
  const cardMap = new Map<string, BffAnnualCard>();
  results.forEach((result) => {
    result.list.forEach((card) => {
      const cardId = normalizeString(card.cardId) || normalizeString(card.cardNo);
      if (!cardId) return;
      cardMap.set(cardId, card);
    });
  });

  return {
    list: Array.from(cardMap.values()),
    total: results.reduce((sum, result) => sum + result.total, 0),
    page,
    size,
    hasMore: results.some((result) => result.hasMore),
    statusCounts: results[0]?.statusCounts ?? {},
  };
}

// 拉取当前登录会员的年卡资产列表。
export async function fetchMemberAnnualCards(options: FetchMemberAnnualCardsOptions = {}): Promise<MemberAnnualCardsData> {
  const page = options.page ?? DEFAULT_PAGE;
  const size = options.size ?? DEFAULT_PAGE_SIZE;
  const backendStatuses = options.status && options.status !== 'all'
    ? STATUS_TO_BACKEND[options.status]
    : undefined;
  const normalizedResult = Array.isArray(backendStatuses)
    ? mergeAnnualCardPageResults(
      await Promise.all(backendStatuses.map((status) => fetchAnnualCardPage(status, page, size))),
      page,
      size,
    )
    : await fetchAnnualCardPage(backendStatuses, page, size);

  return {
    tabs: buildTabs(normalizedResult.total, normalizedResult.statusCounts),
    list: normalizedResult.list
      .map(normalizeAnnualCard)
      .filter((card): card is MemberAnnualCardItem => Boolean(card)),
    total: normalizedResult.total,
    page: normalizedResult.page,
    size: normalizedResult.size,
    hasMore: normalizedResult.hasMore,
  };
}

// 拉取单张年卡详情，供卡包详情页刷新实时状态。
export async function fetchMemberAnnualCardDetail(cardId: string) {
  const result = await request<BffAnnualCard>({
    url: `/api/bff/members/annual-cards/${encodeURIComponent(cardId)}`,
    method: 'GET',
  });

  const card = normalizeAnnualCard(result);
  if (!card) {
    throw new Error('年卡资产缺少编号');
  }

  return card;
}
