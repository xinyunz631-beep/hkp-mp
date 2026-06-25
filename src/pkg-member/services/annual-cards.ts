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
  usageInstructionHtml?: string;
  usageInstructionSummary?: string;
}

export interface MemberAnnualCardsData {
  tabs: Array<{ key: MemberAnnualCardStatus; text: string; count?: number }>;
  list: MemberAnnualCardItem[];
  total: number;
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
  statusCounts?: Record<string, number | string>;
}

const STATUS_TO_BACKEND: Record<Exclude<MemberAnnualCardStatus, 'all'>, string> = {
  pendingActivation: 'PENDING_ACTIVATION',
  active: 'ACTIVE',
  expired: 'EXPIRED',
  closed: 'VOID',
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
  if (card.validFrom && card.validTo) return `${card.validFrom} 至 ${card.validTo}`;
  if (card.validTo) return `有效至 ${card.validTo}`;
  return '';
}

// 将 BFF 年卡资产结构转换成小程序卡包页面模型。
function normalizeAnnualCard(card: BffAnnualCard, index = 0): MemberAnnualCardItem {
  const status = normalizeCardStatus(card.status, card.statusText);
  const usageInstructionHtml = normalizeString(card.usageInstructionHtml || card.usageInstruction);

  return {
    id: normalizeString(card.cardId) || normalizeString(card.cardNo) || `annual-card-${index}`,
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
    usageInstructionHtml,
    usageInstructionSummary: stripHtml(usageInstructionHtml),
  };
}

// 兼容后端分页字段命名，但不生成任何假业务数据。
function normalizePageResult(result: BackendPageResult<BffAnnualCard> | BffAnnualCard[]) {
  if (Array.isArray(result)) {
    return { list: result, total: result.length, statusCounts: {} };
  }

  const list = result.list || result.records || result.items || [];
  return {
    list,
    total: result.total ?? result.totalCount ?? list.length,
    statusCounts: result.statusCounts || {},
  };
}

// 从后端状态计数中读取指定状态数量。
function readStatusCount(statusCounts: Record<string, number | string>, keys: string[]) {
  for (const key of keys) {
    const value = statusCounts[key];
    const numericValue = typeof value === 'number' ? value : Number(value);
    if (Number.isFinite(numericValue)) return numericValue;
  }

  return undefined;
}

// 根据后端统计生成卡包筛选标签。
function buildTabs(total: number, statusCounts: Record<string, number | string>) {
  return [
    { key: 'all' as const, text: '全部', count: total },
    {
      key: 'pendingActivation' as const,
      text: '待激活',
      count: readStatusCount(statusCounts, ['PENDING_ACTIVATION', 'pendingActivation']),
    },
    { key: 'active' as const, text: '已激活', count: readStatusCount(statusCounts, ['ACTIVE', 'active']) },
    { key: 'expired' as const, text: '已过期', count: readStatusCount(statusCounts, ['EXPIRED', 'expired']) },
    { key: 'closed' as const, text: '已失效', count: readStatusCount(statusCounts, ['VOID', 'REFUNDED', 'closed']) },
  ];
}

// 拉取当前登录会员的年卡资产列表。
export async function fetchMemberAnnualCards(options: FetchMemberAnnualCardsOptions = {}): Promise<MemberAnnualCardsData> {
  const backendStatus = options.status && options.status !== 'all'
    ? STATUS_TO_BACKEND[options.status]
    : undefined;
  const result = await request<BackendPageResult<BffAnnualCard> | BffAnnualCard[]>({
    url: appendQuery('/api/bff/members/annual-cards', {
      status: backendStatus,
      page: options.page ?? 1,
      size: options.size ?? 20,
    }),
    method: 'GET',
    sign: true,
  });
  const normalizedResult = normalizePageResult(result);

  return {
    tabs: buildTabs(normalizedResult.total, normalizedResult.statusCounts),
    list: normalizedResult.list.map(normalizeAnnualCard),
    total: normalizedResult.total,
  };
}

// 拉取单张年卡详情，供卡包详情页刷新实时状态。
export async function fetchMemberAnnualCardDetail(cardId: string) {
  const result = await request<BffAnnualCard>({
    url: `/api/bff/members/annual-cards/${encodeURIComponent(cardId)}`,
    method: 'GET',
    sign: true,
  });

  return normalizeAnnualCard(result);
}
