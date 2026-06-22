import type { LoginUserProfile } from '@/core/types/auth';

export const DEFAULT_MEMBER_LEVEL_ID = '8000000000001001';
export const DEFAULT_MEMBER_LEVEL_NO = 1;
export const DEFAULT_MEMBER_LEVEL_NAME = '初级会员';
export const DEFAULT_MEMBER_GROWTH_VALUE = 0;
export const DEFAULT_MEMBER_AVATAR_URL = '';
const GENERIC_MEMBER_LEVEL_NAMES = new Set(['会员', 'Hello Kitty Park 会员']);

export interface MemberLevelSource {
  levelId?: string;
  levelNo?: number | string;
  levelName?: string;
  growthValue?: number | string;
}

export interface MemberLevelDisplay {
  levelId: string;
  levelNo: number;
  levelName: string;
  growthValue: number;
}

export interface MemberAvatarSource {
  avatarUrl?: string;
}

function resolveNonNegativeNumber(value: number | string | undefined) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value !== 'string') return undefined;

  const nextValue = Number(value.trim());
  return Number.isFinite(nextValue) && nextValue >= 0 ? nextValue : undefined;
}

function resolveLevelNo(value: number | string | undefined) {
  const nextValue = resolveNonNegativeNumber(value);
  if (!nextValue) return undefined;

  return Math.floor(nextValue);
}

function resolveLevelName(value?: string, fallback?: string) {
  const nextValue = value?.trim();
  if (nextValue && !GENERIC_MEMBER_LEVEL_NAMES.has(nextValue)) return nextValue;

  const nextFallback = fallback?.trim();
  if (nextFallback && !GENERIC_MEMBER_LEVEL_NAMES.has(nextFallback)) return nextFallback;

  return DEFAULT_MEMBER_LEVEL_NAME;
}

export function resolveMemberLevel(
  profile?: Partial<LoginUserProfile>,
  fallback: MemberLevelSource = {},
): MemberLevelDisplay {
  const levelId = profile?.levelId || fallback.levelId || DEFAULT_MEMBER_LEVEL_ID;
  const levelNo = resolveLevelNo(profile?.levelNo ?? fallback.levelNo) ?? DEFAULT_MEMBER_LEVEL_NO;
  const levelName = resolveLevelName(profile?.levelName, fallback.levelName);
  const growthValue = resolveNonNegativeNumber(profile?.growthValue ?? fallback.growthValue)
    ?? DEFAULT_MEMBER_GROWTH_VALUE;

  return {
    levelId,
    levelNo,
    levelName,
    growthValue,
  };
}

export function resolveMemberAvatar(profile?: MemberAvatarSource, fallbackAvatarUrl?: string) {
  return profile?.avatarUrl?.trim()
    || fallbackAvatarUrl?.trim()
    || DEFAULT_MEMBER_AVATAR_URL;
}
