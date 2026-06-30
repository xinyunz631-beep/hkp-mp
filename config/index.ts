import { defineConfig, type UserConfigExport } from '@tarojs/cli';
import path from 'node:path';
import type { Input } from 'postcss';
import devConfig from './dev';
import prodConfig from './prod';

const styleTokensPath = path.resolve(__dirname, '..', 'src/styles/tokens.scss').replace(/\\/g, '/');
const outputRoot = process.env.HKITTY_MP_OUTPUT_ROOT || 'dist';
const isWatchMode = process.argv.includes('--watch') || process.argv.includes('-w');

function resolveDesignWidth(input?: string | number | Input) {
  const file = typeof input === 'object' ? input.file?.replace(/\\/g, '/') : undefined;
  if (file?.includes('@nutui')) {
    return 375;
  }

  return 750;
}

const baseConfig: UserConfigExport<'webpack5'> = {
  projectName: 'hkitty-mini-program',
  date: '2026-04-24',
  plugins: ['@tarojs/plugin-html'],
  designWidth: resolveDesignWidth,
  deviceRatio: {
    375: 2,
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot,
  framework: 'react',
  compiler: {
    type: 'webpack5',
    // NutUI Taro 组件依赖 HTML 标签模板，预编译缓存容易让小程序端模板和样式产物错位。
    prebundle: {
      enable: false,
      exclude: ['@nutui/nutui-react-taro', '@nutui/icons-react-taro'],
    },
  },
  cache: {
    enable: false,
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  mini: {
    optimizeMainPackage: {
      enable: true,
    },
    miniCssExtractPluginOption: {
      ignoreOrder: true,
    },
    sassLoaderOption: {
      additionalData: `@use "${styleTokensPath}" as *;`,
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
      },
    },
    webpackChain(chain) {
      chain.merge({
        optimization: {
          splitChunks: {
            chunks: 'all',
            minSize: 0,
          },
        },
      });
    },
  },
};

export default defineConfig<'webpack5'>((merge, { command }) => {
  const config =
    command === 'build' ? merge({}, baseConfig, prodConfig) : merge({}, baseConfig, devConfig);

  if (!isWatchMode) {
    return merge({}, config, {
      output: {
        clean: true,
      },
    });
  }

  return config;
});
