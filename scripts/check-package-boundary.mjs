#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const rootDir = process.cwd();
const srcDir = join(rootDir, 'src');
const requiredMainPages = [
  'pages/home/index',
  'pages/park/index',
  'pages/member/index',
  'pages/profile/index',
];
const requiredPackages = ['pkg-mall', 'pkg-member', 'pkg-hotel', 'pkg-ticket', 'pkg-dining', 'pkg-order'];
const failures = [];

// 记录检查失败信息，最后统一输出并返回非零退出码。
function fail(message) {
  failures.push(message);
}

// 读取文本文件，集中处理脚本需要检查的配置内容。
function readText(path) {
  return readFileSync(join(rootDir, path), 'utf8');
}

// 从 TypeScript 配置片段中提取字符串数组，避免引入额外解析依赖。
function extractStrings(segment) {
  const values = [];
  const pattern = /['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(segment))) {
    values.push(match[1]);
  }
  return values;
}

// 提取 app.config.ts 中的主包页面数组。
function extractMainPages(appConfigText) {
  const match = appConfigText.match(/pages:\s*\[([\s\S]*?)\],\s*window:/);
  return match ? extractStrings(match[1]) : [];
}

// 提取 app.config.ts 中 tabBar 配置的页面路径。
function extractTabBarPages(appConfigText) {
  const pages = [];
  const pattern = /pagePath:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(appConfigText))) {
    pages.push(match[1]);
  }
  return pages;
}

// 提取 app.config.ts 中全部分包 root。
function extractSubPackageRoots(appConfigText) {
  const roots = [];
  const pattern = /root:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(appConfigText))) {
    roots.push(match[1]);
  }
  return roots;
}

// 递归遍历目录中的源码文件，用于检查主包 import 链。
function walkSourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

// 检查主包页面和核心层是否直接 import 分包实现。
function checkNoMainPackageImportsBusiness() {
  const checkedDirs = ['src/pages', 'src/core'];
  for (const dir of checkedDirs) {
    const absoluteDir = join(rootDir, dir);
    if (!existsSync(absoluteDir)) continue;
    for (const file of walkSourceFiles(absoluteDir)) {
      const text = readFileSync(file, 'utf8');
      if (/from\s+['"][^'"]*pkg-|import\s*\([^)]*['"][^'"]*pkg-/.test(text)) {
        fail(`${relative(rootDir, file)} 直接引用了业务分包实现`);
      }
    }
  }
}

// 检查主包页面目录、tabBar 路径和分包 root 是否符合项目约束。
function checkAppConfig() {
  const appConfigText = readText('src/app.config.ts');
  const configText = readText('config/index.ts');

  if (!existsSync(join(srcDir, 'pages'))) fail('缺少主包页面目录 src/pages');
  if (existsSync(join(srcDir, 'pages-tab'))) fail('禁止存在非标准主包页面目录 src/pages-tab');
  if (existsSync(join(srcDir, 'main-pages'))) fail('禁止存在非标准主包页面目录 src/main-pages');

  for (const page of requiredMainPages) {
    if (!extractMainPages(appConfigText).includes(page)) fail(`主包 pages 缺少 ${page}`);
    if (!extractTabBarPages(appConfigText).includes(page)) fail(`tabBar 缺少 ${page}`);
  }

  for (const root of requiredPackages) {
    if (!existsSync(join(srcDir, root))) fail(`缺少分包目录 src/${root}`);
    if (!extractSubPackageRoots(appConfigText).includes(root)) fail(`subPackages 缺少 root ${root}`);
  }

  if (/pages-tab|main-pages|packages\//.test(appConfigText)) {
    fail('app.config.ts 存在旧目录或多余 packages 层引用');
  }

  if (!/optimizeMainPackage:\s*\{[\s\S]*?enable:\s*true/.test(configText)) {
    fail('config/index.ts 必须启用 mini.optimizeMainPackage.enable = true');
  }

  if (/preloadRule/.test(appConfigText) || /preloadRule/.test(configText)) {
    fail('禁止配置 preloadRule');
  }
}

// 执行小程序包边界检查并输出结果。
function main() {
  checkAppConfig();
  checkNoMainPackageImportsBusiness();

  if (failures.length > 0) {
    for (const message of failures) console.error(`FAIL ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log('OK 小程序主包页面、分包目录和主包引用边界检查通过');
}

main();
