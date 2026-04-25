import { makeAutoObservable } from 'mobx';

export class ParkStore {
  currentParkId = '';

  // 初始化园区 store，并让 MobX 自动追踪当前园区字段。
  constructor() {
    makeAutoObservable(this);
  }

  // 切换当前园区上下文，供请求头和跨域页面读取。
  setCurrentParkId(parkId: string) {
    this.currentParkId = parkId;
  }
}
