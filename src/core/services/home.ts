import { request } from '@/core/request';
import type { CouponUsedCountResponse } from '@/core/types/home';

// 获取用户已使用优惠券数量，首页首屏用于验证真实业务接口链路。
export function fetchCouponUsedCount() {
  return request<CouponUsedCountResponse>({
    url: '/coupon/applet/used/count',
    method: 'GET',
  });
}
