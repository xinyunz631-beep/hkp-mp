import { request } from '@/core/request';
import type { HomeSummary } from '@/core/types/home';

// 获取首页核心数据，保持主包只请求轻量聚合信息。
export function fetchHomeSummary() {
  return request<HomeSummary>({
    url: '/home/summary',
    method: 'GET',
  });
}

// 获取当前园区上下文，用于页面展示和请求头注入。
export async function fetchCurrentPark() {
  return request<{ id: string; name: string; businessDate: string }>({
    url: '/park/current',
    method: 'GET',
  });
}
