import Taro from '@tarojs/taro';

interface DevApiLogPayload {
  method?: string;
  url?: string;
  data?: unknown;
  headers?: Record<string, unknown>;
  status?: number;
  response?: unknown;
  error?: unknown;
  attempt?: number;
  requestStartedAt: number;
  responseFinishedAt: number;
}

const LOGGABLE_ENV_VERSIONS = new Set(['develop', 'trial']);
const MAX_LOG_STRING_LENGTH = 1200;
const SENSITIVE_LOG_FIELD_NAMES = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-signature',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'signsecret',
  'sign_secret',
  'csession',
]);
const URL_LOG_STYLE = 'color:#db2777;font-weight:400;';
const SUCCESS_DURATION_LOG_STYLE = 'color:#16a34a;font-weight:600;';
const ERROR_DURATION_LOG_STYLE = 'color:#dc2626;font-weight:600;';
const BASE_LOG_STYLE = 'color:#6b7280;';

// 判断当前是否允许输出接口调试日志，只在微信开发版和体验版生效。
function shouldLogDevApi() {
  try {
    const envVersion = Taro.getAccountInfoSync().miniProgram.envVersion;
    return LOGGABLE_ENV_VERSIONS.has(envVersion);
  } catch {
    return false;
  }
}

// 限制超长文本输出，避免富文本或大响应把真机控制台刷满。
function trimLogString(value: string) {
  if (value.length <= MAX_LOG_STRING_LENGTH) return value;
  return `${value.slice(0, MAX_LOG_STRING_LENGTH)}...(${value.length} chars)`;
}

function maskSensitiveLogValue(value: unknown) {
  if (typeof value === 'string') return value ? `${value.slice(0, 10)}***` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return '***';
  return '[masked]';
}

function isSensitiveLogField(key: string) {
  return SENSITIVE_LOG_FIELD_NAMES.has(key.toLowerCase());
}

// 递归清洗日志对象，处理超长字符串、循环引用和鉴权签名字段。
function sanitizeLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return trimLogString(value);
  if (!value || typeof value !== 'object') return value;

  if (seen.has(value)) return '[Circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogValue(item, seen));
  }

  if (value instanceof Error) {
    const details = Object.entries(value as Error & Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, item]) => {
      if (key === 'name' || key === 'message' || key === 'stack') return result;
      result[key] = sanitizeLogValue(item, seen);
      return result;
    }, {});

    return {
      name: value.name,
      message: value.message,
      ...details,
    };
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((result, [key, item]) => {
    result[key] = isSensitiveLogField(key)
      ? maskSensitiveLogValue(item)
      : sanitizeLogValue(item, seen);
    return result;
  }, {});
}

// 格式化本地时间，方便真机控制台直接对照网络请求顺序。
function formatLogTime(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (value: number, length = 2) => String(value).padStart(length, '0');
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`,
  ].join(' ');
}

// 开发版/体验版接口日志入口，把一次 URL 请求的请求参数和返回结果合并成一条日志。
export function devApiLog(payload: DevApiLogPayload) {
  if (!shouldLogDevApi()) return;

  try {
    const method = payload.method?.toUpperCase() || 'GET';
    const url = payload.url || '-';
    const attemptLabel = payload.attempt ? ` #${payload.attempt}` : '';
    const durationMs = Math.max(0, payload.responseFinishedAt - payload.requestStartedAt);
    const hasError = Boolean(payload.error);
    const status = hasError ? 'ERROR' : payload.status ?? '-';
    const label = `%c[hkitty-api]${attemptLabel} ${method} %c${url}%c ${status} %c${durationMs}ms`;
    const content = {
      request: {
        method,
        url,
        params: sanitizeLogValue(payload.data),
        headers: sanitizeLogValue(payload.headers),
        time: formatLogTime(payload.requestStartedAt),
      },
      response: {
        status: payload.status,
        result: sanitizeLogValue(payload.response),
        time: formatLogTime(payload.responseFinishedAt),
        durationMs,
      },
      error: sanitizeLogValue(payload.error),
      attempt: payload.attempt,
    } as const;

    console.log(
      label,
      BASE_LOG_STYLE,
      URL_LOG_STYLE,
      BASE_LOG_STYLE,
      hasError ? ERROR_DURATION_LOG_STYLE : SUCCESS_DURATION_LOG_STYLE,
      content,
    );
  } catch {
    // 调试日志不能影响真实请求、重试、刷新 token 或业务错误抛出。
  }
}
