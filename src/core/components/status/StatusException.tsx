import { Text, View } from '@tarojs/components';
import classNames from 'classnames';
import { ApiRequestError, HttpStatusCode } from '@/core/request';
import { navigateBackOrHome } from '@/core/utils/navigation';
import './StatusException.scss';

type StatusExceptionType = 'network' | 'server' | 'empty';

interface StatusExceptionProps {
  className?: string;
  fullScreen?: boolean;
  type?: StatusExceptionType;
  error?: unknown;
  title?: string;
  description?: string;
  actionText?: string;
  actionDisabled?: boolean;
  backActionVisible?: boolean;
  hideBack?: boolean;
  backActionText?: string;
  onRetry?: () => void | Promise<void | boolean> | boolean;
}

interface StatusExceptionCopy {
  title: string;
  description: string;
  detail?: string;
}

// 渲染统一状态异常页，专门承接页面初始化失败、接口异常和渲染错误兜底。
export function StatusException({
  className,
  fullScreen = false,
  type = 'network',
  error,
  title,
  description,
  actionText = '重新加载',
  actionDisabled = false,
  backActionVisible = false,
  hideBack = false,
  backActionText = '返回',
  onRetry,
}: StatusExceptionProps) {
  const resolvedType = type ?? 'network';
  const showBackAction = backActionVisible && !hideBack;
  const hasActions = Boolean(onRetry) || showBackAction;
  const exceptionClassName = classNames('status-exception', {
    'status-exception--fullscreen': fullScreen,
  }, className);
  const resolvedCopy = resolveStatusExceptionCopy({
    error,
    type: resolvedType,
    title,
    description,
  });

  // 执行异常态重试动作，具体恢复流程交给页面运行时或业务页面处理。
  async function handleRetry() {
    if (actionDisabled || !onRetry) return;
    await onRetry();
  }

  function handleBack() {
    navigateBackOrHome();
  }

  return (
    <View className={exceptionClassName}>
      <View className={`status-exception__mark status-exception__mark--${resolvedType}`}>
        <Text className="status-exception__mark-text">{resolveExceptionMark(resolvedType)}</Text>
      </View>
      <Text className="status-exception__title">{resolvedCopy.title}</Text>
      <Text className="status-exception__description">{resolvedCopy.description}</Text>
      {resolvedCopy.detail ? (
        <Text className="status-exception__detail">{resolvedCopy.detail}</Text>
      ) : null}
      {hasActions ? (
        <View className="status-exception__actions">
          {showBackAction ? (
            <View className="status-exception__action status-exception__action--secondary" onClick={handleBack}>
              <Text className="status-exception__action-text status-exception__action-text--secondary">{backActionText}</Text>
            </View>
          ) : null}
          {onRetry ? (
            <View
              className={classNames('status-exception__action', {
                'status-exception__action--disabled': actionDisabled,
              })}
              onClick={handleRetry}
            >
              <Text className="status-exception__action-icon">↻</Text>
              <Text className="status-exception__action-text">{actionText}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// 根据错误和显式配置拼出统一状态页文案，尽量展示接口或渲染错误的具体信息。
function resolveStatusExceptionCopy({
  error,
  type,
  title,
  description,
}: Pick<StatusExceptionProps, 'error' | 'type' | 'title' | 'description'>): StatusExceptionCopy {
  const resolvedTitle = title ?? '出错了～';
  const resolvedType = type ?? 'network';
  const errorMessage = resolveErrorMessage(error);
  const errorDetail = resolveErrorDetail(error);
  const fallbackDescription = resolveExceptionDescription(resolvedType);
  const resolvedDescription = description
    ?? resolveDescriptionFromError(error, errorMessage, fallbackDescription)
    ?? fallbackDescription;
  const resolvedDetail = errorDetail && errorDetail !== resolvedDescription ? errorDetail : undefined;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    detail: resolvedDetail,
  };
}

// 根据错误类型拼出优先展示的说明，404 这类服务找不到的场景会转成更贴近页面的说法。
function resolveDescriptionFromError(
  error: unknown,
  errorMessage: string | undefined,
  fallbackDescription: string,
) {
  if (error instanceof ApiRequestError) {
    if (error.statusCode === HttpStatusCode.NotFound) {
      return '当前服务未找到，请稍后重试。';
    }

    if (error.statusCode === HttpStatusCode.Unauthorized) {
      return '登录状态已失效，请重新加载页面。';
    }

    if (errorMessage) return errorMessage;
  }

  if (errorMessage) return errorMessage;
  return fallbackDescription;
}

// 获取错误的原始 message，作为更具体的补充信息展示。
function resolveErrorDetail(error: unknown) {
  if (error instanceof ApiRequestError) return normalizeVisibleErrorMessage(error.message);
  if (error instanceof Error) return normalizeVisibleErrorMessage(error.message);
  if (!error || typeof error !== 'object') return undefined;

  const candidate = (error as { message?: unknown; errMsg?: unknown; msg?: unknown }).message
    || (error as { message?: unknown; errMsg?: unknown; msg?: unknown }).errMsg
    || (error as { message?: unknown; errMsg?: unknown; msg?: unknown }).msg;

  return typeof candidate === 'string' && candidate.trim() ? normalizeVisibleErrorMessage(candidate) : undefined;
}

// 获取错误的优先 message，供说明文案优先展示。
function resolveErrorMessage(error: unknown) {
  const detail = resolveErrorDetail(error);
  return detail?.trim() || undefined;
}

// 过滤 URL、内部路径和底层 failed 这类技术错误，避免直接展示到 C 端页面。
function normalizeVisibleErrorMessage(message: string) {
  const text = message.trim();
  if (!text) return undefined;
  const normalizedText = text.toLowerCase();
  const hasInternalPath = /(^|[\s"'`])\/?api\/[a-z0-9/_?=&.-]+/i.test(text);
  const hasUrl = /https?:\/\//i.test(text);
  const hasTechnicalFailure = normalizedText.includes(' failed')
    || normalizedText.includes('network error')
    || normalizedText.includes('timeout')
    || normalizedText.includes('stack');

  if ((hasInternalPath || hasUrl) && hasTechnicalFailure) return undefined;
  return text;
}

// 根据异常类型返回默认说明，保持项目状态页统一口径。
function resolveExceptionDescription(type: StatusExceptionType) {
  if (type === 'server') return '当前服务暂时不可用，请稍后再试。';
  if (type === 'empty') return '当前还没有可展示的内容。';
  return '网络连接不稳定，请稍后重试。';
}

// 根据异常类型返回兜底标记文案，保证即使资源不可用也能看见明确状态。
function resolveExceptionMark(type: StatusExceptionType) {
  if (type === 'empty') return '空';
  return '!';
}
