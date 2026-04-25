#!/usr/bin/env node

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const warningBytes = 1.3 * 1024 * 1024;
const limitBytes = 1.5 * 1024 * 1024;

// 递归统计文件大小，用于检查主包是否被业务代码污染。
function walkSize(dir, shouldSkip) {
  let total = 0;
  const details = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const relativePath = relative(distDir, fullPath);
    if (shouldSkip(relativePath, entry)) continue;

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      const child = walkSize(fullPath, shouldSkip);
      total += child.total;
      details.push(...child.details);
      continue;
    }

    total += stat.size;
    details.push({ path: relativePath, size: stat.size });
  }

  return { total, details };
}

// 将字节数格式化为 MB，方便本地和 CI 阅读。
function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

// 检查 dist 主包体积，超过 1.5MB 时阻断。
function main() {
  if (!existsSync(distDir)) {
    console.error('缺少 dist 目录，请先执行 yarn build:weapp。');
    process.exitCode = 1;
    return;
  }

  const result = walkSize(distDir, (relativePath, entry) => {
    return entry.startsWith('pkg-') || relativePath.startsWith('pkg-');
  });

  console.log(`主包估算体积：${formatMb(result.total)}`);
  for (const item of result.details.sort((a, b) => b.size - a.size).slice(0, 20)) {
    console.log(`${formatMb(item.size)} ${item.path}`);
  }

  if (result.total > limitBytes) {
    console.error(`主包超过阻断线 ${formatMb(limitBytes)}，请先排查主包引用链。`);
    process.exitCode = 1;
    return;
  }

  if (result.total >= warningBytes) {
    console.warn(`主包达到预警线 ${formatMb(warningBytes)}，建议排查主包依赖。`);
  }
}

main();
