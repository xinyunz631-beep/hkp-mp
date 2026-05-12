export type RuntimeEnv = 'uat' | 'prod';

export interface RuntimeEnvConfig {
  name: string;
  host: string;
  tokenPath: string;
  appIdFallback: string;
}

// 切换小程序运行环境只改这里，dev:weapp 监听时会重新编译生效。
export const ACTIVE_RUNTIME_ENV: RuntimeEnv = 'uat';

export const RUNTIME_ENV_CONFIGS: Record<RuntimeEnv, RuntimeEnvConfig> = {
  uat: {
    name: 'UAT',
    host: 'https://pre-weapp.hefunoodles.com',
    tokenPath: '/hll-auth-client/oauth2/login/V2',
    appIdFallback: 'wx00261f550fdbc7ea',
  },
  prod: {
    name: '生产',
    host: 'https://weapp.hefunoodles.com',
    tokenPath: '/hll-auth-client/oauth2/login/V2',
    appIdFallback: 'wx00261f550fdbc7ea',
  },
};
