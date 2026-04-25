export type RuntimeEnv = 'development' | 'production';

export interface RuntimeConfig {
  env: RuntimeEnv;
  apiBaseUrl: string;
}

// 获取当前运行时配置，避免业务代码散落读取环境变量。
export function getRuntimeConfig(): RuntimeConfig {
  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  return {
    env,
    apiBaseUrl: env === 'production' ? 'https://api.example.com' : 'https://mock.example.com',
  };
}
