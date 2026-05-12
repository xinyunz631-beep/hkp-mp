import { PropsWithChildren, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useDidHide } from '@tarojs/taro';
import { LoginPopup } from '@/core/components/LoginPopup';
import { PageLoading } from '@/core/components/PageLoading';
import { registerPageLoadingController } from '@/core/runtime/page-loading';
import { rootStore } from '@/core/store';
import { getCurrentPageKey } from '@/core/utils/page';

// 渲染页面级运行时宿主，独立承载当前页面的 loading 和登录弹窗。
export function PageRuntimeHost({ children }: PropsWithChildren) {
  const pageKey = useMemo(() => getCurrentPageKey(), []);
  const activeLoadingTokens = useRef(new Set<string>());
  const [loadingVisible, setLoadingVisible] = useState(false);

  // 记录当前页面的一次 loading 标记，同一页面始终只展示一个 loading。
  const openLoading = useCallback((token: string) => {
    activeLoadingTokens.current.add(token);
    setLoadingVisible(true);
  }, []);

  // 关闭当前页面指定 loading 标记，所有请求结束后才隐藏唯一 loading。
  const closeLoading = useCallback((token: string) => {
    activeLoadingTokens.current.delete(token);
    setLoadingVisible(activeLoadingTokens.current.size > 0);
  }, []);

  // 清空当前页面 loading，页面隐藏或卸载时避免遮罩残留。
  const clearLoading = useCallback(() => {
    activeLoadingTokens.current.clear();
    setLoadingVisible(false);
  }, []);

  useLayoutEffect(() => registerPageLoadingController(pageKey, {
    open: openLoading,
    close: closeLoading,
    clear: clearLoading,
  }), [clearLoading, closeLoading, openLoading, pageKey]);

  useDidHide(() => {
    clearLoading();
    rootStore.app.closeLogin();
  });

  return (
    <>
      {children}
      <LoginPopup />
      <PageLoading visible={loadingVisible} />
    </>
  );
}
