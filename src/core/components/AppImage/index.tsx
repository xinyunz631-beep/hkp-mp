import { useEffect, useState } from 'react';
import { Image, View } from '@tarojs/components';
import { Loading as NutLoading } from '@nutui/nutui-react-taro';
import classNames from 'classnames';
import type { CSSProperties } from 'react';
import type { ImageProps } from '@tarojs/components';
import { AppIcon } from '@/core/components/AppIcon';
import './index.scss';

type AppImageStatus = 'idle' | 'loading' | 'loaded' | 'error';
type ImageLoadEvent = Parameters<NonNullable<ImageProps['onLoad']>>[0];
type ImageErrorEvent = Parameters<NonNullable<ImageProps['onError']>>[0];
type AppImageSize = number | string;
type AppImageStyle = ImageProps['style'];
type AppImageEmptyState = 'placeholder' | 'error';

const APP_IMAGE_DEFAULT_LOADING_SIZE = '24px';
const APP_IMAGE_DEFAULT_ERROR_ICON_SIZE = 28;

export interface AppImageProps extends Omit<ImageProps, 'className' | 'src' | 'mode' | 'style' | 'width' | 'height' | 'onLoad' | 'onError'> {
  className?: string;
  imageClassName?: string;
  src?: string;
  mode?: ImageProps['mode'];
  width?: AppImageSize;
  height?: AppImageSize;
  style?: AppImageStyle;
  imageStyle?: AppImageStyle;
  loadingSize?: AppImageSize;
  errorIconSize?: AppImageSize;
  placeholderColor?: string;
  emptyState?: AppImageEmptyState;
  showLoading?: boolean;
  showErrorIcon?: boolean;
  onLoad?: ImageProps['onLoad'];
  onError?: ImageProps['onError'];
}

function formatSize(size?: AppImageSize) {
  if (typeof size === 'number') return `${size}px`;
  return size;
}

function resolveLoadingSize(loadingSize?: AppImageSize) {
  const explicitSize = formatSize(loadingSize);
  if (explicitSize) return explicitSize;

  return APP_IMAGE_DEFAULT_LOADING_SIZE;
}

function resolveInitialStatus(src: string, emptyState: AppImageEmptyState): AppImageStatus {
  if (src) return 'loading';
  return emptyState === 'error' ? 'error' : 'idle';
}

function mergeRootStyle({
  style,
  width,
  height,
  loadingSize,
  placeholderColor,
}: {
  style?: AppImageStyle;
  width?: AppImageSize;
  height?: AppImageSize;
  loadingSize: string;
  placeholderColor: string;
}): AppImageStyle {
  const sizeStyle = {
    ...(width !== undefined ? { width: formatSize(width) } : {}),
    ...(height !== undefined ? { height: formatSize(height) } : {}),
    '--app-image-loading-size': loadingSize,
    '--app-image-placeholder-bg': placeholderColor,
  } as CSSProperties;

  if (typeof style === 'string') {
    const inlineSizeStyle = [
      width !== undefined ? `width:${formatSize(width)}` : '',
      height !== undefined ? `height:${formatSize(height)}` : '',
      `--app-image-loading-size:${loadingSize}`,
      `--app-image-placeholder-bg:${placeholderColor}`,
    ].filter(Boolean).join(';');

    return `${style};${inlineSizeStyle}`;
  }

  return {
    ...sizeStyle,
    ...style,
  };
}

// 渲染项目级图片组件，统一加载中、淡入和失败状态；页面不要直接散用 Taro Image。
export function AppImage({
  className,
  imageClassName,
  src = '',
  mode = 'aspectFill',
  width,
  height,
  style,
  imageStyle,
  loadingSize,
  errorIconSize,
  placeholderColor = '#d9e0e8',
  emptyState = 'placeholder',
  showLoading = true,
  showErrorIcon = true,
  onLoad,
  onError,
  onClick,
  ...imageProps
}: AppImageProps) {
  const [status, setStatus] = useState<AppImageStatus>(() => resolveInitialStatus(src, emptyState));
  const hasSrc = Boolean(src);
  const loaded = status === 'loaded';
  const loading = status === 'loading';
  const failed = status === 'error';
  const resolvedLoadingSize = resolveLoadingSize(loadingSize);
  const resolvedErrorIconSize = errorIconSize || APP_IMAGE_DEFAULT_ERROR_ICON_SIZE;
  const loadingStyle = {
    '--nutui-loading-icon-size': resolvedLoadingSize,
    '--app-image-loading-size': resolvedLoadingSize,
  } as CSSProperties;
  const rootStyle = mergeRootStyle({
    style,
    width,
    height,
    loadingSize: resolvedLoadingSize,
    placeholderColor,
  });
  const rootClassName = classNames(
    'app-image',
    `app-image--${status}`,
    className,
  );
  const resolvedImageClassName = classNames(
    'app-image__image',
    loaded && 'app-image__image--visible',
    imageClassName,
  );

  useEffect(() => {
    setStatus(resolveInitialStatus(src, emptyState));
  }, [emptyState, src]);

  function handleLoad(event: ImageLoadEvent) {
    setStatus('loaded');
    onLoad?.(event);
  }

  function handleError(event: ImageErrorEvent) {
    setStatus('error');
    onError?.(event);
  }

  return (
    <View className={rootClassName} style={rootStyle} onClick={onClick}>
      {hasSrc ? (
        <Image
          {...imageProps}
          className={resolvedImageClassName}
          src={src}
          mode={mode}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}
      {loading && showLoading ? (
        <View className="app-image__state app-image__state--loading">
          <NutLoading className="app-image__loading" type="circular" style={loadingStyle} />
        </View>
      ) : null}
      {failed && showErrorIcon ? (
        <View className="app-image__state app-image__state--error">
          <AppIcon
            name="imageError"
            className="app-image__error-icon"
            size={resolvedErrorIconSize}
            color="#98a2b3"
          />
        </View>
      ) : null}
    </View>
  );
}
