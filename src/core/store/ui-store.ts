import { makeAutoObservable } from 'mobx';

export class UiStore {
  loadingCount = 0;
  loginVisible = false;
  loginReason = '登录后可继续使用该服务';
  loginSuccessCallback?: () => void;

  // 初始化 UI store，并让 MobX 自动追踪 loading 和登录弹窗状态。
  constructor() {
    makeAutoObservable(this, {
      loginSuccessCallback: false,
    });
  }

  // 打开全局 loading，多个请求并发时通过计数避免提前关闭。
  showLoading() {
    this.loadingCount += 1;
  }

  // 关闭全局 loading，保证计数不会低于零。
  hideLoading() {
    this.loadingCount = Math.max(0, this.loadingCount - 1);
  }

  // 打开登录弹窗，供任意页面按钮触发。
  openLogin(reason = '登录后可继续使用该服务', onSuccess?: () => void) {
    this.loginReason = reason;
    this.loginSuccessCallback = onSuccess;
    this.loginVisible = true;
  }

  // 关闭登录弹窗，用于登录成功或用户取消。
  closeLogin() {
    this.loginVisible = false;
    this.loginSuccessCallback = undefined;
  }

  // 完成登录流程并取出待续执行动作，避免页面重复监听登录状态。
  finishLogin() {
    const callback = this.loginSuccessCallback;
    this.loginVisible = false;
    this.loginSuccessCallback = undefined;
    return callback;
  }
}
