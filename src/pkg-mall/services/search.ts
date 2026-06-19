import { getCache, removeCache, setCache } from '@/core/utils/cache';
import { fetchBffMallHome, fetchBffMallProducts } from '@/core/services/bff-mall-api';
import type { HkpProductSummary } from '@/core/types/hkp';
import { toMallProductSummary } from './bff-adapter';

const MALL_SEARCH_HISTORY_KEY = 'hkp_mall_search_history';
const MALL_SEARCH_HISTORY_LIMIT = 10;
const MALL_SEARCH_HOT_KEYWORDS_LIMIT = 8;
const DEFAULT_MALL_SEARCH_PLACEHOLDER = '搜索商城商品';

export interface MallSearchData {
  placeholder: string;
  hotKeywords: string[];
  products: HkpProductSummary[];
}

export interface MallSearchRelatedData {
  keyword: string;
  products: HkpProductSummary[];
}

// 归一化搜索关键词，供匹配、去重和空值判断复用。
export function normalizeMallSearchKeyword(keyword?: string) {
  return (keyword || '').trim().toLowerCase();
}

// 判断商品是否命中当前搜索词，供相关商品高亮和结果页前端过滤复用。
export function isMallProductMatched(product: HkpProductSummary, keyword?: string) {
  const normalizedKeyword = normalizeMallSearchKeyword(keyword);

  if (!normalizedKeyword) return true;

  return [
    product.title,
    product.subtitle,
    product.tag,
  ].some((text) => (text || '').toLowerCase().includes(normalizedKeyword));
}

// 按关键词过滤商城商品，供搜索页相关商品和商品列表结果页复用。
export function filterMallProductsByKeyword(products: HkpProductSummary[], keyword?: string) {
  const normalizedKeyword = normalizeMallSearchKeyword(keyword);

  if (!normalizedKeyword) return products;

  return products.filter((product) => isMallProductMatched(product, normalizedKeyword));
}

function pickSearchKeyword(value?: string) {
  return String(value || '').trim();
}

function collectMallSearchHotKeywords(items: Array<string | undefined>) {
  const existed = new Set<string>();
  const result: string[] = [];

  items.forEach((item) => {
    const keyword = pickSearchKeyword(item);
    const normalizedKeyword = normalizeMallSearchKeyword(keyword);
    if (!keyword || existed.has(normalizedKeyword)) return;
    existed.add(normalizedKeyword);
    result.push(keyword);
  });

  return result.slice(0, MALL_SEARCH_HOT_KEYWORDS_LIMIT);
}

// 获取搜索页真实热词和首屏候选商品。
export async function fetchMallSearchData(): Promise<MallSearchData> {
  const response = await fetchBffMallHome();
  const hotKeywords = collectMallSearchHotKeywords([
    ...(response.recommendations ?? []).flatMap((item) => [item.keyword, item.title]),
    ...(response.categories ?? []).map((item) => item.title),
    ...(response.products ?? []).map((item) => item.title),
  ]);

  return {
    placeholder: hotKeywords[0] ? `搜索${hotKeywords[0]}` : DEFAULT_MALL_SEARCH_PLACEHOLDER,
    hotKeywords,
    products: (response.products ?? []).slice(0, 6).map(toMallProductSummary),
  };
}

// 获取搜索输入后的相关商品，直接查询商城 BFF。
export async function fetchMallSearchRelatedProducts(keyword?: string) {
  const nextKeyword = String(keyword || '').trim();
  const response = await fetchBffMallProducts({
    keyword: nextKeyword,
    page: 1,
    size: 6,
  });

  return {
    keyword: nextKeyword,
    products: (response.list ?? []).map(toMallProductSummary),
  };
}

// 清洗历史搜索缓存，保证最多保留最新 10 条且不出现空值或重复项。
function normalizeMallSearchHistory(data: unknown) {
  if (!Array.isArray(data)) return [];

  const existed = new Set<string>();
  const result: string[] = [];

  data.forEach((item) => {
    const keyword = String(item || '').trim();
    const normalizedKeyword = normalizeMallSearchKeyword(keyword);

    if (!keyword || existed.has(normalizedKeyword)) return;

    existed.add(normalizedKeyword);
    result.push(keyword);
  });

  return result.slice(0, MALL_SEARCH_HISTORY_LIMIT);
}

// 读取本地历史搜索，页面 initPage 只负责这类用户本地状态。
export function readMallSearchHistory() {
  return normalizeMallSearchHistory(getCache<unknown>(MALL_SEARCH_HISTORY_KEY));
}

// 写入本地历史搜索，并强制只落最近 10 条。
export function writeMallSearchHistory(keywords: string[]) {
  const nextHistory = normalizeMallSearchHistory(keywords).slice(0, MALL_SEARCH_HISTORY_LIMIT);
  setCache(MALL_SEARCH_HISTORY_KEY, nextHistory);
  return nextHistory;
}

// 保存一次搜索关键词，最新关键词前置，同词去重并裁剪到 10 条。
export function saveMallSearchKeyword(keyword?: string) {
  const nextKeyword = String(keyword || '').trim();

  if (!nextKeyword) return readMallSearchHistory();

  const normalizedKeyword = normalizeMallSearchKeyword(nextKeyword);
  const currentHistory = readMallSearchHistory();
  const nextHistory = [
    nextKeyword,
    ...currentHistory.filter((item) => normalizeMallSearchKeyword(item) !== normalizedKeyword),
  ];

  return writeMallSearchHistory(nextHistory);
}

// 清空本地历史搜索，页面必须在调用前完成用户确认。
export function clearMallSearchHistory() {
  removeCache(MALL_SEARCH_HISTORY_KEY);
  return [];
}
