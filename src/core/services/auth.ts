import Taro from '@tarojs/taro';
import { bootstrapCsession } from '@/core/request';
import { rootStore } from '@/core/store';
import type { WechatPhoneCredential } from '@/core/wechat/auth';
import { getWechatUserProfile } from '@/core/wechat/auth';

interface LoginGuardOptions {
  reason?: string;
  onSuccess?: () => void;
}

type GuardedHandler<TArgs extends unknown[]> = (...args: TArgs) => void | Promise<void>;

// 完成登录流程，并自动续执行登录前缓存的业务动作。
function finishCurrentLogin() {
  const callback = rootStore.app.finishLogin();
  callback?.();
  return true;
}

// 判断当前会员是否已登录，页面不要散写 mobile 等字段判断。
export function isLoggedIn() {
  return rootStore.member.isLoggedIn;
}

// 执行小程序启动授权，优先建立后端 CSESSION 但不打断用户。
export async function silentLogin() {
  try {
    await bootstrapCsession();
  } catch {
    return undefined;
  }
}

// 确保用户已登录，未登录时打开登录弹窗并等待用户处理。
export async function ensureLogin(reason = '登录后可继续使用该服务') {
  if (isLoggedIn()) return true;
  return rootStore.app.requestLogin(reason);
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

// 执行微信手机号授权后的登录确认，当前以后端 V2 返回 mobile 作为登录事实源。
export async function loginWithPhoneNumber(_credential: WechatPhoneCredential) {
  await bootstrapCsession();
  if (isLoggedIn()) return finishCurrentLogin();

  Taro.showToast({
    title: '当前账号暂未完成手机号绑定',
    icon: 'none',
    duration: 2200,
  });
  return false;
}

// 执行微信资料授权，资料可用于展示补充，但不能替代手机号登录事实。
export async function loginWithProfile() {
  const profile = await getWechatUserProfile();
  if (profile.userInfo && rootStore.member.hasCsession) {
    rootStore.member.setProfileFromAuth({
      ...rootStore.member.profile,
      nickname: profile.userInfo.nickName,
      avatarUrl: profile.userInfo.avatarUrl,
    });
  }

  if (isLoggedIn()) return finishCurrentLogin();

  Taro.showToast({
    title: '请先完成手机号登录',
    icon: 'none',
    duration: 2200,
  });
  return false;
}

// 使用本地会员身份完成登录，支撑无真实后端时的完整交易链路验收。
export function loginWithLocalMember() {
  rootStore.member.setMember('local-hkitty-session', {
    id: 'local-member-001',
    nickname: '乐园会员',
    avatarUrl: '',
    mobile: '13800000000',
    levelName: 'Hello Kitty Park 会员',
    points: 1280,
  });

  return finishCurrentLogin();
}

// 同步判断登录状态，未登录时打开登录弹窗并缓存成功后的动作。
export function requireLogin(options?: string | LoginGuardOptions) {
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
    });
  };
}

// 退出当前登录态，用于个人中心和调试环境切换账号。
export function logout() {
  rootStore.member.clearMember();
  rootStore.app.closeLogin();
}
