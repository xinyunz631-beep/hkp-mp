import { makeAutoObservable } from 'mobx';

export interface UserProfile {
  id: string;
  nickname: string;
}

export class SessionStore {
  token = '';
  user?: UserProfile;

  // 初始化登录态 store，并让 MobX 自动追踪字段和 action。
  constructor() {
    makeAutoObservable(this);
  }

  // 同步登录态，用于主包和业务分包读取用户基础信息。
  setSession(token: string, user: UserProfile) {
    this.token = token;
    this.user = user;
  }

  // 清空登录态，用于退出登录或鉴权失效后的全局状态回收。
  clearSession() {
    this.token = '';
    this.user = undefined;
  }
}
