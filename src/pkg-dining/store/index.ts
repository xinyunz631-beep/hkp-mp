import { makeAutoObservable } from 'mobx';

export class DiningStore {
  ready = false;

  // 初始化点餐分包 store，并让 MobX 自动追踪分包状态。
  constructor() {
    makeAutoObservable(this);
  }

  // 标记点餐分包已完成基础初始化。
  markReady() {
    this.ready = true;
  }
}

export const diningStore = new DiningStore();
