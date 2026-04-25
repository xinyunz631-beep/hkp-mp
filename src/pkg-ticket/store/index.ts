import { makeAutoObservable } from 'mobx';

export class TicketStore {
  ready = false;

  // 初始化票务分包 store，并让 MobX 自动追踪分包状态。
  constructor() {
    makeAutoObservable(this);
  }

  // 标记票务分包已完成基础初始化。
  markReady() {
    this.ready = true;
  }
}

export const ticketStore = new TicketStore();
