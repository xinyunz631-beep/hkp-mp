import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import type { HkpAddressSummary } from '@/core/types/hkp';
import { getCache, setCache } from '@/core/utils/cache';

export type MallShippingMode = 'express' | 'none' | 'pickupOnly' | 'unsupported';

export interface MallShippingRule {
  mode: MallShippingMode;
  freightAmount?: number;
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

function listMallCheckoutDrafts() {
  return normalizeDrafts(getCache<unknown>(MINI_STORAGE_KEYS.mallCheckoutDrafts));
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
  let freightAmount = 0;

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

    freightAmount += rule.freightAmount ?? 0;

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

  return {
    canSubmit,
    freightAmount: Number(freightAmount.toFixed(2)),
    shippingText: canSubmit
      ? requiresAddress
        ? freightAmount > 0 ? `第三方配送 ¥${freightAmount.toFixed(2)}` : '第三方配送 包邮'
        : resolveNoLogisticsShippingText(draft)
      : uniqueErrors[0],
    errors: uniqueErrors,
  };
}
