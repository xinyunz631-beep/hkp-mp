import Taro from '@tarojs/taro';
import { MINI_MAIN_ROUTES, MINI_PACKAGE_ROUTES, type MiniRoute } from '@/core/constants/routes';
import { requireLogin } from '@/core/services/auth';

const MAIN_TAB_ROUTE_SET = new Set<string>(Object.values(MINI_MAIN_ROUTES));
const LOGIN_REQUIRED_ROUTE_REASONS: Partial<Record<MiniRoute, string>> = {
  [MINI_PACKAGE_ROUTES.memberHome]: '登录后可进入会员中心',
  [MINI_PACKAGE_ROUTES.memberCode]: '登录后可查看会员码',
  [MINI_PACKAGE_ROUTES.memberProfile]: '登录后可查看个人信息',
  [MINI_PACKAGE_ROUTES.memberLegacyBind]: '登录后可绑定老会员权益',
  [MINI_PACKAGE_ROUTES.memberCoupons]: '登录后可查看优惠券',
  [MINI_PACKAGE_ROUTES.memberCouponCenter]: '登录后可进入领券中心',
  [MINI_PACKAGE_ROUTES.memberGrowth]: '登录后可查看会员权益',
  [MINI_PACKAGE_ROUTES.memberGrowthDetail]: '登录后可查看成长值',
  [MINI_PACKAGE_ROUTES.memberExchange]: '登录后可进入兑换专区',
  [MINI_PACKAGE_ROUTES.memberExchangeDetail]: '登录后可兑换商品',
  [MINI_PACKAGE_ROUTES.mallCart]: '登录后可查看购物车',
  [MINI_PACKAGE_ROUTES.mallFavorites]: '登录后可查看收藏',
  [MINI_PACKAGE_ROUTES.mallGiftSelect]: '登录后可选择赠品',
  [MINI_PACKAGE_ROUTES.orderHome]: '登录后可查看订单',
  [MINI_PACKAGE_ROUTES.orderDetail]: '登录后可查看订单详情',
  [MINI_PACKAGE_ROUTES.orderCheckout]: '登录后可提交订单',
  [MINI_PACKAGE_ROUTES.orderAddress]: '登录后可管理地址',
  [MINI_PACKAGE_ROUTES.orderAddressEdit]: '登录后可编辑地址',
  [MINI_PACKAGE_ROUTES.orderCancel]: '登录后可取消订单',
  [MINI_PACKAGE_ROUTES.orderAftersaleApply]: '登录后可申请售后',
  [MINI_PACKAGE_ROUTES.orderAftersaleType]: '登录后可申请售后',
  [MINI_PACKAGE_ROUTES.orderAftersaleList]: '登录后可查看售后记录',
  [MINI_PACKAGE_ROUTES.orderAftersaleProgress]: '登录后可查看售后进度',
  [MINI_PACKAGE_ROUTES.orderLogistics]: '登录后可查看物流',
  [MINI_PACKAGE_ROUTES.orderReviewCreate]: '登录后可评价订单',
  [MINI_PACKAGE_ROUTES.ticketCheckout]: '登录后可提交门票订单',
  [MINI_PACKAGE_ROUTES.hotelCheckout]: '登录后可提交酒店订单',
};

interface NavigateToMiniRouteOptions {
  loginReason?: string;
  forceLogin?: boolean;
}

// 归一化微信页面栈里的 route，避免前导斜杠差异影响判断。
function normalizeRoute(route?: string) {
  if (!route) return '';
  return route.startsWith('/') ? route : `/${route}`;
}

// 去除 query 后提取小程序页面路径，供路由级登录守卫复用。
function resolveRoutePathFromUrl(url: string) {
  const [path] = url.split('?');
  return normalizeRoute(path);
}

// 获取受保护路由的登录原因，避免每个入口重复散写判断。
export function getMiniRouteLoginReason(url: string) {
  const routePath = resolveRoutePathFromUrl(url) as MiniRoute;
  return LOGIN_REQUIRED_ROUTE_REASONS[routePath];
}

// 判断路由是否属于需要登录的业务能力入口。
export function isLoginRequiredMiniRoute(url: string) {
  return Boolean(getMiniRouteLoginReason(url));
}

// 项目内跳转分包页时优先使用本方法，受保护路由会先登录拦截，目标页再自行兜底。
export function navigateToMiniRoute(url: string, options: NavigateToMiniRouteOptions = {}) {
  const loginReason = options.loginReason ?? getMiniRouteLoginReason(url);

  if (options.forceLogin || loginReason) {
    return requireLogin({
      reason: loginReason,
      onSuccess: () => {
        Taro.navigateTo({ url });
      },
    });
  }

  Taro.navigateTo({ url });
  return true;
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
