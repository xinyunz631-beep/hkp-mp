import { defineConfig, type UserConfigExport } from '@tarojs/cli';
import path from 'node:path';
import devConfig from './dev';
import prodConfig from './prod';

const styleTokensPath = path.resolve(__dirname, '..', 'src/styles/tokens.scss').replace(/\\/g, '/');
const outputRoot = process.env.HKITTY_MP_OUTPUT_ROOT || 'dist';

const baseConfig: UserConfigExport<'webpack5'> = {
  projectName: 'hkitty-mini-program',
  date: '2026-04-24',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot,
  framework: 'react',
  compiler: {
    type: 'webpack5',
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  mini: {
    optimizeMainPackage: {
      enable: true,
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
  if (command === 'build') {
    return merge({}, baseConfig, prodConfig);
  }

  return merge({}, baseConfig, devConfig);
});
