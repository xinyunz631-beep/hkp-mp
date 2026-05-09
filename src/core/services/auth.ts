import { request } from '@/core/request';
import { rootStore } from '@/core/store';
import type { LoginResult, PhoneLoginPayload, ProfileLoginPayload, SilentLoginPayload } from '@/core/types/auth';
import type { WechatPhoneCredential } from '@/core/wechat/auth';
import { checkWechatSessionValid, getWechatLoginCode, getWechatUserProfile } from '@/core/wechat/auth';

interface LoginGuardOptions {
  reason?: string;
  onSuccess?: () => void;
}

// 收口登录成功后的状态写入和待续执行动作。
function completeLogin(result: LoginResult) {
  rootStore.session.setSession(result.token, result.user);
  const callback = rootStore.ui.finishLogin();
  callback?.();
  return result;
}

// 执行小程序静默登录，优先建立后端会话但不打断用户。
export async function silentLogin() {
  if (rootStore.session.isLoggedIn) {
    const sessionValid = await checkWechatSessionValid();
    if (sessionValid) return undefined;
    rootStore.session.clearSession();
  }

  try {
    const loginCode = await getWechatLoginCode();
    const result = await request<LoginResult, SilentLoginPayload>({
      url: '/auth/silent-login',
      method: 'POST',
      data: { loginCode },
      showLoading: false,
      showErrorToast: false,
    });
    return completeLogin(result);
  } catch {
    return undefined;
  }
}

// 执行微信手机号授权登录，优先使用微信新版手机号 code。
export async function loginWithPhoneNumber(credential: WechatPhoneCredential) {
  const loginCode = await getWechatLoginCode();
  const result = await request<LoginResult, PhoneLoginPayload>({
    url: '/auth/phone-login',
    method: 'POST',
    data: {
      loginCode,
      phoneCode: credential.code,
      encryptedData: credential.encryptedData,
      iv: credential.iv,
    },
  });
  return completeLogin(result);
}

// 执行微信资料授权登录，作为手机号授权不可用时的兜底登录。
export async function loginWithProfile() {
  const [loginCode, profile] = await Promise.all([getWechatLoginCode(), getWechatUserProfile()]);
  const result = await request<LoginResult, ProfileLoginPayload>({
    url: '/auth/profile-login',
    method: 'POST',
    data: {
      loginCode,
      encryptedData: profile.encryptedData,
      iv: profile.iv,
      rawData: profile.rawData,
      signature: profile.signature,
      nickname: profile.userInfo?.nickName,
      avatarUrl: profile.userInfo?.avatarUrl,
    },
  });
  return completeLogin(result);
}

// 确保用户已登录，未登录时打开全局登录弹窗并缓存成功后的动作。
export function requireLogin(options?: string | LoginGuardOptions) {
  const normalizedOptions: LoginGuardOptions = typeof options === 'string' ? { reason: options } : options || {};
  if (rootStore.session.isLoggedIn) {
    normalizedOptions.onSuccess?.();
    return true;
  }

  rootStore.ui.openLogin(normalizedOptions.reason, normalizedOptions.onSuccess);
  return false;
}

// 生成带登录守卫的业务动作，页面可直接包裹点击回调减少重复判断。
export function withLoginGuard<TArgs extends unknown[]>(
  handler: (...args: TArgs) => void,
  reason?: string,
) {
  return (...args: TArgs) => {
    requireLogin({
      reason,
      onSuccess: () => handler(...args),
    });
  };
}

// 退出当前登录态，用于个人中心和调试环境切换账号。
export function logout() {
  rootStore.session.clearSession();
}
