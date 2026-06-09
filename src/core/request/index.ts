import Taro from '@tarojs/taro';
import { getRuntimeConfig } from '@/core/config/runtime';
import { rootStore } from '@/core/store';
import { createSignatureNonce, hmacSha256Base64Url, sha256Hex } from '@/core/utils/crypto';
import { resolveErrorMessage } from '@/core/utils/error-message';
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
  sign?: boolean;
  // member/status 自身触发 token refresh 时跳过刷新后的额外会员态同步，避免重复请求。
  skipAuthStatusSync?: boolean;
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
  success?: boolean;
  code?: ApiBusinessCode;
  message?: string;
  msg?: string;
  errMsg?: string;
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
  success?: boolean;
  code?: ApiBusinessCode;
  message?: string;
  msg?: string;
  errMsg?: string;
  CSESSION?: string;
  csession?: string;
  token?: string;
  tokenType?: string;
  accessToken?: string;
  access_token?: string;
  expiresIn?: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
  signSecret?: string;
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

interface AuthSessionShape {
  accessToken?: string;
  refreshToken?: string;
  signSecret?: string;
}

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
  sign: boolean;
  retry: ResolvedRequestRetryOptions;
  responseMode: RequestResponseMode;
  validateResponse?: RequestResponseValidator<TResponse>;
  skipAuthStatusSync: boolean;
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
const SIGNED_BODY_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const BUSINESS_SUCCESS_CODES = new Set<ApiBusinessCode>([
  BusinessResponseCode.Success,
  String(BusinessResponseCode.Success),
  BusinessResponseCode.ZeroSuccess,
  String(BusinessResponseCode.ZeroSuccess),
  '000',
  'OK',
]);
const CREDENTIAL_INVALID_BUSINESS_CODES = new Set<string>([
  String(BusinessResponseCode.Unauthorized),
  String(BusinessResponseCode.CredentialExpired),
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_SESSION_EXPIRED',
  'AUTH_TOKEN_LOGGED_OUT',
  'AUTH_REFRESH_TOKEN_MISSING',
  'AUTH_REFRESH_TOKEN_INVALID',
  'AUTH_REFRESH_TOKEN_EXPIRED',
]);
const ACCESS_TOKEN_REFRESHABLE_BUSINESS_CODES = new Set<string>([
  String(BusinessResponseCode.Unauthorized),
  String(BusinessResponseCode.CredentialExpired),
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_TOKEN_SESSION_EXPIRED',
]);

export type AuthSessionChangedSource = 'login' | 'refresh';

let credentialInvalidHandler: (() => void | Promise<void>) | undefined;
let authSessionChangedHandler: ((source: AuthSessionChangedSource) => void | Promise<void>) | undefined;

// 执行外部注册的认证回调，回调失败不影响当前接口请求链路。
function runAuthLifecycleHandler(task?: void | Promise<void>) {
  if (!task || typeof (task as Promise<void>).catch !== 'function') return;
  (task as Promise<void>).catch(() => undefined);
}

// 首次登录后等待会员态同步完成，保证启动默认缓存 memberInfo。
async function waitAuthLifecycleHandler(task?: void | Promise<void>) {
  if (!task || typeof (task as Promise<void>).catch !== 'function') return;

  try {
    await task;
  } catch {
    // token 已写入，会员态失败交给后续页面/业务入口按需重查。
  }
}

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
  return typeof code !== 'undefined' && CREDENTIAL_INVALID_BUSINESS_CODES.has(String(code));
}

// 判断接口业务 code 是否允许通过 refreshToken 轮换 accessToken 后重放请求。
function isAccessTokenRefreshableBusinessCode(code?: ApiBusinessCode) {
  return typeof code !== 'undefined' && ACCESS_TOKEN_REFRESHABLE_BUSINESS_CODES.has(String(code));
}

export function isApiCredentialInvalidError(error: unknown) {
  if (!(error instanceof ApiRequestError)) return false;
  return error.statusCode === HttpStatusCode.Unauthorized || isCredentialInvalidBusinessCode(error.code);
}

// 判断响应体是否像后端统一错误体，HTTP 非 2xx 时只有这种结构才读取后端错误文案。
function hasApiErrorPayload(payload: unknown): payload is ApiResponse<unknown> {
  return Boolean(
    payload
      && typeof payload === 'object'
      && ('code' in payload || 'message' in payload || 'msg' in payload || 'errMsg' in payload),
  );
}

// 从授权接口响应中提取后端访问令牌，兼容旧 CSESSION 和新 BFF accessToken。
function extractAccessToken(payload: TokenResponseShape | string | undefined, headers?: Record<string, unknown>): string | undefined {
  const headerToken = headers?.CSESSION || headers?.csession || headers?.Csession;
  if (typeof headerToken === 'string') return headerToken;
  if (!payload) return undefined;
  if (typeof payload === 'string') return payload;

  const directToken = payload.CSESSION || payload.csession || payload.token || payload.accessToken || payload.access_token;
  if (directToken) return directToken;

  return extractAccessToken(payload.data);
}

// 从授权接口响应中提取完整会话字段，兼容统一响应和旧字段命名。
function extractAuthSession(payload: TokenResponseShape | string | undefined, headers?: Record<string, unknown>): AuthSessionShape {
  if (!payload || typeof payload === 'string') {
    return {
      accessToken: extractAccessToken(payload, headers),
    };
  }

  const nested: AuthSessionShape | undefined = typeof payload.data === 'object' ? extractAuthSession(payload.data, headers) : undefined;

  return {
    accessToken: extractAccessToken(payload, headers),
    refreshToken: payload.refreshToken || nested?.refreshToken,
    signSecret: payload.signSecret || nested?.signSecret,
  };
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
  const success = response.success === true || isBusinessSuccessCode(code);

  return {
    success,
    code,
    message: resolveErrorMessage(response, '业务请求失败'),
    data: response.data as TData,
  };
}

export class ApiRequestClient {
  private csessionPromise?: Promise<string>;
  private authRefreshPromise?: Promise<string>;
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

  // 请求微信小程序授权接口，成功后写入后续请求使用的访问令牌。
  private async requestCsessionToken() {
    const config = getRuntimeConfig();
    const appid = getCurrentMiniProgramAppId(config.appIdFallback);
    const result = await this.send<TokenRequestResponse, { platform: 'WECHAT'; code: string; appId: string }>({
      url: config.tokenUrl,
      method: 'POST',
      createData: async () => ({
        platform: 'WECHAT',
        code: await getWechatLoginCode(),
        appId: appid,
      }),
      header: {
        'content-type': 'application/json',
        'ngrok-skip-browser-warning': '1',
      },
      auth: 'none',
      responseMode: 'raw',
      // retry: {
      //   maxAttempts: AUTH_REQUEST_MAX_ATTEMPTS,
      //   delayMs: REQUEST_RETRY_DELAY_MS,
      // },
      showErrorToast: false,
      validateResponse: (response) => this.validateCsessionResponse(response),
    });
    const response = result.response;

    const authSession = extractAuthSession(response.data, response.header);
    if (!authSession.accessToken) {
      throw new ApiRequestError(resolveErrorMessage(response.data, '授权失败：缺少访问令牌'));
    }

    rootStore.member.setAuthSession({
      accessToken: authSession.accessToken,
      refreshToken: authSession.refreshToken,
      signSecret: authSession.signSecret,
    }, { resetProfile: true });
    this.hasBootstrappedCsession = true;
    await waitAuthLifecycleHandler(authSessionChangedHandler?.('login'));
    return authSession.accessToken;
  }

  // 使用 refreshToken 轮换后端登录态，并让并发过期请求共用同一个刷新 Promise。
  private refreshAuthSession(options: { skipAuthStatusSync?: boolean } = {}) {
    if (this.authRefreshPromise) return this.authRefreshPromise;

    this.authRefreshPromise = this.requestRefreshToken(options).finally(() => {
      this.authRefreshPromise = undefined;
    });

    return this.authRefreshPromise;
  }

  // 调用 BFF 刷新接口，成功后覆盖本地 accessToken、refreshToken 和签名密钥。
  private async requestRefreshToken(options: { skipAuthStatusSync?: boolean } = {}) {
    const refreshToken = rootStore.member.refreshToken;
    if (!refreshToken) {
      throw new ApiRequestError('登录令牌已过期，请重新登录', {
        code: 'AUTH_REFRESH_TOKEN_MISSING',
        retryable: false,
      });
    }

    const result = await this.send<TokenRequestResponse, { refreshToken: string }>({
      url: '/api/bff/auth/refresh',
      method: 'POST',
      data: { refreshToken },
      header: {
        'content-type': 'application/json',
        'ngrok-skip-browser-warning': '1',
      },
      auth: 'none',
      showErrorToast: false,
      validateResponse: (response) => this.validateCsessionResponse(response),
    });

    const authSession = extractAuthSession(result.response.data, result.response.header);
    if (!authSession.accessToken) {
      throw new ApiRequestError(resolveErrorMessage(result.response.data, '刷新登录令牌失败：缺少访问令牌'), {
        retryable: false,
      });
    }

    rootStore.member.setAuthSession({
      accessToken: authSession.accessToken,
      refreshToken: authSession.refreshToken,
      signSecret: authSession.signSecret,
    });
    this.hasBootstrappedCsession = true;
    if (!options.skipAuthStatusSync) {
      runAuthLifecycleHandler(authSessionChangedHandler?.('refresh'));
    }
    return authSession.accessToken;
  }

  // 校验授权接口必须返回可提取的访问令牌，缺 token 也要进入授权请求自己的重试链路。
  private validateCsessionResponse(response: ApiTransportResponse<TokenRequestResponse>) {
    if (extractAccessToken(response.data, response.header)) return undefined;
    return this.resolveRawBusinessError(response.data)
      || new ApiRequestError(resolveErrorMessage(response.data, '授权失败：缺少访问令牌'));
  }

  // raw 授权响应也可能是后端统一错误体，必须优先保留后端 message/msg/errMsg。
  private resolveRawBusinessError(payload: unknown) {
    if (!hasApiErrorPayload(payload)) return undefined;

    const response = payload as ApiResponse<unknown>;
    if (response.success === true || isBusinessSuccessCode(response.code)) return undefined;

    return new ApiRequestError(resolveErrorMessage(response, '授权失败'), {
      code: response.code,
      retryable: !isCredentialInvalidBusinessCode(response.code),
    });
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
      header: this.buildHeaders(options.header, csession, method),
      sign: options.sign === true,
      retry,
      responseMode,
      validateResponse: options.validateResponse,
      skipAuthStatusSync: options.skipAuthStatusSync === true,
    };
  }

  // 执行真实网络请求；开启重试时只重复本次原始请求，最后一次失败才对外抛错。
  private async requestWithRetry<TResponse, TData = unknown>(preparedRequest: PreparedRequest<TData, TResponse>) {
    let lastError: unknown;
    const { maxAttempts, delayMs } = preparedRequest.retry;
    let authRefreshed = false;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const data = preparedRequest.createData ? await preparedRequest.createData() : preparedRequest.data;
        const signedRequest = this.resolveSignedRequest(preparedRequest, data);
        const response = await Taro.request<TResponse>({
          url: preparedRequest.url,
          method: preparedRequest.method,
          data: signedRequest.data as TData,
          header: signedRequest.header,
        });

        const responseError = this.resolveResponseError(response, preparedRequest.responseMode) || preparedRequest.validateResponse?.(response);
        if (responseError) {
          if (this.shouldRefreshAuthForRequest(responseError, preparedRequest, authRefreshed)) {
            await this.applyRefreshedAuthToRequest(preparedRequest);
            authRefreshed = true;
            attempt -= 1;
            continue;
          }

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
        if (this.shouldRefreshAuthForRequest(lastError, preparedRequest, authRefreshed)) {
          await this.applyRefreshedAuthToRequest(preparedRequest);
          authRefreshed = true;
          attempt -= 1;
          continue;
        }
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
    const normalizedResponse = normalizeApiResponse<unknown>(response.data, responseMode);
    const httpError = this.resolveHttpStatusError(response.statusCode, response.data, responseMode);
    if (httpError) return httpError;

    if (normalizedResponse.success) return undefined;

    return new ApiRequestError(normalizedResponse.message, {
      code: normalizedResponse.code,
      retryable: !isCredentialInvalidBusinessCode(normalizedResponse.code),
    });
  }

  // 判断 HTTP 状态码是否需要触发本次原始请求重试。
  private resolveHttpStatusError<TResponse>(
    statusCode: number,
    payload: TResponse,
    responseMode: RequestResponseMode,
  ) {
    if (isHttpSuccessStatus(statusCode)) return undefined;

    const backendError = this.resolveHttpBackendError(payload, responseMode);
    const unauthorized = statusCode === HttpStatusCode.Unauthorized;
    const fallbackMessage = unauthorized
      ? '请求凭证已失效'
      : statusCode === HttpStatusCode.NotFound
        ? '请求失败：接口不存在'
        : `请求失败：${statusCode}`;

    return new ApiRequestError(backendError?.message || fallbackMessage, {
      code: backendError?.code,
      statusCode,
      retryable: !unauthorized && !isCredentialInvalidBusinessCode(backendError?.code),
    });
  }

  // HTTP 错误只解析真实后端错误体，避免 raw 响应把错误文案误归因为 success。
  private resolveHttpBackendError<TResponse>(payload: TResponse, responseMode: RequestResponseMode) {
    if (responseMode === 'raw' && !hasApiErrorPayload(payload)) return undefined;
    if (!hasApiErrorPayload(payload)) return undefined;

    return {
      code: payload.code,
      message: resolveErrorMessage(payload, ''),
    };
  }

  // 判断接口错误是否属于请求凭证失效，便于 HTTP 与业务 code 共用一套处理。
  private isCredentialInvalidError(error: unknown) {
    return isApiCredentialInvalidError(error);
  }

  // 判断当前失败是否允许继续自动重试，请求凭证失效必须立即失败并交给页面处理。
  private shouldRetryRequest(error: unknown, attempt: number, maxAttempts: number) {
    if (attempt >= maxAttempts) return false;
    if (this.isCredentialInvalidError(error)) return false;
    if (error instanceof ApiRequestError) return error.retryable;
    return true;
  }

  // 判断本次登录态失效是否应该先刷新 token，再重放原请求。
  private shouldRefreshAuthForRequest<TData = unknown, TResponse = unknown>(
    error: unknown,
    preparedRequest: PreparedRequest<TData, TResponse>,
    authRefreshed: boolean,
  ) {
    if (authRefreshed) return false;
    if (!this.isCredentialInvalidError(error)) return false;
    if (!preparedRequest.header.Authorization) return false;
    if (!(error instanceof ApiRequestError)) return false;
    if (isAccessTokenRefreshableBusinessCode(error.code)) return true;
    return error.statusCode === HttpStatusCode.Unauthorized && typeof error.code === 'undefined';
  }

  // 刷新成功后把新 accessToken 写回原请求头，签名请求会在重放前重新计算签名。
  private async applyRefreshedAuthToRequest<TData = unknown, TResponse = unknown>(
    preparedRequest: PreparedRequest<TData, TResponse>,
  ) {
    try {
      const requestToken = this.resolveAuthorizationToken(preparedRequest.header.Authorization);
      const currentAccessToken = rootStore.member.csession;
      if (requestToken && currentAccessToken && requestToken !== currentAccessToken) {
        preparedRequest.header.Authorization = `Bearer ${currentAccessToken}`;
        return;
      }

      const nextAccessToken = await this.refreshAuthSession({
        skipAuthStatusSync: preparedRequest.skipAuthStatusSync,
      });
      preparedRequest.header.Authorization = `Bearer ${nextAccessToken}`;
    } catch (error) {
      this.handleCredentialInvalid();
      throw this.normalizeRequestError(error);
    }
  }

  // 读取本次请求实际携带的 Bearer token，用于判断是否已有其它请求刷新过登录态。
  private resolveAuthorizationToken(authorization?: string) {
    if (!authorization) return undefined;
    const bearerPrefix = 'Bearer ';
    return authorization.startsWith(bearerPrefix)
      ? authorization.slice(bearerPrefix.length)
      : authorization;
  }

  // 归一化 Taro 底层抛出的非 Error 异常，避免 toast 和调用方拿不到可读 message。
  private normalizeRequestError(error: unknown) {
    if (error instanceof Error) return error;

    return new ApiRequestError(resolveErrorMessage(error, '网络异常，请稍后再试'));
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

  // 为需要 HMAC 的 BFF 写接口生成签名头和稳定请求体。
  private resolveSignedRequest<TData, TResponse>(preparedRequest: PreparedRequest<TData, TResponse>, data: TData | undefined) {
    if (!preparedRequest.sign) {
      return {
        data,
        header: preparedRequest.header,
      };
    }

    if (!SIGNED_BODY_METHODS.has(preparedRequest.method)) {
      return {
        data,
        header: preparedRequest.header,
      };
    }

    const signSecret = rootStore.member.signSecret;
    if (!signSecret) {
      throw new ApiRequestError('缺少请求签名密钥，请重新登录', { retryable: false });
    }

    const bodyText = this.stringifyRequestBody(data);
    const bodySha256 = sha256Hex(bodyText);
    const timestamp = String(Date.now());
    const nonce = createSignatureNonce();
    const { path, query } = this.resolveSignatureUrlParts(preparedRequest.url);
    const signingText = [
      preparedRequest.method,
      path,
      query,
      timestamp,
      nonce,
      bodySha256,
    ].join('\n');

    return {
      data: bodyText || undefined,
      header: {
        'content-type': 'application/json',
        ...preparedRequest.header,
        'X-Timestamp': timestamp,
        'X-Nonce': nonce,
        'X-Body-Sha256': bodySha256,
        'X-Signature': hmacSha256Base64Url(signSecret, signingText),
      },
    };
  }

  // 将请求体转成签名和真实请求共用的 JSON 文本。
  private stringifyRequestBody(data: unknown) {
    if (typeof data === 'undefined' || data === null) return '';
    if (typeof data === 'string') return data;
    return JSON.stringify(data);
  }

  // 从完整 URL 中提取后端签名原文需要的 path 和 query。
  private resolveSignatureUrlParts(url: string) {
    const pathWithQuery = url.replace(/^https?:\/\/[^/]+/i, '') || '/';
    const queryIndex = pathWithQuery.indexOf('?');

    if (queryIndex < 0) {
      return {
        path: pathWithQuery,
        query: '',
      };
    }

    return {
      path: pathWithQuery.slice(0, queryIndex) || '/',
      query: pathWithQuery.slice(queryIndex + 1),
    };
  }

  // 组装请求头，JSON 写接口默认声明 content-type，调用方可按需覆盖。
  private buildHeaders(extra?: Record<string, string>, csession?: string, method?: RequestOptions['method']) {
    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': '1',
      ...(method && SIGNED_BODY_METHODS.has(method) ? { 'content-type': 'application/json' } : {}),
      ...extra,
    };

    if (csession) {
      headers.Authorization = `Bearer ${csession}`;
    }

    return headers;
  }

  // 处理请求凭证失效，只回收 CSESSION，其他业务状态交给页面和 service 处理。
  private handleCredentialInvalid() {
    rootStore.member.clearCsession();
    this.csessionPromise = undefined;
    this.hasBootstrappedCsession = false;
    runAuthLifecycleHandler(credentialInvalidHandler?.());
  }

  // 输出用户可理解的错误提示，避免页面重复写 toast。
  private showRequestErrorToast(error: unknown) {
    Taro.showToast({
      title: resolveErrorMessage(error, '网络异常，请稍后再试'),
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

// 注册请求凭证失效后的全局回调，用于刷新会员状态缓存。
export function setCredentialInvalidHandler(handler: () => void | Promise<void>) {
  credentialInvalidHandler = handler;
}

// 注册认证会话获取或刷新后的全局回调，用于紧跟刷新会员状态。
export function setAuthSessionChangedHandler(handler: (source: AuthSessionChangedSource) => void | Promise<void>) {
  authSessionChangedHandler = handler;
}

// 发起业务接口请求；保留函数导出兼容现有调用。
export function request<TResponse, TData = unknown>(options: RequestOptions<TData>): Promise<TResponse> {
  return apiRequestClient.request<TResponse, TData>(options);
}
