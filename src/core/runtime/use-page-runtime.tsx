import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDidHide, useDidShow } from '@tarojs/taro';
import { PageInitLoading } from '@/core/components/loading';
import { PageRuntimeHost } from '@/core/components/PageRuntimeHost';
import { StatusException } from '@/core/components/status';
import {
  ensureLogin as ensureGlobalLogin,
  requireLogin as requireGlobalLogin,
  runAfterLogin as runAfterGlobalLogin,
} from '@/core/services/auth';
import { rootStore } from '@/core/store';
import { isCurrentHomePage } from '@/core/utils/navigation';

type PageRuntimeTask<TResult> = () => TResult | Promise<TResult>;
type PageRuntimeHandler<TArgs extends unknown[]> = (...args: TArgs) => void | Promise<void>;
export type PageRuntimePhase = 'initializing' | 'ready' | 'refreshing' | 'failed';

export interface PageRuntimeErrorFallbackProps {
  // 初始化失败时抛出的原始错误，页面可按需映射成业务文案。
  error: unknown;
  // 兜底页是否正在重试，通常用于禁用重复点击。
  loading: boolean;
  // 重新执行页面初始化流程；如果 loginRequired 为 true，会先重新走登录拦截。
  retry: () => Promise<boolean>;
}

export interface PageRuntimeOptions {
  // 页面首屏初始化函数，适合放第一组接口请求；成功前 renderPage 不会执行真实页面渲染函数。
  initPage?: () => void | Promise<void>;
  // 首次初始化成功前展示的全屏 loading 或骨架屏；不传时使用通用页面 loading。
  initialLoading?: ReactNode;
  // 首次 loading 最短展示时间，避免接口过快成功或失败导致骨架屏肉眼不可见。
  initialLoadingMinDuration?: number;
  // 页面已初始化后再次 onShow 刷新或手动 withLoading 时展示的上层 loading；不传时使用通用页面 loading。
  refreshLoading?: ReactNode;
  // 首次初始化失败的自定义兜底页；不传时使用通用失败页。
  errorFallback?: (props: PageRuntimeErrorFallbackProps) => ReactNode;
  // 页面已初始化后再次进入时是否自动刷新 initPage，默认刷新并只展示上层 loading。
  refreshOnShow?: boolean;
  // 首屏初始化是否必须先登录；未登录时会先打开登录弹窗，登录完成后才执行 initPage。
  loginRequired?: boolean;
  // 初始化登录拦截弹窗里的业务原因文案。
  loginReason?: string;
  // 已初始化页面刷新失败时的兜底回调；首次失败仍进入失败页，避免渲染空数据页面。
  onRefreshError?: (error: unknown) => void;
}

export interface PageRuntimeController {
  // 页面运行时节点；兼容老写法，新页面优先使用 renderPage 自动挂载。
  runtimeNode: ReactNode;
  // 当前页面上层 loading 是否显示，页面可用于调试或组合自定义 UI。
  loadingVisible: boolean;
  // 页面初始化阶段：initializing、ready、refreshing、failed。
  phase: PageRuntimePhase;
  // 没有 initPage 时视为已初始化；有 initPage 时仅在首次成功后为 true。
  initialized: boolean;
  // 首次初始化失败的原始错误。
  initError?: unknown;
  // 手动打开当前页面唯一 loading，并返回本次 loading 的关闭函数。
  showLoading: () => () => void;
  // 手动关闭当前页面全部 loading，页面隐藏时也会自动调用。
  hideLoading: () => void;
  // 包裹页面业务请求，自动打开并在请求结束后关闭当前页面唯一 loading。
  withLoading: <TResult>(task: PageRuntimeTask<TResult>) => Promise<TResult>;
  // 重新执行 initPage；首次失败前展示全屏 loading，已初始化后展示上层 loading。
  reload: () => Promise<boolean>;
  // 页面标准渲染入口：初始化成功前不执行 renderContent，并自动挂载登录弹窗和页面 loading。
  renderPage: (renderContent: () => ReactNode) => ReactNode;
  // 打开登录弹窗；全局已登录时不会展示弹窗，会直接续执行 onSuccess。
  openLogin: (reason?: string, onSuccess?: () => void) => void;
  // 关闭登录弹窗。
  closeLogin: () => void;
  // 等待登录完成，适合页面事件方法内 await 后再继续业务流程。
  ensureLogin: (reason?: string) => Promise<boolean>;
  // 登录后自动续执行页面业务动作。
  runAfterLogin: <TArgs extends unknown[]>(
    handler: PageRuntimeHandler<TArgs>,
    reason?: string,
    ...args: TArgs
  ) => Promise<boolean>;
  // 生成带登录守卫的点击回调，适合直接传给 onClick。
  withLoginGuard: <TArgs extends unknown[]>(
    handler: PageRuntimeHandler<TArgs>,
    reason?: string,
  ) => (...args: TArgs) => void;
}

const PAGE_RUNTIME_LOGIN_REQUIRED_ERROR = 'PAGE_RUNTIME_LOGIN_REQUIRED_ERROR';

interface PageRuntimeLoginRequiredError extends Error {
  code: typeof PAGE_RUNTIME_LOGIN_REQUIRED_ERROR;
}

// 构造页面初始化登录拦截错误，用于区分网络失败和用户取消登录。
function createLoginRequiredError(reason: string): PageRuntimeLoginRequiredError {
  const error = new Error(reason) as PageRuntimeLoginRequiredError;
  error.code = PAGE_RUNTIME_LOGIN_REQUIRED_ERROR;
  return error;
}

// 判断页面初始化失败是否来自登录拦截未完成。
function isLoginRequiredError(error: unknown): error is PageRuntimeLoginRequiredError {
  return Boolean(error && typeof error === 'object' && 'code' in error
    && (error as PageRuntimeLoginRequiredError).code === PAGE_RUNTIME_LOGIN_REQUIRED_ERROR);
}

// 等待首屏 loading 最短展示时间，避免接口过快返回导致页面状态一闪而过。
function waitInitialLoading(startedAt: number, minDuration: number) {
  const remainingDuration = minDuration - (Date.now() - startedAt);
  if (remainingDuration <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    setTimeout(resolve, remainingDuration);
  });
}

// 提供页面内显式接入的运行时控制器，统一处理初始化闸门、页面单例 loading 和登录拦截。
export function usePageRuntime(options: PageRuntimeOptions = {}): PageRuntimeController {
  const {
    initPage,
    initialLoading,
    initialLoadingMinDuration = 300,
    refreshLoading,
    errorFallback,
    refreshOnShow = true,
    loginRequired = false,
    loginReason = '登录后可继续使用该服务',
    onRefreshError,
  } = options;
  const initPageRef = useRef(initPage);
  const refreshOnShowRef = useRef(refreshOnShow);
  const loginRequiredRef = useRef(loginRequired);
  const loginReasonRef = useRef(loginReason);
  const onRefreshErrorRef = useRef(onRefreshError);
  const activeLoadingTokens = useRef(new Set<number>());
  const loadingTokenSeed = useRef(0);
  const pageShowCount = useRef(0);
  const initializedRef = useRef(false);
  const initialInitPromise = useRef<Promise<boolean>>();
  const initRequestSeed = useRef(0);
  const destroyedRef = useRef(false);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [phase, setPhase] = useState<PageRuntimePhase>(initPage ? 'initializing' : 'ready');
  const [initError, setInitError] = useState<unknown>();

  useEffect(() => {
    initPageRef.current = initPage;
    refreshOnShowRef.current = refreshOnShow;
    loginRequiredRef.current = loginRequired;
    loginReasonRef.current = loginReason;
    onRefreshErrorRef.current = onRefreshError;
  }, [initPage, loginReason, loginRequired, onRefreshError, refreshOnShow]);

  // 打开当前页面唯一 loading，并返回只关闭本次 loading 的清理函数。
  const showLoading = useCallback(() => {
    loadingTokenSeed.current += 1;
    const token = loadingTokenSeed.current;
    let closed = false;

    activeLoadingTokens.current.add(token);
    setLoadingVisible(true);

    return () => {
      if (closed) return;
      closed = true;
      activeLoadingTokens.current.delete(token);
      setLoadingVisible(activeLoadingTokens.current.size > 0);
    };
  }, []);

  // 清空当前页面 loading，适合页面隐藏或手动兜底关闭。
  const hideLoading = useCallback(() => {
    activeLoadingTokens.current.clear();
    setLoadingVisible(false);
  }, []);

  // 包裹页面业务请求，自动打开并在请求结束后关闭当前页面 loading。
  const withLoading = useCallback(async <TResult,>(task: PageRuntimeTask<TResult>) => {
    const closeLoading = showLoading();

    try {
      return await task();
    } finally {
      closeLoading();
    }
  }, [showLoading]);

  // 执行页面初始化，首次失败进入兜底页，后续刷新失败保留已有页面。
  const runPageInit = useCallback(async (mode: 'initial' | 'refresh') => {
    const currentInitPage = initPageRef.current;
    if (!currentInitPage) return true;

    const requestId = initRequestSeed.current + 1;
    initRequestSeed.current = requestId;

    if (mode === 'initial' || !initializedRef.current) {
      setPhase('initializing');
      setInitError(undefined);
    } else {
      setPhase('refreshing');
    }

    const initStartedAt = Date.now();

    try {
      if (loginRequiredRef.current) {
        const authed = await ensureGlobalLogin(loginReasonRef.current);
        if (!authed) throw createLoginRequiredError(loginReasonRef.current);
      }

      await currentInitPage();
      if (mode === 'initial' && !initializedRef.current) {
        await waitInitialLoading(initStartedAt, initialLoadingMinDuration);
      }
      if (destroyedRef.current || requestId !== initRequestSeed.current) return true;

      initializedRef.current = true;
      setPhase('ready');
      setInitError(undefined);
      return true;
    } catch (error) {
      if (mode === 'initial' && !initializedRef.current) {
        await waitInitialLoading(initStartedAt, initialLoadingMinDuration);
      }
      if (destroyedRef.current || requestId !== initRequestSeed.current) return false;

      if (initializedRef.current) {
        setPhase('ready');
        onRefreshErrorRef.current?.(error);
      } else {
        setPhase('failed');
        setInitError(error);
      }
      return false;
    }
  }, [initialLoadingMinDuration]);

  // 重新加载页面数据；首次失败页中会展示全屏 loading，已初始化页面会展示上层 loading。
  const reload = useCallback(async () => {
    if (initializedRef.current) {
      return withLoading(() => runPageInit('refresh'));
    }

    return runPageInit('initial');
  }, [runPageInit, withLoading]);

  // 触发首次页面初始化；允许热更新或生命周期补偿重新触发，最终以最新 requestId 为准。
  const startInitialInit = useCallback(() => {
    if (!initPageRef.current || initializedRef.current) return;
    if (!initialInitPromise.current) {
      initialInitPromise.current = runPageInit('initial').finally(() => {
        initialInitPromise.current = undefined;
      });
    }
  }, [runPageInit]);

  // 打开登录弹窗，登录态仍由全局 member store 维护。
  const openLogin = useCallback((reason?: string, onSuccess?: () => void) => {
    rootStore.app.openLogin(reason, onSuccess);
  }, []);

  // 关闭登录弹窗，供页面取消或隐藏时回收。
  const closeLogin = useCallback(() => {
    rootStore.app.closeLogin();
  }, []);

  // 确保用户已登录，未登录时由当前页面 renderPage 自动挂载的运行时节点展示登录弹窗。
  const ensureLogin = useCallback((reason?: string) => ensureGlobalLogin(reason), []);

  // 登录后自动续执行页面业务动作。
  const runAfterLogin = useCallback(<TArgs extends unknown[]>(
    handler: PageRuntimeHandler<TArgs>,
    reason?: string,
    ...args: TArgs
  ) => runAfterGlobalLogin(handler, reason, ...args), []);

  // 生成带登录守卫的页面业务动作。
  const withLoginGuard = useCallback(<TArgs extends unknown[]>(
    handler: PageRuntimeHandler<TArgs>,
    reason?: string,
  ) => (...args: TArgs) => {
    requireGlobalLogin({
      reason,
      onSuccess: async () => {
        await handler(...args);
      },
    });
  }, []);

  useDidHide(() => {
    hideLoading();
    closeLogin();
  });

  useDidShow(() => {
    const hasInitPage = Boolean(initPageRef.current);
    if (!hasInitPage) return;

    const isFirstShow = pageShowCount.current === 0;
    pageShowCount.current += 1;

    if (isFirstShow || !initializedRef.current) {
      startInitialInit();
      return;
    }

    if (refreshOnShowRef.current) {
      withLoading(() => runPageInit('refresh')).catch(() => undefined);
    }
  });

  useEffect(() => {
    startInitialInit();
  }, [startInitialInit]);

  useEffect(() => () => {
    destroyedRef.current = true;
    activeLoadingTokens.current.clear();
    rootStore.app.closeLogin();
  }, []);

  const runtimeNode = useMemo(() => (
    <PageRuntimeHost loadingVisible={loadingVisible} loadingNode={refreshLoading} />
  ), [loadingVisible, refreshLoading]);

  const initialized = !initPageRef.current || initializedRef.current;

  // 根据初始化状态决定是否执行页面真实渲染函数，并自动挂载页面运行时节点。
  const renderPage = useCallback((renderContent: () => ReactNode) => {
    const renderWithRuntime = (content: ReactNode) => (
      <>
        {content}
        {runtimeNode}
      </>
    );

    if (!initPageRef.current) return renderWithRuntime(renderContent());

    if (!initializedRef.current && phase !== 'failed') {
      return renderWithRuntime(initialLoading ?? <PageInitLoading />);
    }

    if (!initializedRef.current && phase === 'failed') {
      if (errorFallback) {
        return renderWithRuntime(errorFallback({
          error: initError,
          loading: false,
          retry: reload,
        }));
      }

      return renderWithRuntime(
        <StatusException
          fullScreen
          type={isLoginRequiredError(initError) ? 'server' : 'network'}
          title={isLoginRequiredError(initError) ? '需要登录后继续' : undefined}
          description={isLoginRequiredError(initError) ? '完成登录后即可加载当前页面。' : undefined}
          actionText="重新加载"
          backActionVisible
          hideBack={isCurrentHomePage()}
          error={isLoginRequiredError(initError) ? undefined : initError}
          onRetry={() => reload()}
        />
      );
    }

    return renderWithRuntime(renderContent());
  }, [errorFallback, initError, initialLoading, phase, reload, runtimeNode]);

  return useMemo(() => ({
    runtimeNode,
    loadingVisible,
    phase,
    initialized,
    initError,
    showLoading,
    hideLoading,
    withLoading,
    reload,
    renderPage,
    openLogin,
    closeLogin,
    ensureLogin,
    runAfterLogin,
    withLoginGuard,
  }), [
    runtimeNode,
    loadingVisible,
    phase,
    initialized,
    initError,
    showLoading,
    hideLoading,
    withLoading,
    reload,
    renderPage,
    openLogin,
    closeLogin,
    ensureLogin,
    runAfterLogin,
    withLoginGuard,
  ]);
}
