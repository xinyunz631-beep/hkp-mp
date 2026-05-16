import { resolveMockData } from '@/core/services/mock';
import { orderList } from './mock-data';

// 获取取消订单页面数据，后续接真实接口时在这里处理字段归一和失败兜底。
export function fetchCancelData() {
  return resolveMockData({
    order: orderList[0],
    reasons: ['行程变化', '重复购买', '信息填写错误'],
  });
}
