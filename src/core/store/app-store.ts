import { makeAutoObservable } from 'mobx';
import type { BffNewUserGiftSummary } from '@/core/services/bff-api';

export type LoginRequestResult = 'success' | 'cancel' | 'superseded';

export class AppStore {
  loginVisible = false;
  loginReason = '登录后可继续使用该服务';
  loginSuccessCallback?: () => void | Promise<void>;
  loginResolve?: (result: LoginRequestResult) => void;
  loginStateResolver?: () => boolean;
  newUserGift?: BffNewUserGiftSummary;
  newUserGiftVisible = false;

  // 初始化应用运行时 store，并让 MobX 自动追踪登录弹窗状态。
  constructor() {
    makeAutoObservable(this, {
      loginSuccessCallback: false,
      loginResolve: false,
      loginStateResolver: false,
    });
  }

  // 注入全局登录态判断，避免 app store 直接依赖 member store 形成循环引用。
  setLoginStateResolver(isLoggedInResolver: () => boolean) {
    this.loginStateResolver = isLoggedInResolver;
  }

  // 判断全局登录态是否已经成立，作为打开登录弹窗前的硬门禁。
  private get isAlreadyLoggedIn() {
    return this.loginStateResolver?.() ?? false;
  }

  // 打开登录弹窗，登录态为全局事实源，所有页面宿主共享同一份弹窗状态。
  openLogin(reason = '登录后可继续使用该服务', onSuccess?: () => void) {
    if (this.isAlreadyLoggedIn) {
      this.completeLogin();
      onSuccess?.();
      return;
    }

    this.resetLoginState('superseded');
    this.loginReason = reason;
    this.loginSuccessCallback = onSuccess;
    this.loginVisible = true;
  }

  // 请求登录，返回显式结果，区分用户取消和被后续弹窗/生命周期中止。
  requestLoginResult(reason = '登录后可继续使用该服务') {
    if (this.isAlreadyLoggedIn) {
      this.completeLogin();
      return Promise.resolve<LoginRequestResult>('success');
    }

    this.openLogin(reason);
    return new Promise<LoginRequestResult>((resolve) => {
      this.loginResolve = resolve;
    });
  }

  // 请求登录，返回 Promise 方便页面事件方法里 await 拦截。
  async requestLogin(reason = '登录后可继续使用该服务') {
    const result = await this.requestLoginResult(reason);
    return result === 'success';
  }

  // 用户明确取消登录，允许可选登录场景继续游客流程。
  cancelLogin() {
    this.resetLoginState('cancel');
  }

  // 关闭登录弹窗，用于页面隐藏、弹窗覆盖或退出登录，不代表用户主动选择暂不登录。
  closeLogin() {
    this.resetLoginState('superseded');
  }

  // 写入待展示新人礼，登录弹窗关闭后由全局新人礼弹窗消费。
  showNewUserGift(gift?: BffNewUserGiftSummary | null) {
    const giftItems = gift?.giftItems || [];
    const issuedCouponCount = Math.max(
      gift?.couponNos?.filter(Boolean).length || 0,
      giftItems.filter((item) => item.couponNo).length,
    );
    if (!gift?.activityId || !gift.recordId || giftItems.length !== 3 || issuedCouponCount < 3) return;
    this.newUserGift = gift;
    this.newUserGiftVisible = true;
  }

  // 清理新人礼弹窗状态，避免重复展示同一份登录响应。
  clearNewUserGift() {
    this.newUserGiftVisible = false;
    this.newUserGift = undefined;
  }

  // 完成登录流程并取出待续执行动作，确保所有页面登录弹窗同步关闭。
  finishLogin() {
    const callback = this.loginSuccessCallback;
    const resolve = this.loginResolve;
    this.loginVisible = false;
    this.loginSuccessCallback = undefined;
    this.loginResolve = undefined;
    resolve?.('success');
    return callback;
  }

  // 完成登录并立即续执行缓存动作，避免调用方只关闭弹窗却遗漏登录前动作。
  completeLogin() {
    const callback = this.finishLogin();
    const result = callback?.();
    if (result && typeof result.catch === 'function') {
      result.catch(() => undefined);
    }
  }

  // 重置登录弹窗状态，并按需通知等待中的登录守卫。
  private resetLoginState(result?: LoginRequestResult) {
    const resolve = this.loginResolve;
    this.loginVisible = false;
    this.loginSuccessCallback = undefined;
    this.loginResolve = undefined;
    if (result) resolve?.(result);
  }
}
