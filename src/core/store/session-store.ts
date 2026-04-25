import { makeAutoObservable } from 'mobx';
import { getCache, removeCache, setCache } from '@/core/utils/cache';
import type { LoginUserProfile } from '@/core/types/auth';

const SESSION_CACHE_KEY = 'hkitty-mini-session';

export interface SessionSnapshot {
  token: string;
  user: LoginUserProfile;
}

export class SessionStore {
  token = '';
  user?: LoginUserProfile;

  // 初始化登录态 store，并让 MobX 自动追踪字段和 action。
  constructor() {
    makeAutoObservable(this);
    this.restoreSession();
  }

  // 判断当前是否已登录，用于页面和登录弹窗统一鉴权。
  get isLoggedIn() {
    return Boolean(this.token && this.user);
  }

  // 同步登录态，用于主包和业务分包读取用户基础信息。
  setSession(token: string, user: LoginUserProfile) {
    this.token = token;
    this.user = user;
    setCache<SessionSnapshot>(SESSION_CACHE_KEY, { token, user });
  }

  // 清空登录态，用于退出登录或鉴权失效后的全局状态回收。
  clearSession() {
    this.token = '';
    this.user = undefined;
    removeCache(SESSION_CACHE_KEY);
  }

  // 从本地缓存恢复登录态，避免每次进入小程序都重复登录。
  restoreSession() {
    const snapshot = getCache<SessionSnapshot>(SESSION_CACHE_KEY);
    if (!snapshot?.token || !snapshot.user) return;

    this.token = snapshot.token;
    this.user = snapshot.user;
  }
}
