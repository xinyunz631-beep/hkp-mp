import { makeAutoObservable } from 'mobx';

export class AppStore {
  loginVisible = false;
  loginReason = '登录后可继续使用该服务';
  loginSuccessCallback?: () => void;
  loginResolve?: (success: boolean) => void;

  // 初始化应用运行时 store，并让 MobX 自动追踪登录弹窗状态。
  constructor() {
    makeAutoObservable(this, {
      loginSuccessCallback: false,
      loginResolve: false,
    });
  }

  // 打开登录弹窗，登录态为全局事实源，所有页面宿主共享同一份弹窗状态。
  openLogin(reason = '登录后可继续使用该服务', onSuccess?: () => void) {
    this.resetLoginState(false);
    this.loginReason = reason;
    this.loginSuccessCallback = onSuccess;
    this.loginVisible = true;
  }

  // 请求登录，返回 Promise 方便页面事件方法里 await 拦截。
  requestLogin(reason = '登录后可继续使用该服务') {
    this.openLogin(reason);
    return new Promise<boolean>((resolve) => {
      this.loginResolve = resolve;
    });
  }

  // 关闭登录弹窗，用于页面隐藏、用户取消或退出登录。
  closeLogin() {
    this.resetLoginState(false);
  }

  // 完成登录流程并取出待续执行动作，确保所有页面登录弹窗同步关闭。
  finishLogin() {
    const callback = this.loginSuccessCallback;
    const resolve = this.loginResolve;
    this.loginVisible = false;
    this.loginSuccessCallback = undefined;
    this.loginResolve = undefined;
    resolve?.(true);
    return callback;
  }

  // 重置登录弹窗状态，并按需通知等待中的登录守卫。
  private resetLoginState(result?: boolean) {
    const resolve = this.loginResolve;
    this.loginVisible = false;
    this.loginSuccessCallback = undefined;
    this.loginResolve = undefined;
    if (typeof result === 'boolean') resolve?.(result);
  }
}
