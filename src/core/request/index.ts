import Taro from '@tarojs/taro';
import { getRuntimeConfig } from '@/core/config/runtime';
import { rootStore } from '@/core/store';
import { getCurrentMiniProgramAppId, getWechatLoginCode } from '@/core/wechat/auth';

export interface RequestOptions<TData = unknown> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  data?: TData;
  header?: Record<string, string>;
  auth?: RequestAuthMode | RequestAuthOptions;
  retry?: RequestRetryOptions;
  responseMode?: RequestResponseMode;
  showErrorToast?: boolean;
  // 兼容旧调用，等价于 auth: 'none'。
  skipAuth?: boolean;
}

export type RequestAuthMode = 'required' | 'optional' | 'none';

export type RequestResponseMode = 'business' | 'raw';

export interface RequestAuthOptions {
  mode?: RequestAuthMode;
  forceRefresh?: boolean;
}

export interface RequestRetryOptions {
  maxAttempts?: number;
  delayMs?: number;
}

export type ApiBusinessCode = number | string;

export interface ApiResponse<TData> {
  code?: ApiBusinessCode;
  message?: string;
  msg?: string;
  data?: TData;
}

export enum HttpStatusCode {
  Ok = 200,
  MultipleChoices = 300,
  Unauthorized = 401,
  NotFound = 404,
}

export enum BusinessResponseCode {
  Success = 200,
  ZeroSuccess = 0,
  Unauthorized = 401,
  CredentialExpired = 10008,
}

export class ApiRequestError extends Error {
  code?: ApiBusinessCode;
  statusCode?: number;
  retryable: boolean;

  // 记录接口错误上下文，方便页面和日志系统区分网络错误与业务错误。
  constructor(message: string, options: { code?: ApiBusinessCode; statusCode?: number; retryable?: boolean } = {}) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.retryable = options.retryable ?? true;
  }
}

interface TokenResponseShape {
  code?: ApiBusinessCode;
  message?: string;
  msg?: string;
  CSESSION?: string;
  csession?: string;
  token?: string;
  accessToken?: string;
  access_token?: string;
  data?: TokenResponseShape | string;
}

interface NormalizedApiResponse<TData> {
  success: boolean;
  code?: ApiBusinessCode;
  message: string;
  data: TData;
}

type TokenRequestResponse = TokenResponseShape | ApiResponse<TokenResponseShape | string> | string;

type RequestResponseValidator<TResponse> = (response: ApiTransportResponse<TResponse>) => ApiRequestError | undefined;
type RequestDataFactory<TData> = () => TData | Promise<TData>;

interface InternalRequestOptions<TData = unknown, TResponse = unknown> extends RequestOptions<TData> {
  validateResponse?: RequestResponseValidator<TResponse>;
  createData?: RequestDataFactory<TData>;
}

interface ResolvedRequestAuthOptions {
  mode: RequestAuthMode;
  forceRefresh: boolean;
}

interface PreparedRequest<TData = unknown, TResponse = unknown> {
  url: string;
  method: NonNullable<RequestOptions<TData>['method']>;
  data?: TData;
  createData?: RequestDataFactory<TData>;
  header: Record<string, string>;
  retry: ResolvedRequestRetryOptions;
  responseMode: RequestResponseMode;
  validateResponse?: RequestResponseValidator<TResponse>;
}

interface ApiRequestResult<TResponse> {
  response: ApiTransportResponse<TResponse>;
}

interface ApiTransportResponse<TResponse> {
  data: TResponse;
  header: Record<string, unknown>;
  statusCode: number;
}

interface ResolvedRequestRetryOptions {
  maxAttempts: number;
  delayMs: number;
}

const DEFAULT_REQUEST_MAX_ATTEMPTS = 1;
const AUTH_REQUEST_MAX_ATTEMPTS = 3;
const REQUEST_MAX_ATTEMPTS_LIMIT = 5;
const REQUEST_RETRY_DELAY_MS = 1000;
const AUTH_MODES_WITHOUT_TOKEN = new Set<RequestAuthMode>(['none']);
const BUSINESS_SUCCESS_CODES = new Set<ApiBusinessCode>([
  BusinessResponseCode.Success,
  String(BusinessResponseCode.Success),
  BusinessResponseCode.ZeroSuccess,
  String(BusinessResponseCode.ZeroSuccess),
  '000',
]);

// 判断是否是完整 URL，兼容个别接口需要直连完整地址。
function isAbsoluteUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

// 判断 HTTP 状态码是否为网络层成功。
function isHttpSuccessStatus(statusCode: number) {
  return statusCode >= HttpStatusCode.Ok && statusCode < HttpStatusCode.MultipleChoices;
}

// 判断接口业务 code 是否为成功，兼容数字和字符串格式。
function isBusinessSuccessCode(code?: ApiBusinessCode) {
  return typeof code !== 'undefined' && BUSINESS_SUCCESS_CODES.has(code);
}

// 判断接口业务 code 是否为请求凭证失效。
function isCredentialInvalidBusinessCode(code?: ApiBusinessCode) {
  return code == BusinessResponseCode.Unauthorized || code == BusinessResponseCode.CredentialExpired;
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

// 兼容真实接口 code/msg 与旧统一响应 code/message 的差异。
function normalizeApiResponse<TData>(
  payload: ApiResponse<TData> | TData,
  responseMode: RequestResponseMode,
): NormalizedApiResponse<TData> {
  if (responseMode === 'raw') {
    return {
      success: true,
      message: 'success',
      data: payload as TData,
    };
  }

  if (!payload || typeof payload !== 'object' || !('code' in payload)) {
    return {
      success: false,
      message: '业务响应格式异常',
      data: payload as TData,
    };
  }

  const response = payload as ApiResponse<TData>;
  const code = response.code;
  const success = isBusinessSuccessCode(code);

  return {
    success,
    code,
    message: response.message || response.msg || '业务请求失败',
    data: response.data as TData,
  };
}

export class ApiRequestClient {
  private csessionPromise?: Promise<string>;
  private hasBootstrappedCsession = false;

  // 发起业务接口请求，默认等待并携带后端 CSESSION，再归一化业务响应。
  async request<TResponse, TData = unknown>(options: RequestOptions<TData>): Promise<TResponse> {
    try {
      const result = await this.send<ApiResponse<TResponse> | TResponse, TData>(options);
      const response = result.response;
      const responseMode = this.resolveResponseMode(options.responseMode);
      const normalizedResponse = normalizeApiResponse<TResponse>(response.data, responseMode);
      return normalizedResponse.data;
    } catch (error) {
      const credentialInvalid = this.isCredentialInvalidError(error);
      if (credentialInvalid) this.handleCredentialInvalid();
      if (!credentialInvalid && options.showErrorToast !== false) this.showRequestErrorToast(error);
      throw error;
    }
  }

  // 确保后端 CSESSION 已就绪；并发请求共用同一个 Promise 排队等待。
  ensureCsession(forceRefresh = false) {
    if (!forceRefresh && this.hasBootstrappedCsession && rootStore.member.csession) {
      return Promise.resolve(rootStore.member.csession);
    }
    if (this.csessionPromise) return this.csessionPromise;

    this.csessionPromise = this.requestCsessionToken().finally(() => {
      this.csessionPromise = undefined;
    });

    return this.csessionPromise;
  }

  // 小程序启动时提前触发授权，后续普通接口会等待同一个 Promise。
  bootstrapCsession() {
    return this.ensureCsession(true);
  }

  // 统一底层请求出口，授权接口和业务接口都必须经过这里发出。
  private async send<TResponse, TData = unknown>(
    options: InternalRequestOptions<TData, TResponse>,
  ): Promise<ApiRequestResult<TResponse>> {
    const preparedRequest = await this.prepareRequest(options);
    const response = await this.requestWithRetry<TResponse>(preparedRequest);

    return {
      response,
    };
  }

  // 请求微信小程序授权接口，成功后写入后续请求使用的 CSESSION。
  private async requestCsessionToken() {
    const config = getRuntimeConfig();
    const appid = getCurrentMiniProgramAppId(config.appIdFallback);
    const result = await this.send<TokenRequestResponse, { appid: string; code: string }>({
      url: config.tokenUrl,
      method: 'POST',
      createData: async () => ({
        appid,
        code: await getWechatLoginCode(),
      }),
      header: {
        'content-type': 'application/json',
      },
      auth: 'none',
      responseMode: 'raw',
      retry: {
        maxAttempts: AUTH_REQUEST_MAX_ATTEMPTS,
        delayMs: REQUEST_RETRY_DELAY_MS,
      },
      showErrorToast: false,
      validateResponse: this.validateCsessionResponse,
    });
    const response = result.response;

    const token = extractCsessionToken(response.data, response.header);
    if (!token) {
      throw new ApiRequestError('授权失败：缺少 CSESSION');
    }

    rootStore.member.setCsession(token);
    this.hasBootstrappedCsession = true;
    return token;
  }

  // 校验授权接口必须返回可提取的 CSESSION，缺 token 也要进入授权请求自己的重试链路。
  private validateCsessionResponse(response: ApiTransportResponse<TokenRequestResponse>) {
    if (extractCsessionToken(response.data, response.header)) return undefined;
    return new ApiRequestError('授权失败：缺少 CSESSION');
  }

  // 准备一次真实请求所需的 URL、header、token 和重试策略。
  private async prepareRequest<TData = unknown, TResponse = unknown>(
    options: InternalRequestOptions<TData, TResponse>,
  ): Promise<PreparedRequest<TData, TResponse>> {
    const authOptions = this.resolveAuthOptions(options);
    const method = options.method ?? 'GET';
    const url = this.resolveRequestUrl(options.url);
    const retry = this.resolveRetryOptions(options.retry);
    const responseMode = this.resolveResponseMode(options.responseMode);

    const csession = await this.resolveRequestToken(authOptions);

    return {
      url,
      method,
      data: options.data,
      createData: options.createData,
      header: this.buildHeaders(options.header, csession),
      retry,
      responseMode,
      validateResponse: options.validateResponse,
    };
  }

  // 执行真实网络请求；开启重试时只重复本次原始请求，最后一次失败才对外抛错。
  private async requestWithRetry<TResponse, TData = unknown>(preparedRequest: PreparedRequest<TData, TResponse>) {
    let lastError: unknown;
    const { maxAttempts, delayMs } = preparedRequest.retry;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const data = preparedRequest.createData ? await preparedRequest.createData() : preparedRequest.data;
        const response = await Taro.request<TResponse>({
          url: preparedRequest.url,
          method: preparedRequest.method,
          data,
          header: preparedRequest.header,
        });

        const responseError = this.resolveResponseError(response, preparedRequest.responseMode) || preparedRequest.validateResponse?.(response);
        if (responseError) {
          lastError = responseError;
          if (this.shouldRetryRequest(responseError, attempt, maxAttempts)) {
            await this.waitForRetry(delayMs);
            continue;
          }
          break;
        }

        return response;
      } catch (error) {
        lastError = this.normalizeRequestError(error);
      }

      if (this.shouldRetryRequest(lastError, attempt, maxAttempts)) {
        await this.waitForRetry(delayMs);
        continue;
      }

      break;
    }

    throw lastError || new ApiRequestError('网络异常，请稍后再试');
  }

  // 判断响应是否有 HTTP 或业务错误，返回值会决定本次原始请求是否继续重试。
  private resolveResponseError<TResponse>(
    response: ApiTransportResponse<TResponse>,
    responseMode: RequestResponseMode,
  ) {
    const httpError = this.resolveHttpStatusError(response.statusCode);
    if (httpError) return httpError;

    const normalizedResponse = normalizeApiResponse<unknown>(response.data, responseMode);
    if (normalizedResponse.success) return undefined;

    return new ApiRequestError(normalizedResponse.message, {
      code: normalizedResponse.code,
      retryable: !isCredentialInvalidBusinessCode(normalizedResponse.code),
    });
  }

  // 判断 HTTP 状态码是否需要触发本次原始请求重试。
  private resolveHttpStatusError(statusCode: number) {
    if (isHttpSuccessStatus(statusCode)) return undefined;

    const unauthorized = statusCode === HttpStatusCode.Unauthorized;
    const message = unauthorized
      ? '请求凭证已失效'
      : statusCode === HttpStatusCode.NotFound
        ? '请求失败：接口不存在'
        : `请求失败：${statusCode}`;

    return new ApiRequestError(message, {
      statusCode,
      retryable: !unauthorized,
    });
  }

  // 判断接口错误是否属于请求凭证失效，便于 HTTP 与业务 code 共用一套处理。
  private isCredentialInvalidError(error: unknown) {
    if (!(error instanceof ApiRequestError)) return false;
    return error.statusCode === HttpStatusCode.Unauthorized || isCredentialInvalidBusinessCode(error.code);
  }

  // 判断当前失败是否允许继续自动重试，请求凭证失效必须立即失败并交给页面处理。
  private shouldRetryRequest(error: unknown, attempt: number, maxAttempts: number) {
    if (attempt >= maxAttempts) return false;
    if (this.isCredentialInvalidError(error)) return false;
    if (error instanceof ApiRequestError) return error.retryable;
    return true;
  }

  // 归一化 Taro 底层抛出的非 Error 异常，避免 toast 和调用方拿不到可读 message。
  private normalizeRequestError(error: unknown) {
    if (error instanceof Error) return error;

    if (error && typeof error === 'object' && 'errMsg' in error) {
      return new ApiRequestError(String((error as { errMsg?: unknown }).errMsg || '网络异常，请稍后再试'));
    }

    return new ApiRequestError('网络异常，请稍后再试');
  }

  // 归一化每个接口自己的重试配置，默认不自动重试。
  private resolveRetryOptions(retry?: RequestRetryOptions): ResolvedRequestRetryOptions {
    const requestedMaxAttempts = retry?.maxAttempts ?? DEFAULT_REQUEST_MAX_ATTEMPTS;
    const requestedDelayMs = retry?.delayMs ?? REQUEST_RETRY_DELAY_MS;
    const normalizedMaxAttempts = Number.isFinite(requestedMaxAttempts)
      ? Math.floor(requestedMaxAttempts)
      : DEFAULT_REQUEST_MAX_ATTEMPTS;
    const maxAttempts = Math.min(REQUEST_MAX_ATTEMPTS_LIMIT, Math.max(1, normalizedMaxAttempts));
    const delayMs = Number.isFinite(requestedDelayMs) ? Math.max(0, requestedDelayMs) : REQUEST_RETRY_DELAY_MS;

    return {
      maxAttempts,
      delayMs,
    };
  }

  // 归一化响应模式，业务接口默认走强校验，只有明确的原始响应才放行。
  private resolveResponseMode(responseMode?: RequestResponseMode) {
    return responseMode ?? 'business';
  }

  // 每次自动重试之间插入固定间隔，方便用户在网络面板观察请求节奏。
  private waitForRetry(delayMs: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  // 根据请求额外配置判断是否等待 token、是否把 token 注入 header。
  private resolveAuthOptions(options: RequestOptions): ResolvedRequestAuthOptions {
    if (options.skipAuth) {
      return {
        mode: 'none',
        forceRefresh: false,
      };
    }

    if (typeof options.auth === 'string') {
      return {
        mode: options.auth,
        forceRefresh: false,
      };
    }

    return {
      mode: options.auth?.mode ?? 'required',
      forceRefresh: options.auth?.forceRefresh ?? false,
    };
  }

  // 按请求配置取出本次请求要写入 header 的 CSESSION。
  private async resolveRequestToken(authOptions: ResolvedRequestAuthOptions) {
    if (AUTH_MODES_WITHOUT_TOKEN.has(authOptions.mode)) return undefined;
    if (authOptions.mode === 'optional') return rootStore.member.csession || undefined;
    return this.ensureCsession(authOptions.forceRefresh);
  }

  // 组装请求完整地址，保证授权和业务接口共用同一套 host 规则。
  private resolveRequestUrl(url: string) {
    const config = getRuntimeConfig();
    return isAbsoluteUrl(url) ? url : `${config.apiHost}${url}`;
  }

  // 组装请求头，只有调用方配置需要携带 token 时才注入 CSESSION。
  private buildHeaders(extra?: Record<string, string>, csession?: string) {
    const headers: Record<string, string> = {
      ...extra,
    };

    if (csession) {
      headers.CSESSION = csession;
    }

    return headers;
  }

  // 处理请求凭证失效，只回收 CSESSION，其他业务状态交给页面和 service 处理。
  private handleCredentialInvalid() {
    rootStore.member.clearCsession();
    this.csessionPromise = undefined;
    this.hasBootstrappedCsession = false;
  }

  // 输出用户可理解的错误提示，避免页面重复写 toast。
  private showRequestErrorToast(error: unknown) {
    const message = error instanceof Error ? error.message : '网络异常，请稍后再试';
    Taro.showToast({
      title: message,
      icon: 'none',
      duration: 2200,
    });
  }
}

export const apiRequestClient = new ApiRequestClient();

// 确保后端 CSESSION 已就绪；保留函数导出兼容现有调用。
export function ensureCsession(forceRefresh = false) {
  return apiRequestClient.ensureCsession(forceRefresh);
}

// 小程序启动时提前触发授权；保留函数导出兼容现有调用。
export function bootstrapCsession() {
  return apiRequestClient.bootstrapCsession();
}

// 发起业务接口请求；保留函数导出兼容现有调用。
export function request<TResponse, TData = unknown>(options: RequestOptions<TData>): Promise<TResponse> {
  return apiRequestClient.request<TResponse, TData>(options);
}
