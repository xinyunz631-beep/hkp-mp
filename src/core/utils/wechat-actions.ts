import Taro from '@tarojs/taro';
import { resolveErrorMessage } from '@/core/utils/error-message';

const APP_MODAL_CONFIRM_COLOR = '#db2777';
const APP_MODAL_CANCEL_COLOR = '#666666';

interface AppModalOptions {
  title?: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  cancelColor?: string;
  showCancel?: boolean;
}

interface ConfirmOptions {
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
}

interface PreviewImageOptions {
  urls: string[];
  current?: string;
  emptyText?: string;
}

interface ChooseImageOptions {
  count?: number;
  sourceType?: Array<'album' | 'camera'>;
}

interface OpenLocationOptions {
  latitude?: number;
  longitude?: number;
  name: string;
  address: string;
  scale?: number;
}

export interface WechatLocationResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface ScanCodeResult {
  result: string;
  scanType?: string;
}

type AppPaymentStatus = 'success' | 'pending' | 'failed';
type WechatPaymentParams = Parameters<typeof Taro.requestPayment>[0];
type WechatPaymentSignType = NonNullable<WechatPaymentParams['signType']>;

interface AppPaymentOptions {
  title?: string;
  amount: number;
  paymentParams?: WechatPaymentParams;
  allowPending?: boolean;
}

const WECHAT_PAYMENT_SIGN_TYPES = new Set<string>(['MD5', 'HMAC-SHA256', 'RSA']);

function getWechatFailMessage(error: unknown) {
  return resolveErrorMessage(error, '');
}

function resolveWechatPaymentFailMessage(error: unknown) {
  const errMsg = getWechatFailMessage(error);
  if (/cancel/i.test(errMsg)) return '支付已取消';
  if (/has no permission|permission denied|not allowed|no permission|没有权限/i.test(errMsg)) {
    return '当前小程序暂无微信支付权限，请联系工作人员处理';
  }
  if (/paymentParams|paySign|prepay|timeStamp|nonceStr|package/i.test(errMsg)) {
    return '支付参数异常，请稍后再试';
  }

  return resolveErrorMessage(error, '支付未完成');
}

function buildWechatPaymentDebugParams(paymentParams: WechatPaymentParams) {
  const params = paymentParams as unknown as Record<string, unknown>;

  return {
    keys: Object.keys(params),
    timeStamp: params.timeStamp,
    signType: params.signType,
    package: params.package,
    hasNonceStr: Boolean(params.nonceStr),
    hasPaySign: Boolean(params.paySign),
  };
}

function readWechatPaymentString(params: Record<string, unknown>, key: string) {
  const value = params[key];
  return typeof value === 'string' ? value.trim() : '';
}

// 按微信官方 requestPayment 参数白名单归一化，避免把后端诊断字段 appId 透传给原生 API。
function normalizeWechatPaymentParams(paymentParams: WechatPaymentParams | undefined) {
  if (!paymentParams) return undefined;
  const params = paymentParams as unknown as Record<string, unknown>;
  const timeStamp = readWechatPaymentString(params, 'timeStamp');
  const nonceStr = readWechatPaymentString(params, 'nonceStr');
  const packageValue = readWechatPaymentString(params, 'package');
  const paySign = readWechatPaymentString(params, 'paySign');
  const signType = readWechatPaymentString(params, 'signType').toUpperCase();

  if (!timeStamp || !nonceStr || !packageValue || !paySign) return undefined;
  if (!packageValue.startsWith('prepay_id=')) return undefined;
  if (signType && !WECHAT_PAYMENT_SIGN_TYPES.has(signType)) return undefined;

  return {
    timeStamp,
    nonceStr,
    package: packageValue,
    paySign,
    ...(signType ? { signType: signType as WechatPaymentSignType } : {}),
  } as WechatPaymentParams;
}

// 展示微信小程序原生轻提示，页面只传业务文案。
export function showWechatToast(title: string, icon: 'success' | 'error' | 'loading' | 'none' = 'none') {
  return Taro.showToast({
    title,
    icon,
    duration: 1800,
  });
}

// 统一微信原生弹窗入口，默认确认按钮使用项目主色。
export function showAppModal({
  title,
  content,
  confirmText = '确定',
  cancelText = '取消',
  confirmColor = APP_MODAL_CONFIRM_COLOR,
  cancelColor = APP_MODAL_CANCEL_COLOR,
  showCancel = true,
}: AppModalOptions) {
  const modalOptions: Parameters<typeof Taro.showModal>[0] = {
    content,
    confirmText,
    cancelText,
    confirmColor,
    cancelColor,
    showCancel,
  };

  if (title) {
    modalOptions.title = title;
  }

  return Taro.showModal(modalOptions);
}

// 展示微信小程序原生确认弹窗，并返回用户是否确认。
export async function showWechatConfirm({
  title,
  content,
  confirmText = '确定',
  cancelText = '取消',
}: ConfirmOptions) {
  const result = await showAppModal({
    title,
    content,
    confirmText,
    cancelText,
  });

  return result.confirm;
}

// 统一微信支付入口；无真实支付参数时直接失败，避免本地弹窗冒充支付完成。
export async function requestWechatPayment({
  paymentParams,
  allowPending = false,
}: AppPaymentOptions): Promise<AppPaymentStatus> {
  const normalizedPaymentParams = normalizeWechatPaymentParams(paymentParams);
  if (normalizedPaymentParams) {
    try {
      await Taro.requestPayment(normalizedPaymentParams);
      return 'success';
    } catch (error) {
      const errMsg = getWechatFailMessage(error);
      console.error('[hkitty-pay] requestPayment failed', {
        errMsg,
        error,
        paymentParams: buildWechatPaymentDebugParams(normalizedPaymentParams),
      });
      if (allowPending && /cancel/i.test(errMsg)) return 'pending';

      await showWechatToast(resolveWechatPaymentFailMessage(error));
      return 'failed';
    }
  }

  if (paymentParams) {
    console.error('[hkitty-pay] invalid paymentParams', {
      paymentParams: buildWechatPaymentDebugParams(paymentParams),
    });
  }
  await showWechatToast('支付参数暂不可用，请稍后再试');
  return allowPending ? 'pending' : 'failed';
}

// 预览图片；没有可用图片时给出业务反馈，避免空点击。
export function previewWechatImages({
  urls,
  current,
  emptyText = '暂无可预览图片',
}: PreviewImageOptions) {
  const validUrls = urls.filter(Boolean);

  if (validUrls.length === 0) {
    return showWechatToast(emptyText);
  }

  return Taro.previewImage({
    urls: validUrls,
    current: current || validUrls[0],
  });
}

// 调起微信图片选择，取消时返回空数组，让页面保持当前状态。
export async function chooseWechatImages({
  count = 1,
  sourceType = ['album', 'camera'],
}: ChooseImageOptions = {}) {
  try {
    const result = await Taro.chooseImage({
      count,
      sourceType,
      sizeType: ['compressed'],
    });

    return result.tempFilePaths ?? [];
  } catch (error) {
    await showWechatToast(resolveErrorMessage(error, '未选择图片'));
    return [];
  }
}

// 打开微信地图位置；缺少经纬度时复制地址作为降级路径。
export async function openWechatLocation({
  latitude,
  longitude,
  name,
  address,
  scale = 16,
}: OpenLocationOptions) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    await copyWechatText(address, '地址已复制，可粘贴到地图导航');
    return;
  }

  try {
    await Taro.openLocation({
      latitude,
      longitude,
      name,
      address,
      scale,
    });
  } catch (error) {
    await copyWechatText(address, resolveErrorMessage(error, '地址已复制，可粘贴到地图导航'));
  }
}

// 调起微信位置选择，用于地址新增/编辑等需要用户确认收货位置的场景。
export async function chooseWechatLocation(): Promise<WechatLocationResult | undefined> {
  try {
    const result = await Taro.chooseLocation({});
    const name = result.name?.trim() || '';
    const address = result.address?.trim() || '';

    if (!name && !address) {
      await showWechatToast('未选择地址');
      return undefined;
    }

    return {
      name,
      address,
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch (error) {
    const errMsg = getWechatFailMessage(error);

    if (/cancel/i.test(errMsg)) {
      await showWechatToast(resolveErrorMessage(error, '未选择地址'));
      return undefined;
    }

    if (/auth|authorize|permission|privacy|requiredPrivateInfos/i.test(errMsg)) {
      await showWechatToast(resolveErrorMessage(error, '请允许位置权限后再选择地址'));
      return undefined;
    }

    await showWechatToast(resolveErrorMessage(error, '位置选择暂不可用，请稍后再试'));
    return undefined;
  }
}

// 调起微信拨号；失败时复制号码，保证用户仍能继续。
export async function callWechatPhone(phoneNumber: string) {
  if (!phoneNumber) {
    await showWechatToast('暂无联系电话');
    return;
  }

  try {
    await Taro.makePhoneCall({ phoneNumber });
  } catch (error) {
    await copyWechatText(phoneNumber, resolveErrorMessage(error, '电话已复制'));
  }
}

// 复制文本到微信剪贴板并给出业务反馈。
export async function copyWechatText(data: string, successText = '已复制') {
  if (!data) {
    await showWechatToast('暂无可复制内容');
    return;
  }

  await Taro.setClipboardData({ data });
  await showWechatToast(successText, 'success');
}

// 调起微信扫码能力，用户取消时返回空结果并保持当前页面。
export async function scanWechatCode(): Promise<ScanCodeResult | undefined> {
  try {
    const result = await Taro.scanCode({
      onlyFromCamera: false,
    });

    return {
      result: result.result,
      scanType: result.scanType,
    };
  } catch (error) {
    await showWechatToast(resolveErrorMessage(error, '未完成扫码'));
    return undefined;
  }
}
