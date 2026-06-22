import { request } from '@/core/request';
import type { BffNewUserGiftSummary } from '@/core/services/bff-api';

export interface BffNewUserGiftConfirmPayload {
  recordId: string;
  action: 'shown' | 'closed';
}

export interface BffNewUserGiftConfirmResponse {
  popupStatus: string;
  confirmedAt?: string;
}

// 查询当前会员仍待展示的新人礼，支撑登录响应丢失和冷启动恢复。
export function fetchBffNewUserGift() {
  return request<BffNewUserGiftSummary | null>({
    url: '/api/bff/member/new-user-gift',
    method: 'GET',
    showErrorToast: false,
  });
}

// 回写新人礼到账弹窗展示/关闭状态，后端需要幂等更新后台触发记录。
export function confirmBffNewUserGift(activityId: string, data: BffNewUserGiftConfirmPayload) {
  return request<BffNewUserGiftConfirmResponse, BffNewUserGiftConfirmPayload>({
    url: `/api/bff/member/new-user-gift/${encodeURIComponent(activityId)}/confirm`,
    method: 'POST',
    data,
    sign: true,
    showErrorToast: false,
  });
}
