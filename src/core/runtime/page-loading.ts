import { getCurrentPageKey } from '@/core/utils/page';

interface PageLoadingController {
  open: (token: string) => void;
  close: (token: string) => void;
  clear: () => void;
}

const pageLoadingControllers = new Map<string, PageLoadingController>();
let loadingTokenSeed = 0;

// 注册页面宿主的 loading 控制器，状态实际保存在页面组件内部。
export function registerPageLoadingController(pageKey: string, controller: PageLoadingController) {
  pageLoadingControllers.set(pageKey, controller);

  return () => {
    if (pageLoadingControllers.get(pageKey) === controller) {
      pageLoadingControllers.delete(pageKey);
    }
    controller.clear();
  };
}

// 打开当前页面 loading，并返回只关闭本次请求的清理函数。
export function showCurrentPageLoading() {
  const controller = pageLoadingControllers.get(getCurrentPageKey());
  if (!controller) return undefined;

  loadingTokenSeed += 1;
  const token = `${Date.now()}-${loadingTokenSeed}`;
  let closed = false;
  controller.open(token);

  return () => {
    if (closed) return;
    closed = true;
    controller.close(token);
  };
}
