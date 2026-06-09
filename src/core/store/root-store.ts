import { AppStore } from './app-store';
import { MemberStore } from './member-store';
import { ParkStore } from './park-store';

export class RootStore {
  app = new AppStore();
  member = new MemberStore();
  park = new ParkStore();

  // 连接全局登录态与运行时弹窗 store，保证已登录时任何入口都不能打开登录弹窗。
  constructor() {
    this.app.setLoginStateResolver(() => this.isLoggedIn);
  }

  // 暴露全局会员登录态快捷入口，页面和组件可直接通过 rootStore.isLoggedIn 使用。
  get isLoggedIn() {
    return this.member.isLoggedIn;
  }

  // 暴露全局会员资料快捷入口，头像昵称等用户信息统一从这里渲染。
  get memberInfo() {
    return this.member.memberInfo;
  }
}

export const rootStore = new RootStore();
