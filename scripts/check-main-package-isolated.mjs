#!/usr/bin/env node

import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const outputRoot = process.env.MAIN_PACKAGE_CHECK_OUTPUT_ROOT || '.dist-check/main-package';
const outputDir = join(process.cwd(), outputRoot);

// 执行子命令并透传输出，用于保持 Taro 构建和体积检测日志可读。
function runCommand(command, args, env = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// 使用独立输出目录构建并检测主包体积，避免覆盖微信开发工具正在监听的 dist。
function main() {
  rmSync(outputDir, { recursive: true, force: true });
  runCommand('yarn', ['taro', 'build', '--type', 'weapp'], {
    HKITTY_MP_OUTPUT_ROOT: outputRoot,
  });
  runCommand(process.execPath, ['scripts/check-main-package-size.mjs', outputRoot]);
}

main();
