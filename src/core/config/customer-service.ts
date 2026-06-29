export interface CustomerServiceRuntimeConfig {
  appKey: string;
  initTimeoutMs: number;
  openTimeoutMs: number;
}

// 网易七鱼客服运行配置；appKey 未配置前保持空字符串，业务入口会自动走电话兜底。
export const CUSTOMER_SERVICE_CONFIG: CustomerServiceRuntimeConfig = {
  appKey: '',
  initTimeoutMs: 3000,
  openTimeoutMs: 3000,
};
