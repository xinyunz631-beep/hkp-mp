import { useEffect, useMemo, useState } from 'react';
import { Image, View } from '@tarojs/components';
import { Loading as NutLoading } from '@nutui/nutui-react-taro';
import classNames from 'classnames';
import type { CSSProperties } from 'react';
import kittyLoadingBaseSvg from '@/assets/loading/hello-kitty-kt-tp-4-outline-draw.svg';
import kittyLoadingBlinkSvg from '@/assets/loading/hello-kitty-kt-tp-4-motion-blink.svg';
import kittyLoadingDrawSvg from '@/assets/loading/hello-kitty-kt-tp-4-motion.svg';
import './index.scss';

export type KittySvgLoadingProps = {
  visible?: boolean;
  size?: number;
  color?: string;
  guideColor?: string;
  bowColor?: string;
  className?: string;
  style?: CSSProperties;
};

// 渲染可复用的 SVG 图片版 Kitty loading。
export function KittySvgLoading({
  visible = true,
  size = 120,
  className,
  style,
}: KittySvgLoadingProps) {
  const [svgError, setSvgError] = useState(false);
  const wrapperClassName = classNames('kitty-svg-loading', svgError && 'kitty-svg-loading--fallback', className);
  const imageStyle = useMemo(() => ({
    width: `${size}px`,
    height: `${size}px`,
  }), [size]);
  const fallbackLoadingStyle = useMemo(() => ({
    ['--nutui-loading-icon-size']: `${Math.max(32, Math.round(size * 0.42))}px`,
  } as CSSProperties & Record<string, string>), [size]);

  useEffect(() => {
    setSvgError(false);
  }, [visible]);

  if (!visible) return null;

  // 兼容微信小程序的图片渲染能力；SVG 不可用时回退到 NutUI loading。
  function handleImageError() {
    setSvgError(true);
  }

  return (
    <View className={wrapperClassName} style={style}>
      {svgError ? (
        <NutLoading
          type="circular"
          direction="vertical"
          className="kitty-svg-loading__fallback"
          style={fallbackLoadingStyle}
        />
      ) : (
        <View className="kitty-svg-loading__motion">
          <View className="kitty-svg-loading__stage" style={imageStyle}>
            <Image
              svg
              src={kittyLoadingBaseSvg}
              mode="aspectFit"
              className="kitty-svg-loading__image"
              style={imageStyle}
              onError={handleImageError}
            />
            <View className="kitty-svg-loading__outline-mask">
              <Image
                svg
                src={kittyLoadingDrawSvg}
                mode="aspectFit"
                className="kitty-svg-loading__image kitty-svg-loading__draw-image"
                style={imageStyle}
                onError={handleImageError}
              />
            </View>
            <View className="kitty-svg-loading__blink-layer kitty-svg-loading__blink-layer--closed" style={imageStyle}>
              <Image
                svg
                src={kittyLoadingBlinkSvg}
                mode="aspectFit"
                className="kitty-svg-loading__image"
                style={imageStyle}
                onError={handleImageError}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
