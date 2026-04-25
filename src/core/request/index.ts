import Taro from '@tarojs/taro';
import { getRuntimeConfig } from '@/core/config/runtime';
import { rootStore } from '@/core/store';

export interface RequestOptions<TData = unknown> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: TData;
  header?: Record<string, string>;
}

export interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

// 组装请求头，统一注入鉴权与园区上下文。
function buildHeaders(extra?: Record<string, string>) {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...extra,
  };

  if (rootStore.session.token) {
    headers.Authorization = `Bearer ${rootStore.session.token}`;
  }

  if (rootStore.park.currentParkId) {
    headers['x-park-id'] = rootStore.park.currentParkId;
  }

  return headers;
}

// 发起业务接口请求，保持主包核心请求层轻量且无业务域耦合。
export async function request<TResponse, TData = unknown>(
  options: RequestOptions<TData>,
): Promise<TResponse> {
  const config = getRuntimeConfig();
  const response = await Taro.request<ApiResponse<TResponse>>({
    url: `${config.apiBaseUrl}${options.url}`,
    method: options.method ?? 'GET',
    data: options.data,
    header: buildHeaders(options.header),
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`请求失败：${response.statusCode}`);
  }

  if (response.data.code !== 0) {
    throw new Error(response.data.message || '业务请求失败');
  }

  return response.data.data;
}
