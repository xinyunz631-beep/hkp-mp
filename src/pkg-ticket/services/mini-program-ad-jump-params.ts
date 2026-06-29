interface MiniProgramAdJumpParamSource {
  jumpParams?: Record<string, unknown> | null;
  jumpPath?: string;
  jumpTarget?: string;
}

function decodeJumpParam(value?: string) {
  if (!value) return '';
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function normalizeJumpParamValue(value: unknown) {
  if (typeof value === 'string') return decodeJumpParam(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function readJumpParamsValue(ad: MiniProgramAdJumpParamSource, key: string) {
  if (!ad.jumpParams || !Object.prototype.hasOwnProperty.call(ad.jumpParams, key)) return '';
  return normalizeJumpParamValue(ad.jumpParams[key]);
}

function readQueryParam(urlOrPath: string | undefined, key: string) {
  if (!urlOrPath) return '';
  const queryStart = urlOrPath.indexOf('?');
  const queryText = queryStart >= 0 ? urlOrPath.slice(queryStart + 1) : urlOrPath;
  const pair = queryText.split('&').find((item) => item.split('=')[0] === key);
  if (!pair) return '';
  const [, rawValue = ''] = pair.split('=');
  return decodeJumpParam(rawValue);
}

export function resolveMiniProgramAdStringParam(ad: MiniProgramAdJumpParamSource, key: string) {
  return readJumpParamsValue(ad, key) || readQueryParam(ad.jumpTarget, key) || readQueryParam(ad.jumpPath, key);
}

export function resolveMiniProgramAdNumberParam(ad: MiniProgramAdJumpParamSource, key: string) {
  const value = Number(resolveMiniProgramAdStringParam(ad, key));
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
