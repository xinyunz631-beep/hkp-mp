import Taro from '@tarojs/taro';
import { getRuntimeConfig } from '@/core/config/runtime';
import { showCurrentPageLoading } from '@/core/runtime/page-loading';
import { rootStore } from '@/core/store';
import type { LoginUserProfile } from '@/core/types/auth';
import { getCurrentMiniProgramAppId, getWechatLoginCode } from '@/core/wechat/auth';

export interface RequestOptions<TData = unknown> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: TData;
  header?: Record<string, string>;
  showLoading?: boolean;
  showErrorToast?: boolean;
  skipAuth?: boolean;
}

export interface ApiResponse<TData> {
  code?: number | string;
  message?: string;
  msg?: string;
  data?: TData;
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

interface TokenResponseShape {
  CSESSION?: string;
  csession?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  mobile?: string;
  id?: string;
  nickname?: string;
  avatarUrl?: string;
  levelName?: string;
  points?: number;
  user?: Partial<LoginUserProfile>;
  member?: Partial<LoginUserProfile>;
  data?: TokenResponseShape | string;
}

interface NormalizedApiResponse<TData> {
  success: boolean;
  code?: number | string;
  message: string;
  data: TData;
}

let csessionPromise: Promise<string> | undefined;
let hasBootstrappedCsession = false;

// 判断是否是完整 URL，兼容个别接口需要直连完整地址。
function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

// 从 V2 授权接口响应中提取 CSESSION，兼容常见 token 字段命名。
function extractCsessionToken(payload: TokenResponseShape | string | undefined, headers?: Record<string, unknown>): string | undefined {
  const headerToken = headers?.CSESSION || headers?.csession || headers?.Csession;
  if (typeof headerToken === 'string') return headerToken;
  if (!payload) return undefined;
  if (typeof payload === 'string') return payload;

  const directToken = payload.CSESSION || payload.csession || payload.token || payload.accessToken || payload.access_token;
  if (directToken) return directToken;

  return extractCsessionToken(payload.data);
}

// 从 V2 授权接口响应中提取会员资料，mobile 有值才会被视为已登录。
function extractAuthProfile(payload: TokenResponseShape | string | undefined): Partial<LoginUserProfile> | undefined {
  if (!payload || typeof payload === 'string') return undefined;

  const profile = payload.user || payload.member || payload;
  if (profile.mobile) return profile;

  return extractAuthProfile(payload.data);
}

// 兼容真实接口 code/msg 与旧统一响应 code/message 的差异。
function normalizeApiResponse<TData>(payload: ApiResponse<TData> | TData): NormalizedApiResponse<TData> {
  if (!payload || typeof payload !== 'object' || !('code' in payload)) {
    return {
      success: true,
      message: 'success',
      data: payload as TData,
    };
  }

  const response = payload as ApiResponse<TData>;
  const code = response.code;
  const success = code === 200 || code === '200' || code === 0 || code === '0';

  return {
    success,
    code,
    message: response.message || response.msg || '业务请求失败',
    data: response.data as TData,
  };
}

// 请求微信小程序 V2 授权接口，成功后写入后续请求使用的 CSESSION。
async function requestCsessionToken() {
  const config = getRuntimeConfig();
  const code = await getWechatLoginCode();
  const appid = getCurrentMiniProgramAppId(config.appIdFallback);
  const response = await Taro.request<TokenResponseShape>({
    url: config.tokenUrl,
    method: 'POST',
    data: { appid, code },
    header: {
      'content-type': 'application/json',
    },
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new ApiRequestError(`授权失败：${response.statusCode}`, { statusCode: response.statusCode });
  }

  const token = extractCsessionToken(response.data, response.header);
  if (!token) {
    throw new ApiRequestError('授权失败：缺少 CSESSION');
  }

  rootStore.member.setCsession(token);
  rootStore.member.setProfileFromAuth(extractAuthProfile(response.data));
  hasBootstrappedCsession = true;
  return token;
}

// 确保后端 CSESSION 已就绪；并发请求共用同一个 Promise 排队等待。
export function ensureCsession(forceRefresh = false) {
  if (!forceRefresh && hasBootstrappedCsession && rootStore.member.csession) return Promise.resolve(rootStore.member.csession);
  if (csessionPromise) return csessionPromise;

  csessionPromise = requestCsessionToken().finally(() => {
    csessionPromise = undefined;
  });

  return csessionPromise;
}

// 小程序启动时提前触发 V2 授权，后续普通接口会等待同一个 Promise。
export function bootstrapCsession() {
  return ensureCsession(true);
}

// 组装业务请求头，默认只注入后端约定的 CSESSION。
function buildHeaders(extra?: Record<string, string>, csession?: string) {
  const headers: Record<string, string> = {
    ...extra,
  };

  if (csession) {
    headers.CSESSION = csession;
  }

  return headers;
}

// 处理鉴权失效，清理本地登录态并拉起全局登录弹窗。
function handleUnauthorized() {
  rootStore.member.clearMember();
  csessionPromise = undefined;
  hasBootstrappedCsession = false;
  rootStore.app.openLogin('登录状态已过期，请重新登录');
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
  const shouldSkipAuth = options.skipAuth === true;
  const closePageLoading = shouldShowLoading ? showCurrentPageLoading() : undefined;

  try {
    const csession = shouldSkipAuth ? undefined : await ensureCsession();

    const response = await Taro.request<ApiResponse<TResponse> | TResponse>({
      url: isAbsoluteUrl(options.url) ? options.url : `${config.apiHost}${options.url}`,
      method,
      data: options.data,
      header: buildHeaders(options.header, csession),
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
      if (response.statusCode === 401) handleUnauthorized();
      throw new ApiRequestError(`请求失败：${response.statusCode}`, { statusCode: response.statusCode });
    }

    const normalizedResponse = normalizeApiResponse<TResponse>(response.data);
    if (!normalizedResponse.success) {
      if (normalizedResponse.code === 401 || normalizedResponse.code === '401' || normalizedResponse.code === '10008') {
        handleUnauthorized();
      }
      throw new ApiRequestError(normalizedResponse.message, { code: Number(normalizedResponse.code) });
    }

    return normalizedResponse.data;
  } catch (error) {
    if (options.showErrorToast !== false) showRequestErrorToast(error);
    throw error;
  } finally {
    closePageLoading?.();
  }
}
