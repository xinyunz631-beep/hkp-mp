// 从平台回调、接口响应或 Error 中提取最接近真实来源的错误文案。
export function resolveErrorMessage(error: unknown, fallback = '操作失败，请稍后再试') {
  const message = pickErrorMessage(error);
  return message || fallback;
}

function pickErrorMessage(error: unknown, depth = 0): string {
  if (!error || depth > 2) return '';
  if (typeof error === 'string') return error.trim();
  if (error instanceof Error) return error.message.trim();
  if (typeof error !== 'object') return '';

  const payload = error as {
    message?: unknown;
    msg?: unknown;
    errMsg?: unknown;
    data?: unknown;
    detail?: unknown;
    response?: unknown;
  };
  const direct = stringifyMessage(payload.message)
    || stringifyMessage(payload.msg)
    || stringifyMessage(payload.errMsg);
  if (direct) return direct;

  return pickErrorMessage(payload.data, depth + 1)
    || pickErrorMessage(payload.detail, depth + 1)
    || pickErrorMessage(payload.response, depth + 1);
}

function stringifyMessage(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
