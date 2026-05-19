import Taro from '@tarojs/taro';

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

interface ScanCodeResult {
  result: string;
  scanType?: string;
}

// 展示微信小程序原生轻提示，页面只传业务文案。
export function showWechatToast(title: string, icon: 'success' | 'error' | 'loading' | 'none' = 'none') {
  return Taro.showToast({
    title,
    icon,
    duration: 1800,
  });
}

// 展示微信小程序原生确认弹窗，并返回用户是否确认。
export async function showWechatConfirm({
  title,
  content,
  confirmText = '确定',
  cancelText = '取消',
}: ConfirmOptions) {
  const result = await Taro.showModal({
    title,
    content,
    confirmText,
    cancelText,
  });

  return result.confirm;
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
  } catch {
    await showWechatToast('未选择图片');
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
  } catch {
    await copyWechatText(address, '地址已复制，可粘贴到地图导航');
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
  } catch {
    await copyWechatText(phoneNumber, '电话已复制');
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
  } catch {
    await showWechatToast('未完成扫码');
    return undefined;
  }
}

// 打开微信分享菜单，并提示用户使用右上角完成分享。
export async function showWechatShareGuide() {
  try {
    await Taro.showShareMenu({
      withShareTicket: true,
      showShareItems: ['shareAppMessage'],
    });
  } catch {
    // 分享菜单在部分调试环境不可用时不阻断用户。
  }

  await showWechatToast('请点击右上角分享给好友');
}
