import Taro from '@tarojs/taro';
import { MINI_MAIN_ROUTES } from '@/core/constants/routes';

const MAIN_TAB_ROUTE_SET = new Set<string>(Object.values(MINI_MAIN_ROUTES));

// 归一化微信页面栈里的 route，避免前导斜杠差异影响判断。
function normalizeRoute(route?: string) {
  if (!route) return '';
  return route.startsWith('/') ? route : `/${route}`;
}

// 获取当前页面路径，供导航栏和页面组件判断当前是否为 tab 页面。
export function getCurrentMiniRoute() {
  const pages = Taro.getCurrentPages();
  return normalizeRoute(pages[pages.length - 1]?.route);
}

// 获取当前小程序页面栈长度，页面状态组件不要直接散写 getCurrentPages。
export function getMiniPageStackLength() {
  return Taro.getCurrentPages().length;
}

// 判断当前是否存在上一页，可用于弹层和轻量返回按钮显隐。
export function canNavigateBackInPageStack() {
  return getMiniPageStackLength() > 1;
}

// 只在页面栈存在上一页时返回；无上一页时不做兜底跳转，交给调用方隐藏入口。
export function navigateBackInPageStack() {
  if (!canNavigateBackInPageStack()) return false;

  Taro.navigateBack({ delta: 1 });
  return true;
}

// 判断当前页面是否是主包 tab 页，tab 页自定义 navbar 默认只展示标题。
export function isCurrentMainTabPage() {
  return MAIN_TAB_ROUTE_SET.has(getCurrentMiniRoute());
}

// 判断当前是否是首页，避免首页错误态展示无意义的返回入口。
export function isCurrentHomePage() {
  return getCurrentMiniRoute() === MINI_MAIN_ROUTES.home;
}

// 通用返回函数：页面栈只有一个页面时回首页，否则正常返回上一页。
export function navigateBackOrHome() {
  if (getMiniPageStackLength() <= 1) {
    return Taro.reLaunch({ url: MINI_MAIN_ROUTES.home });
  }

  return Taro.navigateBack({ delta: 1 });
}
