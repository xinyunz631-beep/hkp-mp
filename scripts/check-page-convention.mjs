#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = process.cwd();
const registryPath = resolve(rootDir, 'docs/ui/page-registry.yaml');
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(path) {
  return readFileSync(resolve(rootDir, path), 'utf8');
}

function getIndent(line) {
  return line.match(/^ */)[0].length;
}

function normalizeScalar(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function parseRegistryPages() {
  if (!existsSync(registryPath)) return [];

  const pages = [];
  const lines = readFileSync(registryPath, 'utf8').split(/\r?\n/);
  let inPagesBlock = false;
  let currentPage;
  let currentBlock;
  let currentListKey;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = getIndent(line);
    const trimmed = line.trim();

    if (indent === 0) {
      inPagesBlock = trimmed === 'pages:';
      currentPage = undefined;
      currentBlock = undefined;
      currentListKey = undefined;
      continue;
    }

    if (!inPagesBlock) continue;

    if (indent === 2) {
      const pageMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*$/);
      if (!pageMatch) continue;
      currentPage = {
        key: pageMatch[1],
        implementation: {
          files: [],
        },
      };
      pages.push(currentPage);
      currentBlock = undefined;
      currentListKey = undefined;
      continue;
    }

    if (!currentPage) continue;

    if (indent === 4) {
      const fieldMatch = trimmed.match(/^([a-zA-Z0-9_-]+):(?:\s*(.*))?$/);
      if (!fieldMatch) continue;
      const [, key, rawValue = ''] = fieldMatch;
      currentBlock = key;
      currentListKey = undefined;

      if (rawValue) currentPage[key] = normalizeScalar(rawValue);
      continue;
    }

    if (indent === 6 && currentBlock === 'implementation') {
      const listMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*$/);
      if (listMatch) {
        currentListKey = listMatch[1];
        if (!currentPage.implementation[currentListKey]) currentPage.implementation[currentListKey] = [];
      }
      continue;
    }

    if (indent === 8 && currentBlock === 'implementation' && currentListKey) {
      const itemMatch = trimmed.match(/^-\s+(.+?)\s*$/);
      if (itemMatch) currentPage.implementation[currentListKey].push(normalizeScalar(itemMatch[1]));
    }
  }

  return pages;
}

function resolvePageTsx(page) {
  const files = page.implementation?.files ?? [];
  const explicitFile = files.find((file) => file.endsWith('/index.tsx'));
  if (explicitFile) return explicitFile;
  return page.route ? `${page.route}/index.tsx` : '';
}

function resolvePageScss(page) {
  const files = page.implementation?.files ?? [];
  const explicitFile = files.find((file) => file.endsWith('/index.scss'));
  if (explicitFile) return explicitFile;
  return page.route ? `${page.route}/index.scss` : '';
}

function isPageClassName(token) {
  return /^_pg(?:$|-[a-z0-9]+(?:-[a-z0-9]+)*(?:_[a-z0-9]+(?:-[a-z0-9]+)*)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?)$/.test(token);
}

function shouldValidateClassToken(token) {
  return token.startsWith('_pg') || token.includes('-') || token.includes('_');
}

function checkClassNameTokens(page, pageText) {
  const classNamePattern = /className=(?:"([^"]*)"|'([^']*)'|\{`([\s\S]*?)`\}|\{(['"])([\s\S]*?)\4\})/g;
  let matched;

  if (!/className=["']_pg["']/.test(pageText)) {
    fail(`${page.key} 缺少 <View className="_pg"> 页面作用域根节点`);
  }

  while ((matched = classNamePattern.exec(pageText))) {
    const expression = matched[1] ?? matched[2] ?? matched[3] ?? matched[5] ?? '';
    const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? [];

    for (const token of tokens) {
      if (!shouldValidateClassToken(token)) continue;
      if (isPageClassName(token)) continue;

      fail(`${page.key} 页面 class "${token}" 不符合 _pg-* BEM 命名`);
    }
  }
}

function checkScssClassSelectors(page, scssFile) {
  if (!scssFile || !existsSync(resolve(rootDir, scssFile))) return;

  const scssText = readText(scssFile);
  const pageOwnedScss = scssText.replace(/page-shell__body/g, '');
  const selectorPattern = /\.([A-Za-z_][A-Za-z0-9_-]*)/g;
  let matched;

  if (pageOwnedScss.includes('__') || pageOwnedScss.includes('&__')) {
    fail(`${page.key} SCSS 中仍存在双下划线元素写法，应使用单下划线 BEM`);
  }

  while ((matched = selectorPattern.exec(scssText))) {
    const selector = matched[1];
    if (selector.startsWith('page-shell')) continue;
    if (isPageClassName(selector)) continue;

    fail(`${page.key} SCSS selector ".${selector}" 不符合 _pg-* BEM 命名`);
  }

  if (page.status === 'commercial-ready' && /::before|::after|:before|:after/.test(scssText)) {
    fail(`${page.key} commercial-ready 页面 SCSS 不应使用伪类绘制功能性元素`);
  }
}

function checkCommercialReadyContract(page, pageText, scssFile) {
  if (page.status !== 'commercial-ready') return;

  if (/即将开放|准备中/.test(pageText)) {
    fail(`${page.key} commercial-ready 页面仍存在占位文案`);
  }

  if (!page.spec || !existsSync(resolve(rootDir, page.spec))) {
    fail(`${page.key} commercial-ready 页面缺少页面说明文档`);
    return;
  }

  const specText = readText(page.spec);
  for (const heading of ['交互矩阵', '状态矩阵', '微信开发工具验收清单']) {
    if (!specText.includes(heading)) fail(`${page.key} commercial-ready 页面文档缺少 ${heading}`);
  }
}

function checkCustomNavbarHeaderSafety(page, pageText) {
  if (!/<PageShell\b[^>]*navbar=\{false\}/.test(pageText)) return;
  if (page.key === 'home') {
    if (!pageText.includes('resolvePageChromeMetrics')) {
      fail(`${page.key} 自定义顶部栏必须使用微信状态栏/胶囊高度指标`);
    }
    return;
  }

  if (!/<PageHeader\b/.test(pageText)) {
    fail(`${page.key} navbar={false} 自定义顶部栏必须通过 PageHeader 承接微信状态栏安全高度`);
  }
}

function checkPage(page) {
  const pageFile = resolvePageTsx(page);
  const scssFile = resolvePageScss(page);
  const configFile = pageFile.replace(/index\.tsx$/, 'index.config.ts');

  if (!pageFile || !existsSync(resolve(rootDir, pageFile))) {
    fail(`${page.key} 缺少页面入口 ${pageFile || '(unknown)'}`);
    return;
  }

  const pageText = readText(pageFile);
  const configText = existsSync(resolve(rootDir, configFile)) ? readText(configFile) : '';
  const tabBarAllowedPages = new Set(['home', 'profile']);

  if (!pageText.includes('PageShell')) {
    fail(`${page.key} 未使用 PageShell`);
  }

  if (!pageText.includes('usePageRuntime')) {
    fail(`${page.key} 未接入 usePageRuntime`);
  }

  if (!/from\s+['"]mobx-react['"]/.test(pageText) || !/\bobserver\s*\(/.test(pageText)) {
    fail(`${page.key} 未使用 mobx-react observer 包裹页面组件`);
  }

  const usesDefaultNavbar = /<PageShell\b(?![^>]*navbar=\{false\})/.test(pageText);
  if (usesDefaultNavbar && !/navigationStyle:\s*['"]custom['"]/.test(configText)) {
    fail(`${page.key} 使用 PageShell 默认 navbar，但 ${configFile} 未声明 navigationStyle: 'custom'`);
  }

  if (/src\/core\/components\/PageLoading/.test(pageText)) {
    fail(`${page.key} 仍引用旧 PageLoading 路径，应使用 src/core/components/loading`);
  }

  const enablesTabBar = /\breserveTabBarSpace(?:\s|>)/.test(pageText)
    || /\breserveTabBarSpace\s*=\s*\{\s*true\s*\}/.test(pageText)
    || /\breserveTabBarSpace\s*=\s*['"]true['"]/.test(pageText);

  if (enablesTabBar && !tabBarAllowedPages.has(page.key)) {
    fail(`${page.key} 不应展示页面内 AppTabBar，仅 home 和 profile 允许开启 reserveTabBarSpace`);
  }

  checkClassNameTokens(page, pageText);
  checkScssClassSelectors(page, scssFile);
  checkCustomNavbarHeaderSafety(page, pageText);
  checkCommercialReadyContract(page, pageText, scssFile);
}

function main() {
  const pages = parseRegistryPages();
  if (pages.length === 0) {
    console.log('OK 未发现登记页面，跳过页面约束检查');
    return;
  }

  for (const page of pages) checkPage(page);

  if (failures.length > 0) {
    for (const message of failures) console.error(`FAIL ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log('OK 小程序页面 PageShell、runtime、observer、navbar 和 _pg BEM 约束检查通过');
}

main();
