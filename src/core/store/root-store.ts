import { AppStore } from './app-store';
import { MemberStore } from './member-store';
import { ParkStore } from './park-store';

export class RootStore {
  app = new AppStore();
  member = new MemberStore();
  park = new ParkStore();

  // 连接全局登录态与运行时弹窗 store，保证已登录时任何入口都不能打开登录弹窗。
  constructor() {
    this.app.setLoginStateResolver(() => this.member.isLoggedIn);
  }
}

export const rootStore = new RootStore();
