#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDir = process.cwd();
const failures = [];
const sourceDir = resolve(rootDir, 'src');
const appConfigPath = resolve(rootDir, 'src/app.config.ts');
const forbiddenTextIconPattern = /[♡♥❤💕✨✦▱›→←★☆◆×✕✖📍📞☎]/u;
const forbiddenUserFacingInternalTextPattern = /按票种生成|实名槽位|生成\s*\{[^}]+\}\s*位实名信息/;

function fail(message) {
  failures.push(message);
}

function readText(path) {
  return readFileSync(resolve(rootDir, path), 'utf8');
}

function walkSourceFiles(dir) {
  if (!existsSync(dir)) return [];

  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) files.push(fullPath);
  }

  return files;
}

function walkStyleFiles(dir) {
  if (!existsSync(dir)) return [];

  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...walkStyleFiles(fullPath));
      continue;
    }

    if (/\.(scss|css)$/.test(entry)) files.push(fullPath);
  }

  return files;
}

function checkForbiddenTextIconGlyphs() {
  const sourceFiles = walkSourceFiles(sourceDir);

  for (const filePath of sourceFiles) {
    const relativePath = filePath.replace(`${rootDir}/`, '');
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

    lines.forEach((line, index) => {
      const matched = line.match(forbiddenTextIconPattern);
      if (!matched) return;

      fail(`${relativePath}:${index + 1} 禁止用文本符号 "${matched[0]}" 充当图标，应使用 AppIcon / NutUI icon / 项目图标组件`);
    });
  }
}

function checkFontWeightCeiling() {
  const styleFiles = walkStyleFiles(sourceDir);
  const overweightPattern = /font-weight:\s*(50[1-9]|5[1-9]\d|[6-9]\d{2}|[1-9]\d{3,})\s*;/;

  for (const filePath of styleFiles) {
    const relativePath = filePath.replace(`${rootDir}/`, '');
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

    lines.forEach((line, index) => {
      const matched = line.match(overweightPattern);
      if (!matched) return;

      fail(`${relativePath}:${index + 1} font-weight ${matched[1]} 超过 500，正文默认 normal，强调文本优先使用 font-weight: 500`);
    });
  }
}

function checkShareTimelineForbidden() {
  const sourceFiles = walkSourceFiles(sourceDir);
  const forbiddenShareTimelinePattern = /\b(useShareTimeline|onShareTimeline|shareTimeline)\b/;

  for (const filePath of sourceFiles) {
    const relativePath = filePath.replace(`${rootDir}/`, '');
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

    lines.forEach((line, index) => {
      const matched = line.match(forbiddenShareTimelinePattern);
      if (!matched) return;

      fail(`${relativePath}:${index + 1} 禁止使用 ${matched[1]}，项目分享只允许微信好友分享`);
    });
  }
}

function checkForbiddenUserFacingInternalTexts() {
  const sourceFiles = walkSourceFiles(sourceDir);

  for (const filePath of sourceFiles) {
    const relativePath = filePath.replace(`${rootDir}/`, '');
    const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

    lines.forEach((line, index) => {
      const matched = line.match(forbiddenUserFacingInternalTextPattern);
      if (!matched) return;

      fail(`${relativePath}:${index + 1} 存在高风险实现层文案 "${matched[0]}"，页面可见文案必须使用游客能理解的业务话术`);
    });
  }
}

function extractArrayItems(arrayBody) {
  const items = [];
  const itemPattern = /['"]([^'"]+)['"]/g;
  let matched;

  while ((matched = itemPattern.exec(arrayBody))) {
    items.push(matched[1]);
  }

  return items;
}

function resolvePackagePageKey(root, pagePath) {
  const packageName = root.replace(/^pkg-/, '');
  const pageKey = pagePath.replace(/^pages\//, '').replace(/\/index$/, '');

  if (pageKey === 'index') return `${packageName}-home`;
  if (pageKey.startsWith(`${packageName}-`)) return pageKey;
  return `${packageName}-${pageKey}`;
}

function createPageContract(key, route) {
  return {
    key,
    implementation: {
      files: [
        `${route}/index.tsx`,
        `${route}/index.scss`,
      ],
    },
    route,
  };
}

function discoverPagesFromAppConfig() {
  if (!existsSync(appConfigPath)) return [];

  const configText = readFileSync(appConfigPath, 'utf8');
  const pages = [];
  const mainPagesMatch = configText.match(/pages:\s*\[([\s\S]*?)\]\s*,\s*window:/);

  if (mainPagesMatch) {
    for (const pagePath of extractArrayItems(mainPagesMatch[1])) {
      const pageKey = pagePath.replace(/^pages\//, '').replace(/\/index$/, '');
      pages.push(createPageContract(pageKey, `src/${pagePath.replace(/\/index$/, '')}`));
    }
  }

  const subPackagePattern = /root:\s*['"]([^'"]+)['"][\s\S]*?pages:\s*\[([\s\S]*?)\]/g;
  let matched;

  while ((matched = subPackagePattern.exec(configText))) {
    const [, root, pageArrayBody] = matched;
    for (const pagePath of extractArrayItems(pageArrayBody)) {
      const pageKey = resolvePackagePageKey(root, pagePath);
      pages.push(createPageContract(pageKey, `src/${root}/${pagePath.replace(/\/index$/, '')}`));
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

  const fullScreenHeaderAllowList = new Set(['member-code']);
  if (!fullScreenHeaderAllowList.has(page.key) && !pageText.includes('navigateBackOrHome')) {
    fail(`${page.key} navbar={false} 业务页必须提供显式返回入口 navigateBackOrHome`);
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
  const tabBarAllowedPages = new Set(['home', 'member']);

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
    fail(`${page.key} 不应展示页面内 AppTabBar，仅 home 和 member 允许开启 reserveTabBarSpace`);
  }

  checkClassNameTokens(page, pageText);
  checkScssClassSelectors(page, scssFile);
  checkCustomNavbarHeaderSafety(page, pageText);
}

function main() {
  const pages = discoverPagesFromAppConfig();
  checkForbiddenTextIconGlyphs();
  checkForbiddenUserFacingInternalTexts();
  checkFontWeightCeiling();
  checkShareTimelineForbidden();

  if (pages.length === 0) {
    if (failures.length > 0) {
      for (const message of failures) console.error(`FAIL ${message}`);
      process.exitCode = 1;
      return;
    }

    console.log('OK 未发现 app.config.ts 注册页面，跳过页面约束检查');
    return;
  }

  for (const page of pages) checkPage(page);

  if (failures.length > 0) {
    for (const message of failures) console.error(`FAIL ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log('OK 小程序页面 PageShell、runtime、observer、navbar、_pg BEM、文本图标、font-weight 和分享约束检查通过');
}

main();
