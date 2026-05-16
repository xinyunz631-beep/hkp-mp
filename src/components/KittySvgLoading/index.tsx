import { useEffect, useMemo, useState } from 'react';
import { Image, View } from '@tarojs/components';
import { Loading as NutLoading } from '@nutui/nutui-react-taro';
import classNames from 'classnames';
import type { CSSProperties } from 'react';
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

type SvgLinePair = [number, number, number, number];

const KITTY_HEAD_PATH = 'M51 71 C36 47 28 32 38 23 C49 14 66 32 76 49 C84 46 93 44 102 44 C112 44 122 46 131 50 C142 31 159 15 170 24 C181 34 170 52 153 75 C160 86 164 99 164 113 C164 151 137 171 101 171 C64 171 37 150 37 113 C37 97 42 83 51 71 Z';
const KITTY_BOW_LEFT_PATH = 'M122 43 C105 25 105 8 123 16 C136 22 140 34 138 45 C135 53 128 50 122 43 Z';
const KITTY_BOW_RIGHT_PATH = 'M144 43 C162 25 165 9 147 16 C133 21 129 34 132 45 C135 54 139 51 144 43 Z';
const KITTY_BOW_CENTER = { cx: 133, cy: 42, r: 9.6 };
const KITTY_EYES = [
  { cx: 75, cy: 109, rx: 5.2, ry: 7.8, delay: '0s' },
  { cx: 126, cy: 109, rx: 5.2, ry: 7.8, delay: '-0.06s' },
];
const KITTY_WHISKERS_LEFT: SvgLinePair[] = [
  [58, 115, 28, 109],
  [58, 126, 26, 126],
  [58, 137, 29, 145],
];
const KITTY_WHISKERS_RIGHT: SvgLinePair[] = [
  [144, 115, 173, 109],
  [144, 126, 176, 126],
  [144, 137, 173, 145],
];

// 渲染可复用的 SVG 图片版 Kitty 线条 loading。
export function KittySvgLoading({
  visible = true,
  size = 120,
  color = '#211d27',
  guideColor = 'rgba(33,29,39,0.13)',
  bowColor = '#ff4f9a',
  className,
  style,
}: KittySvgLoadingProps) {
  const [svgError, setSvgError] = useState(false);

  const svgMarkup = useMemo(() => buildKittySvgMarkup({ color, guideColor, bowColor }), [bowColor, color, guideColor]);
  const svgDataUri = useMemo(() => encodeSvgToDataUri(svgMarkup), [svgMarkup]);
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
  }, [svgDataUri, visible]);

  if (!visible) return null;

  // 兼容微信小程序的图片渲染能力；SVG 不可用时直接退化为空态。
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
        <Image
          svg
          src={svgDataUri}
          mode="aspectFit"
          className="kitty-svg-loading__image"
          style={imageStyle}
          onError={handleImageError}
        />
      )}
    </View>
  );
}

// 组装 Kitty SVG 字符串，内部动画都写在 SVG 的 style 里。
function buildKittySvgMarkup({
  color,
  guideColor,
  bowColor,
}: Pick<KittySvgLoadingProps, 'color' | 'guideColor' | 'bowColor'>) {
  const whiskerGuides = buildLinePaths(KITTY_WHISKERS_LEFT, 'kitty-svg-loading__whisker-guide');
  const whiskerLines = buildLinePaths(KITTY_WHISKERS_LEFT, 'kitty-svg-loading__whisker-line kitty-svg-loading__whisker-line--left')
    + buildLinePaths(KITTY_WHISKERS_RIGHT, 'kitty-svg-loading__whisker-line kitty-svg-loading__whisker-line--right');
  const whiskerRightGuides = buildLinePaths(KITTY_WHISKERS_RIGHT, 'kitty-svg-loading__whisker-guide');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="Kitty loading">
  <defs>
    <linearGradient id="kitty-svg-loading-head-fill" x1="48" y1="24" x2="156" y2="172" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="64%" stop-color="#fbfbfd" />
      <stop offset="100%" stop-color="#f4f4f8" />
    </linearGradient>
    <linearGradient id="kitty-svg-loading-bow-fill" x1="112" y1="18" x2="154" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ffb0d1" />
      <stop offset="54%" stop-color="${bowColor}" />
      <stop offset="100%" stop-color="#d91d72" />
    </linearGradient>
  </defs>
  <style>
    .kitty-svg-loading__scene {
      animation: kitty-svg-loading-float 1.35s ease-in-out infinite;
      transform-box: fill-box;
      transform-origin: center;
    }

    .kitty-svg-loading__breath {
      animation: kitty-svg-loading-breath 1.7s ease-in-out infinite;
      transform-box: fill-box;
      transform-origin: center;
    }

    .kitty-svg-loading__head-fill {
      fill: url(#kitty-svg-loading-head-fill);
    }

    .kitty-svg-loading__head-guide,
    .kitty-svg-loading__head-line,
    .kitty-svg-loading__whisker-guide,
    .kitty-svg-loading__whisker-line,
    .kitty-svg-loading__bow-guide,
    .kitty-svg-loading__bow-line,
    .kitty-svg-loading__nose {
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .kitty-svg-loading__head-guide {
      fill: none;
      stroke: ${guideColor};
      stroke-width: 5.4;
    }

    .kitty-svg-loading__head-line {
      fill: none;
      stroke: ${color};
      stroke-width: 5.4;
      stroke-dasharray: 760 760;
      stroke-dashoffset: 760;
      opacity: 0.96;
      animation: kitty-svg-loading-head-draw 1.7s cubic-bezier(0.2, 0.74, 0.18, 1) infinite,
        kitty-svg-loading-line-breath 1.7s ease-in-out infinite;
      animation-fill-mode: both;
    }

    .kitty-svg-loading__whisker-guide {
      fill: none;
      stroke: ${guideColor};
      stroke-width: 4.1;
    }

    .kitty-svg-loading__whisker-line {
      fill: none;
      stroke: ${color};
      stroke-width: 4.1;
      stroke-dasharray: 64 64;
      stroke-dashoffset: 64;
      opacity: 0.94;
      animation: kitty-svg-loading-whisker-draw 1.7s cubic-bezier(0.2, 0.74, 0.18, 1) infinite,
        kitty-svg-loading-line-breath 1.7s ease-in-out infinite;
      animation-fill-mode: both;
    }

    .kitty-svg-loading__eyes {
      transform-box: fill-box;
      transform-origin: center;
    }

    .kitty-svg-loading__eye {
      fill: ${color};
      transform-box: fill-box;
      transform-origin: center;
      animation: kitty-svg-loading-blink 2.35s infinite;
    }

    .kitty-svg-loading__eye--right {
      animation-delay: -0.04s;
    }

    .kitty-svg-loading__nose {
      fill: #ffd84a;
      stroke: ${color};
      stroke-width: 2.4;
    }

    .kitty-svg-loading__bow-guide {
      fill: none;
      stroke: ${guideColor};
      stroke-width: 4.5;
    }

    .kitty-svg-loading__bow-line {
      fill: url(#kitty-svg-loading-bow-fill);
      stroke: ${color};
      stroke-width: 3.2;
      animation: kitty-svg-loading-bow-breathe 1.7s ease-in-out infinite;
      transform-box: fill-box;
      transform-origin: center;
    }

    .kitty-svg-loading__bow-line--left {
      transform-origin: 122px 43px;
    }

    .kitty-svg-loading__bow-line--right {
      transform-origin: 144px 43px;
    }

    .kitty-svg-loading__bow-center {
      fill: url(#kitty-svg-loading-bow-fill);
      stroke: ${color};
      stroke-width: 3.2;
      animation: kitty-svg-loading-bow-breathe 1.7s ease-in-out infinite;
      transform-box: fill-box;
      transform-origin: center;
    }

    @keyframes kitty-svg-loading-float {
      0%, 100% {
        transform: translateY(0) scale(1);
      }
      50% {
        transform: translateY(-1.2px) scale(1.01);
      }
    }

    @keyframes kitty-svg-loading-head-draw {
      0% {
        stroke-dashoffset: 760;
      }
      62% {
        stroke-dashoffset: 0;
      }
      100% {
        stroke-dashoffset: 0;
      }
    }

    @keyframes kitty-svg-loading-whisker-draw {
      0%, 20% {
        opacity: 0;
        stroke-dashoffset: 64;
      }
      42% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
      100% {
        opacity: 1;
        stroke-dashoffset: 0;
      }
    }

    @keyframes kitty-svg-loading-bow-breathe {
      0%, 100% {
        transform: scale(1);
        opacity: 0.95;
      }
      50% {
        transform: scale(1.03);
        opacity: 1;
      }
    }

    @keyframes kitty-svg-loading-blink {
      0%, 86%, 100% {
        transform: scaleY(1);
      }
      88% {
        transform: scaleY(0.18);
      }
      90% {
        transform: scaleY(0.08);
      }
      92% {
        transform: scaleY(1);
      }
    }

    @keyframes kitty-svg-loading-line-breath {
      0%, 100% {
        opacity: 0.88;
      }
      50% {
        opacity: 1;
      }
    }

    @keyframes kitty-svg-loading-breath {
      0%, 100% {
        opacity: 0.95;
        transform: scale(1);
      }
      50% {
        opacity: 1;
        transform: scale(1.015);
      }
    }
  </style>
  <g class="kitty-svg-loading__scene">
    <g class="kitty-svg-loading__breath">
      <path class="kitty-svg-loading__head-fill" d="${KITTY_HEAD_PATH}" />
      <path class="kitty-svg-loading__head-guide" d="${KITTY_HEAD_PATH}" />
      <path class="kitty-svg-loading__head-line" d="${KITTY_HEAD_PATH}" />
      ${whiskerGuides}
      ${whiskerRightGuides}
      ${whiskerLines}
      <g class="kitty-svg-loading__eyes">
        ${KITTY_EYES.map((eye, index) => `<ellipse class="kitty-svg-loading__eye kitty-svg-loading__eye--${index === 0 ? 'left' : 'right'}" cx="${eye.cx}" cy="${eye.cy}" rx="${eye.rx}" ry="${eye.ry}" style="animation-delay:${eye.delay};" />`).join('')}
      </g>
      <ellipse class="kitty-svg-loading__nose" cx="101" cy="122" rx="7.8" ry="5.5" />
      <g class="kitty-svg-loading__bow">
        <path class="kitty-svg-loading__bow-guide" d="${KITTY_BOW_LEFT_PATH}" />
        <path class="kitty-svg-loading__bow-guide" d="${KITTY_BOW_RIGHT_PATH}" />
        <path class="kitty-svg-loading__bow-line kitty-svg-loading__bow-line--left" d="${KITTY_BOW_LEFT_PATH}" />
        <path class="kitty-svg-loading__bow-line kitty-svg-loading__bow-line--right" d="${KITTY_BOW_RIGHT_PATH}" />
        <circle class="kitty-svg-loading__bow-center" cx="${KITTY_BOW_CENTER.cx}" cy="${KITTY_BOW_CENTER.cy}" r="${KITTY_BOW_CENTER.r}" />
      </g>
    </g>
  </g>
</svg>`;
}

// 根据线段坐标拼接 SVG path，方便后续单独替换某几条须线。
function buildLinePaths(lines: SvgLinePair[], className: string) {
  return lines
    .map(([x1, y1, x2, y2], index) => `<path class="${className}" d="M${x1} ${y1} L${x2} ${y2}" style="animation-delay:${(index + 1) * 0.04}s;" />`)
    .join('');
}

// 将 SVG 字符串转成可直接喂给 Image 的 data URI。
function encodeSvgToDataUri(svgMarkup: string) {
  const base64 = encodeSvgToBase64(svgMarkup);
  if (base64) {
    return `data:image/svg+xml;base64,${base64}`;
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;
}

// 尝试把 SVG 编码成 base64；如果当前运行环境不支持，再回退到普通 utf-8 data URI。
function encodeSvgToBase64(svgMarkup: string) {
  if (typeof globalThis.btoa === 'function') {
    const binary = typeof TextEncoder !== 'undefined'
      ? Array.from(new TextEncoder().encode(svgMarkup), (byte) => String.fromCharCode(byte)).join('')
      : unescape(encodeURIComponent(svgMarkup));
    return globalThis.btoa(binary);
  }

  const bufferApi = (globalThis as unknown as { Buffer?: { from(value: string): { toString(encoding: 'base64'): string } } }).Buffer;
  if (bufferApi) {
    return bufferApi.from(svgMarkup).toString('base64');
  }

  return '';
}
