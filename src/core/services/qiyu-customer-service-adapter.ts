import type {
  CustomerServicePluginAdapter,
  CustomerServicePluginInitOptions,
  CustomerServicePluginOpenOptions,
  CustomerServiceVisitorInfo,
} from './customer-service';

export const QIYU_PLUGIN_NAME = 'qiyuSdk';
export const QIYU_CHAT_PLUGIN_URL = `plugin://${QIYU_PLUGIN_NAME}/chat`;

type RequirePlugin = (pluginName: string) => unknown;

interface WechatNavigateToOptions {
  url: string;
  success?: () => void;
  fail?: (error: unknown) => void;
}

interface WechatRuntime {
  navigateTo?: (options: WechatNavigateToOptions) => void;
}

export interface QiyuPluginApi {
  _$configAppKey?: (appKey: string) => void;
  _$configAppId?: (appId: string) => void;
  __configAppId?: (appId: string) => void;
  _$configFullScreen?: (enabled: boolean) => void;
  _$configAutoCopy?: (enabled: boolean) => void;
  _$setUserInfo?: (userInfo: QiyuUserInfo) => void;
}

export interface QiyuCustomerServiceAdapterDependencies {
  loadPlugin?: (pluginName: string) => unknown;
  navigateToChat?: (url: string) => Promise<void> | void;
}

interface QiyuUserInfoDataItem {
  index: number;
  key: string;
  label: string;
  value: string;
}

interface QiyuUserInfo {
  userId: string;
  data: QiyuUserInfoDataItem[];
}

declare const requirePlugin: RequirePlugin | undefined;
declare const wx: WechatRuntime | undefined;

function resolveRequirePlugin() {
  if (typeof requirePlugin === 'function') return requirePlugin;
  return undefined;
}

function resolveQiyuPlugin(plugin: unknown): QiyuPluginApi {
  if (!plugin || typeof plugin !== 'object') {
    throw new Error('网易七鱼插件未加载');
  }

  return plugin as QiyuPluginApi;
}

function resolveQiyuAppId(config: CustomerServicePluginInitOptions['config']) {
  return 'appId' in config && typeof config.appId === 'string' ? config.appId.trim() : '';
}

function appendQiyuUserInfoData(
  data: QiyuUserInfoDataItem[],
  key: string,
  label: string,
  value: unknown,
) {
  const normalizedValue = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
  if (!normalizedValue) return;

  data.push({
    index: data.length,
    key,
    label,
    value: normalizedValue,
  });
}

function buildQiyuUserInfo(visitor?: CustomerServiceVisitorInfo): QiyuUserInfo {
  if (!visitor) {
    return {
      userId: '',
      data: [],
    };
  }

  const activeVisitor = visitor;
  const userId = activeVisitor?.userId?.trim();
  if (!userId) {
    return {
      userId: '',
      data: [],
    };
  }

  const data: QiyuUserInfoDataItem[] = [];
  appendQiyuUserInfoData(data, 'real_name', '昵称', activeVisitor.nickname);
  appendQiyuUserInfoData(data, 'mobile_phone', '手机号', activeVisitor.mobile);
  appendQiyuUserInfoData(data, 'member_level', '会员等级', activeVisitor.levelName);
  appendQiyuUserInfoData(data, 'points', '积分', activeVisitor.points);

  return {
    userId,
    data,
  };
}

function configureQiyuUserInfo(plugin: QiyuPluginApi, options: CustomerServicePluginOpenOptions) {
  if (typeof plugin._$setUserInfo !== 'function') return;

  plugin._$setUserInfo(buildQiyuUserInfo(options.visitor));
}

// 初始化七鱼插件运行配置，页面入口只依赖通用客服 service，不直接触碰插件 API。
function configureQiyuPlugin(plugin: QiyuPluginApi, options: CustomerServicePluginInitOptions) {
  const appKey = options.appKey.trim();

  if (!appKey) {
    throw new Error('网易七鱼 appKey 未配置');
  }

  if (typeof plugin._$configAppKey !== 'function') {
    throw new Error('网易七鱼插件缺少 appKey 配置方法');
  }

  plugin._$configAppKey(appKey);

  const appId = resolveQiyuAppId(options.config);
  const configAppId = plugin.__configAppId || plugin._$configAppId;
  if (appId && typeof configAppId === 'function') {
    configAppId(appId);
  }

  plugin._$configFullScreen?.(true);
  plugin._$configAutoCopy?.(false);
}

function loadQiyuPlugin(pluginName: string) {
  const loader = resolveRequirePlugin();

  if (!loader) {
    throw new Error('当前环境不支持微信插件加载');
  }

  return resolveQiyuPlugin(loader(pluginName));
}

function navigateToQiyuChat(url: string) {
  return new Promise<void>((resolve, reject) => {
    if (typeof wx === 'undefined' || typeof wx.navigateTo !== 'function') {
      reject(new Error('当前环境不支持打开微信插件页面'));
      return;
    }

    wx.navigateTo({
      url,
      success: () => resolve(),
      fail: (error: unknown) => reject(error),
    });
  });
}

export function createQiyuCustomerServiceAdapter(
  dependencies: QiyuCustomerServiceAdapterDependencies = {},
): CustomerServicePluginAdapter {
  let qiyuPlugin: QiyuPluginApi | undefined;

  function getQiyuPlugin() {
    if (!qiyuPlugin) {
      const loadedPlugin = dependencies.loadPlugin
        ? dependencies.loadPlugin(QIYU_PLUGIN_NAME)
        : loadQiyuPlugin(QIYU_PLUGIN_NAME);
      qiyuPlugin = resolveQiyuPlugin(loadedPlugin);
    }

    return qiyuPlugin;
  }

  return {
    init(options) {
      configureQiyuPlugin(getQiyuPlugin(), options);
    },
    open(options) {
      configureQiyuUserInfo(getQiyuPlugin(), options);
      const navigate = dependencies.navigateToChat || navigateToQiyuChat;
      return navigate(QIYU_CHAT_PLUGIN_URL);
    },
  };
}
