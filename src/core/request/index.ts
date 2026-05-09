import Taro from '@tarojs/taro';
import { getRuntimeConfig } from '@/core/config/runtime';
import { rootStore } from '@/core/store';
import { hasMockHandler, mockRequest } from '@/core/mock/api';

export interface RequestOptions<TData = unknown> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: TData;
  header?: Record<string, string>;
  showLoading?: boolean;
  showErrorToast?: boolean;
}

export interface ApiResponse<TData> {
  code: number;
  message: string;
  data: TData;
}

export class ApiRequestError extends Error {
  code?: number;
  statusCode?: number;

  // 记录接口错误上下文，方便页面和日志系统区分网络错误与业务错误。
  constructor(message: string, options: { code?: number; statusCode?: number } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = options.code;
    this.statusCode = options.statusCode;
  }
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

// 处理鉴权失效，清理本地登录态并拉起全局登录弹窗。
function handleUnauthorized() {
  rootStore.session.clearSession();
  rootStore.ui.openLogin('登录状态已过期，请重新登录');
}

// 输出用户可理解的错误提示，避免页面重复写 toast。
function showRequestErrorToast(error: unknown) {
  const message = error instanceof Error ? error.message : '网络异常，请稍后再试';
  Taro.showToast({
    title: message,
    icon: 'none',
    duration: 2200,
  });
}

// 发起业务接口请求，保持主包核心请求层轻量且无业务域耦合。
export async function request<TResponse, TData = unknown>(
  options: RequestOptions<TData>,
): Promise<TResponse> {
  const config = getRuntimeConfig();
  const method = options.method ?? 'GET';
  const shouldShowLoading = options.showLoading !== false;

  if (shouldShowLoading) rootStore.ui.showLoading();

  try {
    if (config.env === 'development' && hasMockHandler(method, options.url)) {
      return await mockRequest<TResponse, TData>({ ...options, method });
    }

    const response = await Taro.request<ApiResponse<TResponse>>({
      url: `${config.apiBaseUrl}${options.url}`,
      method,
      data: options.data,
      header: buildHeaders(options.header),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode === 401) handleUnauthorized();
      throw new ApiRequestError(`请求失败：${response.statusCode}`, { statusCode: response.statusCode });
    }

    if (response.data.code !== 0) {
      if (response.data.code === 401) handleUnauthorized();
      throw new ApiRequestError(response.data.message || '业务请求失败', { code: response.data.code });
    }

    return response.data.data;
  } catch (error) {
    if (options.showErrorToast !== false) showRequestErrorToast(error);
    throw error;
  } finally {
    if (shouldShowLoading) rootStore.ui.hideLoading();
  }
}
