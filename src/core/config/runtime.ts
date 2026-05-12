import { ACTIVE_RUNTIME_ENV, RUNTIME_ENV_CONFIGS, type RuntimeEnv } from './env';

export interface RuntimeConfig {
  env: RuntimeEnv;
  envName: string;
  apiHost: string;
  tokenUrl: string;
  appIdFallback: string;
}

// 获取当前运行时配置，避免业务代码散落读取环境变量或构建配置。
export function getRuntimeConfig(): RuntimeConfig {
  const config = RUNTIME_ENV_CONFIGS[ACTIVE_RUNTIME_ENV];

  return {
    env: ACTIVE_RUNTIME_ENV,
    envName: config.name,
    apiHost: config.host,
    tokenUrl: `${config.host}${config.tokenPath}`,
    appIdFallback: config.appIdFallback,
  };
}
