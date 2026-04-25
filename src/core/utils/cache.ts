import Taro from '@tarojs/taro';

// 写入本地缓存，统一隔离 Taro 存储 API。
export function setCache<TValue>(key: string, value: TValue) {
  Taro.setStorageSync(key, value);
}

// 读取本地缓存，读取失败时返回 undefined 避免调用方重复处理异常。
export function getCache<TValue>(key: string): TValue | undefined {
  try {
    return Taro.getStorageSync<TValue>(key);
  } catch {
    return undefined;
  }
}

// 删除本地缓存，用于退出登录或业务状态重置。
export function removeCache(key: string) {
  Taro.removeStorageSync(key);
}
