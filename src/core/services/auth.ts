import {
  bootstrapCsession,
  isApiCredentialInvalidError,
  setAuthSessionChangedHandler,
  setCredentialInvalidHandler,
} from '@/core/request';
import {
  authorizeBffMiniProgramPhone,
  fetchBffMemberStatus,
  logoutBffAuthSession,
  type BffMemberInfo,
} from '@/core/services/bff-api';
import { rootStore } from '@/core/store';
import {
  resolveMemberAvatar,
  resolveMemberLevel,
} from '@/core/utils/member-profile';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { showWechatToast } from '@/core/utils/wechat-actions';
import type { WechatPhoneCredential } from '@/core/wechat/auth';

interface LoginGuardOptions {
  reason?: string;
  onSuccess?: () => void;
}

interface RefreshMemberStatusOptions {
  force?: boolean;
  silent?: boolean;
  isNeedLogin?: boolean;
  showErrorToast?: boolean;
}

type GuardedHandler<TArgs extends unknown[]> = (...args: TArgs) => void | Promise<void>;

setCredentialInvalidHandler(() => {
  rootStore.member.clearProfile(false);
});

setAuthSessionChangedHandler(async () => {
  await getMemberStatus({
    force: true,
    silent: true,
    isNeedLogin: false,
  });
});

// 完成登录流程，并自动续执行登录前缓存的业务动作。
function finishCurrentLogin() {
  rootStore.app.completeLogin();
  return true;
}

// 判断当前会员是否已登录，页面不要散写 mobile 等字段判断。
export function isLoggedIn() {
  return rootStore.isLoggedIn;
}

// 将后端会员状态接口返回的 memberInfo 归一到全局会员资料。
function buildLoginProfileFromMemberInfo(memberInfo?: BffMemberInfo | null) {
  if (!memberInfo?.phone?.trim()) return undefined;

  const memberLevel = resolveMemberLevel({
    levelId: memberInfo.levelCode,
    levelNo: memberInfo.levelNo,
    levelName: memberInfo.levelName,
    growthValue: memberInfo.growthValue,
  });

  return {
    id: memberInfo.phone,
    nickname: memberInfo.nickName || '乐园会员',
    avatarUrl: resolveMemberAvatar({ avatarUrl: memberInfo.avatarUrl }),
    mobile: memberInfo.phone,
    levelId: memberLevel.levelId,
    levelNo: memberLevel.levelNo,
    levelName: memberLevel.levelName,
    growthValue: memberLevel.growthValue,
    points: 0,
  };
}

// 按后端会员状态接口刷新全局会员资料；默认先 login/token，再以 member/status 为准。
export async function getMemberStatus(options: RefreshMemberStatusOptions = {}) {
  const {
    force = false,
    silent = false,
    isNeedLogin = true,
    showErrorToast = !silent,
  } = options;
  if (!force && rootStore.member.memberStatusChecked) return isLoggedIn();

  try {
    if (isNeedLogin) {
      await bootstrapCsession();
      if (rootStore.member.memberStatusChecked) return isLoggedIn();
    } else if (!rootStore.member.csession) {
      rootStore.member.clearProfile(false);
      return false;
    }

    const status = await fetchBffMemberStatus(showErrorToast);
    const profile = status.memberLoggedIn
      ? buildLoginProfileFromMemberInfo(status.memberInfo)
      : undefined;
    rootStore.member.applyMemberStatus(profile);
    return Boolean(status.memberLoggedIn && profile);
  } catch (error) {
    if (!silent) throw error;
    if (isApiCredentialInvalidError(error)) rootStore.member.clearProfile(false);
    return false;
  }
}

// 刷新全局会员态：先重新获取 BFF token，再用 member/status 覆盖 MobX 会员资料。
export function refreshMember(options: { silent?: boolean } = {}) {
  return getMemberStatus({
    force: true,
    silent: options.silent,
    isNeedLogin: true,
  });
}

// 使用当前 BFF session 重新同步会员状态，不主动触发小程序 login。
export function syncMemberStatus(options: { silent?: boolean; showErrorToast?: boolean } = {}) {
  return getMemberStatus({
    force: true,
    silent: options.silent,
    isNeedLogin: false,
    showErrorToast: options.showErrorToast,
  });
}

// 执行小程序启动授权，优先建立后端 CSESSION 但不打断用户。
export async function silentLogin() {
  try {
    await refreshMember({ silent: true });
  } catch {
    return undefined;
  }
}

// 确保用户已登录，未登录时打开登录弹窗并等待用户处理。
export async function ensureLogin(reason = '登录后可继续使用该服务') {
  if (isLoggedIn()) return true;
  return rootStore.app.requestLogin(reason);
}

// 可选登录提示：登录成功或用户选择暂不登录后，都由调用方继续业务流程。
export async function promptLogin(reason = '登录后可享受更多会员服务') {
  if (isLoggedIn()) return 'success';
  return rootStore.app.requestLoginResult(reason);
}

// 登录后自动续执行业务动作，适合页面方法内的异步流程前置拦截。
export async function runAfterLogin<TArgs extends unknown[]>(
  handler: GuardedHandler<TArgs>,
  reason?: string,
  ...args: TArgs
) {
  const authed = await ensureLogin(reason);
  if (!authed) return false;

  await handler(...args);
  return true;
}

// 执行微信手机号授权后的登录确认，会员事实源以后端 member/status 和授权响应为准。
export async function loginWithPhoneNumber(credential: WechatPhoneCredential) {
  if (!credential.code) {
    await showWechatToast(resolveErrorMessage(credential, '请使用手机号授权登录'));
    return false;
  }

  const result = await authorizeBffMiniProgramPhone({
    code: credential.code,
  });

  try {
    await syncMemberStatus({ silent: false, showErrorToast: false });
  } catch (error) {
    await showWechatToast(resolveErrorMessage(error, '会员状态同步失败'));
    return false;
  }

  if (isLoggedIn()) return finishCurrentLogin();

  await showWechatToast(resolveErrorMessage(result, '手机号授权未完成'));
  return false;
}

// 同步判断登录状态，未登录时打开登录弹窗并缓存成功后的动作。
export async function requireLogin(options?: string | LoginGuardOptions) {
  const normalizedOptions: LoginGuardOptions = typeof options === 'string' ? { reason: options } : options || {};
  if (isLoggedIn()) {
    normalizedOptions.onSuccess?.();
    return true;
  }

  rootStore.app.openLogin(normalizedOptions.reason, normalizedOptions.onSuccess);
  return false;
}

// 生成带登录守卫的业务动作，页面可直接包裹点击回调减少重复判断。
export function withLoginGuard<TArgs extends unknown[]>(
  handler: GuardedHandler<TArgs>,
  reason?: string,
) {
  return (...args: TArgs) => {
    requireLogin({
      reason,
      onSuccess: async () => {
        await handler(...args);
      },
    }).catch(() => undefined);
  };
}

// 退出当前登录态；服务端登出失败不阻塞用户本地退出。
export async function logout() {
  try {
    if (rootStore.member.csession && rootStore.member.signSecret) {
      await logoutBffAuthSession();
    }
  } catch {
    // 用户退出以本地状态清理为准，服务端失效失败由下次授权刷新兜底。
  } finally {
    rootStore.member.clearMember();
    rootStore.app.closeLogin();
  }
}
