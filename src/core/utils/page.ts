import Taro from '@tarojs/taro';

interface MiniProgramPageLike {
  route?: string;
  options?: Record<string, string | undefined>;
}

// 获取当前页面唯一归属键，用于把登录弹窗限制在触发它的页面内。
export function getCurrentPageKey() {
  const pages = Taro.getCurrentPages() as MiniProgramPageLike[];
  const currentPage = pages[pages.length - 1];
  if (!currentPage?.route) return 'app';

  const options = currentPage.options || {};
  const query = Object.keys(options)
    .sort()
    .map((key) => `${key}=${options[key] || ''}`)
    .join('&');

  return query ? `${currentPage.route}?${query}` : currentPage.route;
}
