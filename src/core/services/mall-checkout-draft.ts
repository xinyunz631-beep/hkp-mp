import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import type { HkpAddressSummary } from '@/core/types/hkp';
import { pruneCheckoutDrafts, removeCheckoutDraftById } from './checkout-draft-lifecycle';
import { getCache, setCache } from '@/core/utils/cache';
import { formatCurrency, parseNumberLike } from '@/core/utils/money';

export type MallShippingMode = 'express' | 'none' | 'pickupOnly' | 'unsupported';

export interface MallShippingRule {
  mode: MallShippingMode;
  freightAmount?: number;
  freeShippingThreshold?: number;
  templateId?: string;
  supportedRegionKeywords?: string[];
  unsupportedRegionKeywords?: string[];
  reasonText?: string;
}

export interface MallCheckoutDraftProduct {
  id: string;
  productId: string;
  title: string;
  specText: string;
  quantity: number;
  unitPrice: number;
  imageSrc: string;
  merchantName: string;
  giftText?: string;
  canRefund?: boolean;
  canAfterSale?: boolean;
  shippingRule?: MallShippingRule;
  sourceCartItemId?: string;
}

export interface MallCheckoutDraft {
  id: string;
  products: MallCheckoutDraftProduct[];
  selectedCouponId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MallDeliveryCheckResult {
  canSubmit: boolean;
  shippingText: string;
  freightAmount: number;
  errors: string[];
}

interface CreateMallCheckoutDraftPayload {
  products: MallCheckoutDraftProduct[];
  selectedCouponId?: string;
}

function createDraftId() {
  return `mall-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function createDraftTime() {
  return new Date().toISOString();
}

function normalizeDrafts(data: unknown): MallCheckoutDraft[] {
  if (!Array.isArray(data)) return [];
  return data.filter((draft): draft is MallCheckoutDraft => Boolean(draft?.id && Array.isArray(draft.products)));
}

// 删除指定商城草稿关联的地址选择，只处理商城地址选择 map 的对应 draftId。
function removeMallCheckoutSelectedAddressIds(draftIds: string[]) {
  if (draftIds.length === 0) return;
  const currentMap = getCache<Record<string, string>>(MINI_STORAGE_KEYS.mallCheckoutAddressSelections) ?? {};
  const nextMap = { ...currentMap };
  draftIds.forEach((draftId) => {
    delete nextMap[draftId];
  });
  setCache(MINI_STORAGE_KEYS.mallCheckoutAddressSelections, nextMap);
}

function listMallCheckoutDrafts() {
  const drafts = normalizeDrafts(getCache<unknown>(MINI_STORAGE_KEYS.mallCheckoutDrafts));
  const availableDrafts = pruneCheckoutDrafts(drafts);

  if (availableDrafts.length !== drafts.length) {
    const availableIds = new Set(availableDrafts.map((draft) => draft.id));
    saveMallCheckoutDrafts(availableDrafts);
    removeMallCheckoutSelectedAddressIds(drafts
      .map((draft) => draft.id)
      .filter((draftId) => !availableIds.has(draftId)));
  }

  return availableDrafts;
}

function saveMallCheckoutDrafts(drafts: MallCheckoutDraft[]) {
  setCache(MINI_STORAGE_KEYS.mallCheckoutDrafts, drafts.slice(0, 20));
}

function normalizeProduct(product: MallCheckoutDraftProduct): MallCheckoutDraftProduct {
  return {
    ...product,
    quantity: Math.max(1, Number(product.quantity) || 1),
    unitPrice: Math.max(0, Number(product.unitPrice) || 0),
    merchantName: product.merchantName || '',
    specText: product.specText || '',
    shippingRule: product.shippingRule ?? { mode: 'unsupported', reasonText: '当前商品暂不可配送，请返回商品页重新选择' },
  };
}

function getAddressSearchText(address?: HkpAddressSummary) {
  if (!address) return '';
  return [
    address.region,
    address.detail,
    address.locationName,
    address.locationAddress,
  ].filter(Boolean).join(' ');
}

function matchesAnyKeyword(text: string, keywords?: string[]) {
  if (!keywords || keywords.length === 0) return false;
  return keywords.some((keyword) => keyword && text.includes(keyword));
}

export function createMallCheckoutDraft(payload: CreateMallCheckoutDraftPayload) {
  const products = payload.products.map(normalizeProduct).filter((product) => product.quantity > 0);
  if (products.length === 0) return undefined;

  const now = createDraftTime();
  const draft: MallCheckoutDraft = {
    id: createDraftId(),
    products,
    selectedCouponId: payload.selectedCouponId,
    createdAt: now,
    updatedAt: now,
  };

  saveMallCheckoutDrafts([draft, ...listMallCheckoutDrafts().filter((item) => item.id !== draft.id)]);
  return draft;
}

export function getMallCheckoutDraft(draftId?: string) {
  if (!draftId) return undefined;
  return listMallCheckoutDrafts().find((draft) => draft.id === draftId);
}

// 清理已过期商城草稿，只处理商城 storage 和对应地址选择。
export function pruneMallCheckoutDrafts() {
  const drafts = listMallCheckoutDrafts();
  saveMallCheckoutDrafts(drafts);
  return drafts;
}

// 删除指定商城订单草稿，同时只删除该 draftId 的地址选择。
export function removeMallCheckoutDraft(draftId?: string) {
  saveMallCheckoutDrafts(removeCheckoutDraftById(listMallCheckoutDrafts(), draftId));
  if (draftId) removeMallCheckoutSelectedAddressIds([draftId]);
}

// 更新商城结算草稿，确认单选券、清券和地址返回后都以这里保持本地状态一致。
export function updateMallCheckoutDraft(draftId: string, patch: Partial<MallCheckoutDraft>) {
  const drafts = listMallCheckoutDrafts();
  const current = drafts.find((draft) => draft.id === draftId);
  if (!current) return undefined;

  const nextDraft: MallCheckoutDraft = {
    ...current,
    ...patch,
    updatedAt: createDraftTime(),
  };

  saveMallCheckoutDrafts(drafts.map((draft) => (draft.id === draftId ? nextDraft : draft)));
  return nextDraft;
}

export function setMallCheckoutSelectedAddressId(draftId: string, addressId: string) {
  const currentMap = getCache<Record<string, string>>(MINI_STORAGE_KEYS.mallCheckoutAddressSelections) ?? {};
  setCache(MINI_STORAGE_KEYS.mallCheckoutAddressSelections, {
    ...currentMap,
    [draftId]: addressId,
  });
}

export function getMallCheckoutSelectedAddressId(draftId?: string) {
  if (!draftId) return undefined;
  const currentMap = getCache<Record<string, string>>(MINI_STORAGE_KEYS.mallCheckoutAddressSelections) ?? {};
  return currentMap[draftId];
}

export function isMallCheckoutAddressRequired(draft: MallCheckoutDraft) {
  return draft.products.some((product) => product.shippingRule?.mode === 'express');
}

// 归一化商城运费金额，接口和草稿内统一按元单位保存。
function normalizeMallFreightAmount(value: unknown) {
  const amount = parseNumberLike(value);
  return typeof amount === 'number' && amount > 0 ? amount : 0;
}

// 计算商城确认单运费，同一配送模板只收一次，满足包邮门槛时免运费。
function resolveMallCheckoutFreightAmount(draft: MallCheckoutDraft) {
  const freightGroups = new Map<string, {
    freightAmount: number;
    productAmount: number;
    freeShippingThreshold?: number;
  }>();
  let fallbackIndex = 0;

  draft.products.forEach((product) => {
    const rule = product.shippingRule;
    if (rule?.mode !== 'express') return;

    const freightAmount = normalizeMallFreightAmount(rule.freightAmount);
    if (freightAmount <= 0) return;

    const groupKey = rule.templateId || `line:${fallbackIndex}`;
    fallbackIndex += 1;
    const currentGroup = freightGroups.get(groupKey) ?? {
      freightAmount: 0,
      productAmount: 0,
      freeShippingThreshold: rule.freeShippingThreshold,
    };

    currentGroup.freightAmount = Math.max(currentGroup.freightAmount, freightAmount);
    currentGroup.productAmount += Math.max(0, Number(product.unitPrice) || 0) * Math.max(1, Number(product.quantity) || 1);
    if (typeof currentGroup.freeShippingThreshold !== 'number') {
      currentGroup.freeShippingThreshold = rule.freeShippingThreshold;
    }
    freightGroups.set(groupKey, currentGroup);
  });

  return Array.from(freightGroups.values()).reduce((sum, group) => {
    if (
      typeof group.freeShippingThreshold === 'number'
      && group.freeShippingThreshold > 0
      && group.productAmount >= group.freeShippingThreshold
    ) {
      return sum;
    }

    return sum + group.freightAmount;
  }, 0);
}

function resolveNoLogisticsShippingText(draft: MallCheckoutDraft) {
  const rule = draft.products.find((product) => product.shippingRule?.mode === 'none')?.shippingRule;
  return rule?.reasonText || '无需物流';
}

export function validateMallCheckoutDelivery(
  draft: MallCheckoutDraft,
  address?: HkpAddressSummary,
): MallDeliveryCheckResult {
  const errors: string[] = [];
  const addressSearchText = getAddressSearchText(address);
  const requiresAddress = isMallCheckoutAddressRequired(draft);

  if (requiresAddress && !address) {
    errors.push('请先选择收货地址');
  }

  draft.products.forEach((product) => {
    const rule = product.shippingRule ?? { mode: 'express' as const };

    if (rule.mode === 'unsupported') {
      errors.push(rule.reasonText || `${product.title}暂不支持配送`);
      return;
    }

    if (rule.mode === 'pickupOnly') {
      errors.push(rule.reasonText || `${product.title}当前商城暂不支持自提`);
      return;
    }

    if (rule.mode === 'none') {
      return;
    }

    if (!addressSearchText) return;

    if (matchesAnyKeyword(addressSearchText, rule.unsupportedRegionKeywords)) {
      errors.push(rule.reasonText || `${product.title}暂不支持配送至当前地址`);
      return;
    }

    if (
      rule.supportedRegionKeywords
      && rule.supportedRegionKeywords.length > 0
      && !matchesAnyKeyword(addressSearchText, rule.supportedRegionKeywords)
    ) {
      errors.push(rule.reasonText || `${product.title}仅支持配送至指定区域`);
    }
  });

  const uniqueErrors = Array.from(new Set(errors));
  const canSubmit = uniqueErrors.length === 0;
  const freightAmount = canSubmit ? resolveMallCheckoutFreightAmount(draft) : 0;

  return {
    canSubmit,
    freightAmount,
    shippingText: canSubmit
      ? requiresAddress
        ? freightAmount > 0
          ? `第三方配送 ${formatCurrency(freightAmount)}`
          : '第三方配送 包邮'
        : resolveNoLogisticsShippingText(draft)
      : uniqueErrors[0],
    errors: uniqueErrors,
  };
}
