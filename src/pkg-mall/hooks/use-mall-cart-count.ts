import { useCallback, useEffect, useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import {
  fetchMallCartCount,
  MALL_CART_COUNT_CHANGE_EVENT,
  type MallCartCountData,
} from '@/pkg-mall/services/cart';

export function useMallCartCount() {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    const nextData = await fetchMallCartCount();
    setCartCount(nextData.totalQuantity);
    return nextData.totalQuantity;
  }, []);

  useEffect(() => {
    const handleCartCountChange = (payload?: MallCartCountData) => {
      if (typeof payload?.totalQuantity === 'number') {
        setCartCount(payload.totalQuantity);
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
    cartCount,
    refreshCartCount,
  };
}
