import Taro from '@tarojs/taro';

export interface PageChromeMetrics {
  statusBarHeight: number;
  headerHeight: number;
  headerContentHeight: number;
  headerContentTopGap: number;
  menuRightReserve: number;
}

export interface LayoutRect {
  height?: number;
}

const FALLBACK_STATUS_BAR_HEIGHT = 24;
const FALLBACK_HEADER_HEIGHT = 44;
const FALLBACK_HEADER_CONTENT_HEIGHT = 32;
const FALLBACK_MENU_RIGHT_RESERVE = 112;
const FALLBACK_WINDOW_HEIGHT = 667;

export const SAFE_BOTTOM_SPACER_HEIGHT = 20;
export const MIN_SCROLL_VIEW_HEIGHT = 120;

// 安全读取微信窗口信息，避免使用旧系统信息同步接口。
function getWindowInfo(): ReturnType<typeof Taro.getWindowInfo> | undefined {
  try {
    return Taro.getWindowInfo?.();
  } catch {
    return undefined;
  }
}

// 安全读取微信右上角胶囊位置，避免低版本或非预期环境阻断页面渲染。
function getMenuButtonRect() {
  try {
    return Taro.getMenuButtonBoundingClientRect();
  } catch {
    return undefined;
  }
}

// 计算页面顶部 header 尺寸，让标题垂直对齐微信胶囊并预留右侧操作区空间。
export function resolvePageChromeMetrics(): PageChromeMetrics {
  const windowInfo = getWindowInfo();
  const statusBarHeight = windowInfo?.statusBarHeight ?? FALLBACK_STATUS_BAR_HEIGHT;
  const windowWidth = windowInfo?.windowWidth ?? windowInfo?.screenWidth ?? 375;
  const menuRect = getMenuButtonRect();

  if (!menuRect?.height || !menuRect?.top) {
    return {
      statusBarHeight,
      headerHeight: FALLBACK_HEADER_HEIGHT,
      headerContentHeight: FALLBACK_HEADER_CONTENT_HEIGHT,
      headerContentTopGap: Math.max((FALLBACK_HEADER_HEIGHT - FALLBACK_HEADER_CONTENT_HEIGHT) / 2, 0),
      menuRightReserve: FALLBACK_MENU_RIGHT_RESERVE,
    };
  }

  const headerContentTopGap = Math.max(menuRect.top - statusBarHeight, 0);
  const menuRightGap = Math.max(windowWidth - menuRect.right, 0);

  return {
    statusBarHeight,
    headerHeight: menuRect.height + headerContentTopGap * 2,
    headerContentHeight: menuRect.height,
    headerContentTopGap,
    menuRightReserve: menuRect.width + menuRightGap*2,
  };
}

// 读取当前窗口高度，供 ScrollView 显式高度计算使用。
export function resolveWindowHeight() {
  const windowInfo = getWindowInfo();
  return windowInfo?.windowHeight ?? windowInfo?.screenHeight ?? FALLBACK_WINDOW_HEIGHT;
}

// 从 selector query 结果中读取节点高度，节点不存在时按 0 处理。
export function resolveRectHeight(rect?: LayoutRect | null) {
  return rect?.height && rect.height > 0 ? rect.height : 0;
}

// 根据微信安全区域判断底部是否需要额外预留空间。
export function shouldReserveBottomSafeArea() {
  const windowInfo = getWindowInfo();
  const safeAreaBottom = windowInfo?.safeArea?.bottom;
  const screenHeight = windowInfo?.screenHeight;

  if (typeof safeAreaBottom !== 'number' || typeof screenHeight !== 'number') return false;

  return screenHeight - safeAreaBottom > 0;
}
