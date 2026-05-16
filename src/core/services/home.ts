import { request } from '@/core/request';
import type { CouponUsedCountResponse } from '@/core/types/home';

// 获取用户已使用优惠券数量，失败返回 0，不影响首页主流程渲染。
export function fetchCouponUsedCount() {
  return new Promise<number>((resolve) => {
    request<CouponUsedCountResponse>({
      url: '/coupon/applet/used/count',
      method: 'GET',
      showErrorToast: false,
    })
      .then((response) => {
        if (!response) {
          resolve(0);
          return;
        }

        if (typeof response === 'number') {
          resolve(response);
          return;
        }

        resolve(response.count ?? response.usedCount ?? response.total ?? 0);
      })
      .catch(() => {
        resolve(0);
      });
  });
}
