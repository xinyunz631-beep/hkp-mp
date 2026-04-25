import Taro from '@tarojs/taro';
import { request } from '@/core/request';
import { rootStore } from '@/core/store';
import type { LoginResult } from '@/core/types/auth';

// 执行小程序静默登录，优先建立后端会话但不打断用户。
export async function silentLogin() {
  if (rootStore.session.isLoggedIn) return undefined;

  try {
    const loginResult = await Taro.login();
    const result = await request<LoginResult, { code: string }>({
      url: '/auth/silent-login',
      method: 'POST',
      data: { code: loginResult.code },
    });
    rootStore.session.setSession(result.token, result.user);
    return result;
  } catch {
    return undefined;
  }
}

// 执行用户主动登录，供全局登录弹窗按钮调用。
export async function loginWithProfile() {
  const result = await request<LoginResult>({
    url: '/auth/profile-login',
    method: 'POST',
  });
  rootStore.session.setSession(result.token, result.user);
  rootStore.ui.closeLogin();
  return result;
}

// 确保用户已登录，未登录时打开全局登录弹窗。
export function requireLogin(reason?: string) {
  if (rootStore.session.isLoggedIn) return true;
  rootStore.ui.openLogin(reason);
  return false;
}

// 退出当前登录态，用于个人中心和调试环境切换账号。
export function logout() {
  rootStore.session.clearSession();
}
