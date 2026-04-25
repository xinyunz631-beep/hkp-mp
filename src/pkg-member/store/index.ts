import { makeAutoObservable } from 'mobx';

export class MemberStore {
  ready = false;

  // 初始化会员分包 store，并让 MobX 自动追踪分包状态。
  constructor() {
    makeAutoObservable(this);
  }

  // 标记会员分包已完成基础初始化。
  markReady() {
    this.ready = true;
  }
}

export const memberStore = new MemberStore();
