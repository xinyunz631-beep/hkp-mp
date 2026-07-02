export interface CustomerServiceRuntimeConfig {
  appKey: string;
  appId?: string;
  initTimeoutMs: number;
  openTimeoutMs: number;
}

// 网易七鱼客服运行配置；appKey 未配置前保持空字符串，业务入口会提示先完成配置。
export const CUSTOMER_SERVICE_CONFIG: CustomerServiceRuntimeConfig = {
  appKey: '3a64f8e1cf82e1d4a22bee6f8dbca68a',
  appId: 'wx72b9e08ce45d3e79',
  initTimeoutMs: 3000,
  openTimeoutMs: 3000,
};
