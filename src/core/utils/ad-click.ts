import Taro from '@tarojs/taro';
import { HKP_PARK_HOTLINE, HKP_PARK_LOCATION } from '@/core/constants/park-location';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES } from '@/core/constants/routes';
import type { MiniProgramAdJumpType, MiniProgramAdView } from '@/core/types/mini-program-ad';
import { navigateToMiniRoute } from '@/core/utils/navigation';
import { callWechatPhone, copyWechatText, openWechatLocation, showWechatToast } from '@/core/utils/wechat-actions';

export interface MiniProgramAdClickTarget {
  id?: string;
  adNo?: string;
  jumpType?: MiniProgramAdJumpType;
  jumpTarget?: string;
  jumpPath?: string;
  jumpMiniProgramAppId?: string;
  jumpAppId?: string;
  jumpUrl?: string;
  jumpCustomValue?: string;
  richText?: string;
  richTextHtml?: string;
}

export interface AdClickOptions {
  emptyText?: string;
}

// 归一化后台维护的小程序路径，兼容旧首页路径和不带前导斜杠的页面路径。
function normalizeAdMiniProgramPath(path?: string) {
  const nextPath = path?.trim();
  if (!nextPath || nextPath === '/') return undefined;
  if (nextPath === '/pages/index/index' || nextPath === 'pages/index/index') return MINI_MAIN_ROUTES.home;
  return nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
}

// 其他小程序 path 使用微信原始规范，不强制补当前小程序内部路由的前导斜杠。
function normalizeOtherMiniProgramPath(path?: string) {
  const nextPath = path?.trim();
  if (!nextPath || nextPath === '/') return undefined;
  return nextPath.startsWith('/') ? nextPath.slice(1) : nextPath;
}

// 判断自定义值是否像小程序页面路径，便于运营直接维护 path。
function isMiniProgramPathValue(value: string) {
  return value.startsWith('/') || value.startsWith('pages/') || value.startsWith('pkg-');
}

// 判断自定义值是否是乐园地址类动作，命中后调用微信地图。
function isLocationCustomValue(value: string) {
  const lowerValue = value.toLowerCase();
  return [
    'action:location',
    'location',
    'location:park',
    'park:location',
    'hkp:location',
    'address',
  ].includes(lowerValue) || /地址|导航|位置|天使大道|安吉/.test(value);
}

// 判断自定义值是否是广告详情动作，命中后跳富文本详情页。
function isAdDetailCustomValue(value: string) {
  const lowerValue = value.toLowerCase();
  return ['action:addetail', 'content:addetail', 'ad:detail', 'richtext', 'rich:text'].includes(lowerValue);
}

// 从广告对象里提取点击需要的字段，页面不再散写后端字段兼容。
export function resolveMiniProgramAdClickTarget(ad: MiniProgramAdView): MiniProgramAdClickTarget {
  return {
    id: ad.id,
    adNo: ad.adNo,
    jumpType: ad.jumpType,
    jumpTarget: ad.jumpTarget,
    jumpPath: ad.jumpPath,
    jumpMiniProgramAppId: ad.jumpMiniProgramAppId,
    jumpAppId: ad.jumpAppId,
    jumpUrl: ad.jumpUrl,
    jumpCustomValue: ad.jumpCustomValue,
    richText: ad.richText,
    richTextHtml: ad.richTextHtml,
  };
}

// 跳转小程序内部页面，统一走项目路由工具，避免触发微信原生 tabBar。
function navigateByMiniProgramPath(path: string) {
  const miniPath = normalizeAdMiniProgramPath(path);
  if (!miniPath) return false;

  navigateToMiniRoute(miniPath);
  return true;
}

// 判断跳转路径是否是当前可承载广告详情的详情页。
function isAdRenderableDetailPath(path?: string) {
  if (!path) return false;
  const [routePath] = path.split('?');
  return [
    MINI_PACKAGE_ROUTES.ticketActivityDetail,
    MINI_PACKAGE_ROUTES.ticketParkDetail,
    MINI_PACKAGE_ROUTES.ticketSchedule,
  ].includes(routePath as typeof MINI_PACKAGE_ROUTES.ticketActivityDetail);
}

// 给详情页跳转路径写入后端广告 id，避免落地页继续读取旧静态内容 id。
function withAdIdQuery(path: string, adId: string) {
  const [routePath, queryText = ''] = path.split('?');
  const queryItems = queryText
    .split('&')
    .filter(Boolean)
    .filter((item) => !item.startsWith('id='));
  return `${routePath}?id=${encodeURIComponent(adId)}${queryItems.length ? `&${queryItems.join('&')}` : ''}`;
}

// 获取广告富文本详情页路径，必须使用后端广告 id。
function resolveAdDetailPath(target: MiniProgramAdClickTarget, preferredPath?: string) {
  if (!target.id) return undefined;
  if (isAdRenderableDetailPath(preferredPath)) return withAdIdQuery(preferredPath as string, target.id);
  return `${MINI_PACKAGE_ROUTES.ticketActivityDetail}?id=${encodeURIComponent(target.id)}`;
}

// 执行自定义广告值，优先识别业务动作，再降级为路径、H5 或复制。
async function executeCustomAdValue(target: MiniProgramAdClickTarget, customValue?: string) {
  const value = customValue?.trim();
  if (!value) return false;

  if (isLocationCustomValue(value)) {
    await openWechatLocation(HKP_PARK_LOCATION);
    return true;
  }

  if (value.toLowerCase().startsWith('tel:') || value.toLowerCase().startsWith('action:phone')) {
    const phoneNumber = value.replace(/^tel:/i, '').replace(/^action:phone:?/i, '').trim();
    await callWechatPhone(phoneNumber || HKP_PARK_HOTLINE);
    return true;
  }

  if (isAdDetailCustomValue(value)) {
    const detailPath = resolveAdDetailPath(target);
    if (detailPath) return navigateByMiniProgramPath(detailPath);
  }

  if (isMiniProgramPathValue(value)) return navigateByMiniProgramPath(value);

  if (/^https?:\/\//i.test(value)) {
    await copyWechatText(value, '链接已复制');
    return true;
  }

  await copyWechatText(value, '内容已复制');
  return true;
}

// 统一执行小程序广告点击，所有页面广告位必须通过本方法承接跳转、复制、地图、电话和富文本详情。
export async function adClick(target: MiniProgramAdClickTarget | MiniProgramAdView | undefined, options: AdClickOptions = {}) {
  const clickTarget = target ? resolveMiniProgramAdClickTarget(target) : undefined;
  const emptyText = options.emptyText || '内容准备中，请稍后再试';

  if (!clickTarget) {
    await showWechatToast(emptyText);
    return false;
  }

  const miniPath = normalizeAdMiniProgramPath(clickTarget.jumpPath || clickTarget.jumpTarget);
  const appId = clickTarget.jumpAppId || clickTarget.jumpMiniProgramAppId;

  if (clickTarget.jumpType === 'otherMiniProgram') {
    if (appId) {
      await Taro.navigateToMiniProgram({
        appId,
        path: normalizeOtherMiniProgramPath(clickTarget.jumpPath || clickTarget.jumpTarget),
      });
      return true;
    }
    await showWechatToast(emptyText);
    return false;
  }

  if (clickTarget.jumpType === 'h5') {
    if (clickTarget.jumpUrl) {
      await copyWechatText(clickTarget.jumpUrl, '链接已复制');
      return true;
    }
    await showWechatToast(emptyText);
    return false;
  }

  if (clickTarget.jumpType === 'custom') {
    const handled = await executeCustomAdValue(clickTarget, clickTarget.jumpCustomValue);
    if (handled) return true;
  }

  if ((clickTarget.richTextHtml || clickTarget.richText) && (!miniPath || isAdRenderableDetailPath(miniPath))) {
    const detailPath = resolveAdDetailPath(clickTarget, miniPath);
    if (detailPath) return navigateByMiniProgramPath(detailPath);
  }

  if (miniPath) return navigateByMiniProgramPath(miniPath);

  await showWechatToast(emptyText);
  return false;
}
