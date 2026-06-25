import { MINI_STORAGE_KEYS } from '@/core/constants/storage';
import { getCache, removeCache, setCache } from '@/core/utils/cache';

export interface TicketBookingRefreshSignal {
  orderNo?: string;
  draftId?: string;
  updatedAt: string;
}

// 标记门票订单已完成，预订页返回显示时刷新库存和状态并清空已选数量。
export function markTicketBookingRefreshNeeded(payload: { orderNo?: string; draftId?: string }) {
  setCache<TicketBookingRefreshSignal>(MINI_STORAGE_KEYS.ticketBookingRefreshSignal, {
    ...payload,
    updatedAt: new Date().toISOString(),
  });
}

// 只读取刷新信号，不立即删除；刷新失败时保留信号供下次 onShow 重试。
export function readTicketBookingRefreshSignal() {
  return getCache<TicketBookingRefreshSignal>(MINI_STORAGE_KEYS.ticketBookingRefreshSignal);
}

// 预订页刷新成功后再清除信号，避免接口失败时丢掉应刷新状态。
export function clearTicketBookingRefreshSignal() {
  removeCache(MINI_STORAGE_KEYS.ticketBookingRefreshSignal);
}
