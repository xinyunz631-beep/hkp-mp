import {
  CUSTOMER_SERVICE_CONFIG,
  type CustomerServiceRuntimeConfig,
} from '@/core/config/customer-service';
import { resolveErrorMessage } from '@/core/utils/error-message';
import { showWechatToast } from '@/core/utils/wechat-actions';

export type CustomerServiceSource =
  | 'home'
  | 'mall-product'
  | 'member'
  | 'ticket'
  | 'hotel'
  | 'order-logistics'
  | 'ad'
  | 'other';

export type CustomerServiceOpenResult = 'plugin' | 'unavailable';

export interface CustomerServicePluginInitOptions {
  appKey: string;
  config: CustomerServiceRuntimeConfig;
}

export interface CustomerServicePluginOpenOptions {
  appKey: string;
  source: CustomerServiceSource;
  payload?: Record<string, unknown>;
}

export interface CustomerServicePluginAdapter {
  init(options: CustomerServicePluginInitOptions): Promise<void> | void;
  open(options: CustomerServicePluginOpenOptions): Promise<void> | void;
}

export interface OpenCustomerServiceOptions {
  source: CustomerServiceSource;
  payload?: Record<string, unknown>;
  unavailableText?: string;
}

let registeredAdapter: CustomerServicePluginAdapter | undefined;
let initPromise: Promise<boolean> | undefined;
let initialized = false;

// 给第三方客服初始化和打开动作加超时保护，避免入口点击后长时间无反馈。
function withTimeout<T>(task: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    task
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

// 判断客服 appKey 是否已经配置，未配置时不触发第三方插件链路。
export function isCustomerServiceConfigured(config = CUSTOMER_SERVICE_CONFIG) {
  return Boolean(config.appKey.trim());
}

// 注册真实客服插件适配器，后续接入网易七鱼小程序插件时只需要在启动侧注入一次。
export function registerCustomerServiceAdapter(adapter?: CustomerServicePluginAdapter | null) {
  registeredAdapter = adapter || undefined;
  initPromise = undefined;
  initialized = false;
}

// 初始化客服插件；任何失败都返回 false，调用方统一展示不可用反馈。
export async function initCustomerService(config = CUSTOMER_SERVICE_CONFIG) {
  const appKey = config.appKey.trim();
  const adapter = registeredAdapter;

  if (initialized) return true;
  if (!appKey || !adapter) return false;
  if (initPromise) return initPromise;

  initPromise = withTimeout(
    Promise.resolve().then(() => adapter.init({ appKey, config })),
    config.initTimeoutMs,
    '客服插件初始化超时',
  )
    .then(() => {
      initialized = true;
      return true;
    })
    .catch((error: unknown) => {
      initialized = false;
      initPromise = undefined;
      console.warn('[customer-service] init failed:', resolveErrorMessage(error, '客服插件初始化失败'));
      return false;
    });

  return initPromise;
}

// 打开客服会话；未完成网易七鱼配置时先给出明确配置提示。
export async function openCustomerService(options: OpenCustomerServiceOptions): Promise<CustomerServiceOpenResult> {
  const appKey = CUSTOMER_SERVICE_CONFIG.appKey.trim();

  if (!appKey) {
    await showWechatToast('请先完成网易七鱼配置');
    return 'unavailable';
  }

  const ready = await initCustomerService(CUSTOMER_SERVICE_CONFIG);
  const adapter = registeredAdapter;

  if (ready && adapter) {
    try {
      await withTimeout(
        Promise.resolve().then(() => adapter.open({
          appKey,
          source: options.source,
          payload: options.payload,
        })),
        CUSTOMER_SERVICE_CONFIG.openTimeoutMs,
        '客服插件打开超时',
      );
      return 'plugin';
    } catch (error) {
      console.warn('[customer-service] open failed:', resolveErrorMessage(error, '客服插件打开失败'));
    }
  }

  await showWechatToast(options.unavailableText || '当前客服暂不可用，请稍后再试');
  return 'unavailable';
}
