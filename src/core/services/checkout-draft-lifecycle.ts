export const CHECKOUT_DRAFT_TTL_MS = 30 * 60 * 1000;

export interface CheckoutDraftLifecycleRecord {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 解析草稿时间，兼容 ISO 字符串和项目内使用的 yyyy-MM-dd HH:mm 格式。
function parseCheckoutDraftTime(value?: string) {
  if (!value) return undefined;
  const timestamp = Date.parse(value.includes('T') ? value : value.replace(' ', 'T'));
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

// 判断结算草稿是否已过期，无法解析时间时保守保留草稿。
export function isCheckoutDraftExpired(draft: CheckoutDraftLifecycleRecord, now = Date.now()) {
  const timestamp = parseCheckoutDraftTime(draft.updatedAt || draft.createdAt);
  return typeof timestamp === 'number' && now - timestamp > CHECKOUT_DRAFT_TTL_MS;
}

// 过滤已过期结算草稿，调用方仍按各自 storage key 写回，避免跨业态清理。
export function pruneCheckoutDrafts<TDraft extends CheckoutDraftLifecycleRecord>(drafts: TDraft[], now = Date.now()) {
  return drafts.filter((draft) => !isCheckoutDraftExpired(draft, now));
}

// 按当前业态的 draftId 精准删除一个草稿，不碰其它业态 storage。
export function removeCheckoutDraftById<TDraft extends CheckoutDraftLifecycleRecord>(drafts: TDraft[], draftId?: string) {
  if (!draftId) return drafts;
  return drafts.filter((draft) => draft.id !== draftId);
}
