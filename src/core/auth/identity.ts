import type { LoginUserProfile } from '@/core/types/auth';

export interface LoginIdentitySnapshot {
  csession?: string;
  user?: Partial<LoginUserProfile>;
}

// 判断当前会话是否具备登录身份，后续登录字段变化只需要改这里。
export function hasLoginIdentity(snapshot: LoginIdentitySnapshot) {
  return Boolean(snapshot.csession && snapshot.user?.mobile?.trim());
}

// 从 V2 授权响应中提取用户基础资料，只把有手机号的响应视为已登录。
export function buildLoginUserProfile(payload: Partial<LoginUserProfile> = {}) {
  const mobile = payload.mobile?.trim();
  if (!mobile) return undefined;

  return {
    id: payload.id || mobile,
    nickname: payload.nickname || '乐园会员',
    avatarUrl: payload.avatarUrl,
    mobile,
    levelName: payload.levelName || '会员',
    points: payload.points ?? 0,
  };
}
