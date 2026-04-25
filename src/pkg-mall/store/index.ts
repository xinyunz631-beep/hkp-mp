import { makeAutoObservable } from 'mobx';

export class MallStore {
  ready = false;

  // 初始化商城分包 store，并让 MobX 自动追踪分包状态。
  constructor() {
    makeAutoObservable(this);
  }

  // 标记商城分包已完成基础初始化。
  markReady() {
    this.ready = true;
  }
}

export const mallStore = new MallStore();
