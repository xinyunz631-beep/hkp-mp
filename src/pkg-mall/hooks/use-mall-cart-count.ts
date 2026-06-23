import { useCallback, useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { isLoggedIn } from '@/core/services/auth';
import {
  fetchMallCartCount,
  fetchMallCartSummary,
  MALL_CART_COUNT_CHANGE_EVENT,
  type MallCartCountData,
} from '@/pkg-mall/services/cart';

interface UseMallCartCountOptions {
  includeAmount?: boolean;
}

const emptyCartSummary: MallCartCountData = {
  totalQuantity: 0,
  totalAmount: 0,
};

// 订阅购物车数量变化，必要时拉取完整购物车汇总金额。
export function useMallCartCount(options: UseMallCartCountOptions = {}) {
  const { includeAmount = false } = options;
  const [cartSummary, setCartSummary] = useState<MallCartCountData>(emptyCartSummary);

  const refreshCartCount = useCallback(async () => {
    const nextData = includeAmount && isLoggedIn() ? await fetchMallCartSummary() : await fetchMallCartCount();
    setCartSummary(nextData);
    return nextData;
  }, [includeAmount]);

  useEffect(() => {
    const handleCartCountChange = (payload?: MallCartCountData) => {
      if (typeof payload?.totalQuantity === 'number') {
        setCartSummary((currentValue) => ({
          totalQuantity: payload.totalQuantity,
          totalAmount: typeof payload.totalAmount === 'number' ? payload.totalAmount : currentValue.totalAmount,
        }));
        return;
      }

      void refreshCartCount();
    };

    Taro.eventCenter.on(MALL_CART_COUNT_CHANGE_EVENT, handleCartCountChange);
    return () => {
      Taro.eventCenter.off(MALL_CART_COUNT_CHANGE_EVENT, handleCartCountChange);
    };
  }, [refreshCartCount]);

  useDidShow(() => {
    void refreshCartCount();
  });

  return {
    cartCount: cartSummary.totalQuantity,
    cartAmount: cartSummary.totalAmount,
    refreshCartCount,
  };
}
