import { makeAutoObservable } from 'mobx';

export class OrderStore {
  ready = false;

  // 初始化订单分包 store，并让 MobX 自动追踪分包状态。
  constructor() {
    makeAutoObservable(this);
  }

  // 标记订单分包已完成基础初始化。
  markReady() {
    this.ready = true;
  }
}

export const orderStore = new OrderStore();
