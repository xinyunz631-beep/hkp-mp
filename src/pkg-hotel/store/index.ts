import { makeAutoObservable } from 'mobx';

export class HotelStore {
  ready = false;

  // 初始化酒店分包 store，并让 MobX 自动追踪分包状态。
  constructor() {
    makeAutoObservable(this);
  }

  // 标记酒店分包已完成基础初始化。
  markReady() {
    this.ready = true;
  }
}

export const hotelStore = new HotelStore();
