#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const rootDir = process.cwd();
const args = process.argv.slice(2);

function fail(message) {
  console.error(`创建页面失败：${message}`);
  process.exit(1);
}

function info(message) {
  console.log(message);
}

function readText(path) {
  return readFileSync(join(rootDir, path), 'utf8');
}

function writeText(path, content) {
  writeFileSync(join(rootDir, path), content);
}

function toKebabCase(value) {
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toPascalCase(value) {
  return toKebabCase(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function toCamelCase(value) {
  const pascalName = toPascalCase(value);
  return pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
}

function startsWithPackagePrefix(pageKey, packageName) {
  return Boolean(packageName) && pageKey.startsWith(`${packageName}-`);
}

function resolveRouteConstantKey(pageKey, packageName) {
  if (!packageName) return toCamelCase(pageKey);
  if (pageKey === 'index') return toCamelCase(`${packageName}-home`);
  if (startsWithPackagePrefix(pageKey, packageName)) return toCamelCase(pageKey);
  return toCamelCase(`${packageName}-${pageKey}`);
}

function parseOptions(rawArgs) {
  const [command, rawPageKey, ...rest] = rawArgs;
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }
  if (command !== 'create') fail('当前脚本只支持 create 命令');
  if (!rawPageKey) fail('缺少页面 key，例如：yarn mp:page create member-code --package member --title 会员码');

  const options = {
    command,
    pageKey: toKebabCase(rawPageKey),
    title: rawPageKey,
    packageName: '',
    systemNavbar: false,
    customNavbar: false,
    loginRequired: false,
    service: true,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--title') {
      options.title = rest[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--package') {
      options.packageName = toKebabCase(rest[index + 1] || '');
      index += 1;
      continue;
    }
    if (arg === '--main') {
      options.packageName = '';
      continue;
    }
    if (arg === '--system-navbar') {
      options.systemNavbar = true;
      continue;
    }
    if (arg === '--custom-navbar') {
      options.customNavbar = true;
      continue;
    }
    if (arg === '--login-required') {
      options.loginRequired = true;
      continue;
    }
    if (arg === '--no-service') {
      options.service = false;
      continue;
    }
    fail(`无法识别参数：${arg}`);
  }

  if (!options.pageKey) fail('页面 key 只能包含字母、数字或分隔符');
  if (!options.title) options.title = options.pageKey;
  if (options.systemNavbar && options.customNavbar) fail('不能同时指定 --system-navbar 和 --custom-navbar');
  return options;
}

function printHelp() {
  info(`用法：
  yarn mp:page create member-code --package member --title 会员码 --system-navbar --login-required

常用参数：
  --package <name>     创建到 src/pkg-<name>/pages
  --main               创建到 src/pages
  --title <title>      页面标题
  --system-navbar      使用微信系统导航，PageShell 传 navbar={false}
  --custom-navbar      使用 PageShell 默认自定义导航，并写 navigationStyle: 'custom'
  --login-required     usePageRuntime 默认要求登录
  --no-service         不生成页面 service`);
}

function resolvePaths(options) {
  const isPackagePage = Boolean(options.packageName);
  const packageRoot = isPackagePage ? `pkg-${options.packageName}` : '';
  const pageRoute = isPackagePage
    ? `src/${packageRoot}/pages/${options.pageKey}`
    : `src/pages/${options.pageKey}`;
  const serviceRoute = isPackagePage
    ? `src/${packageRoot}/services/${options.pageKey}.ts`
    : `src/core/services/${options.pageKey}.ts`;
  const appConfigPage = isPackagePage ? `pages/${options.pageKey}/index` : `pages/${options.pageKey}/index`;
  const routeValue = isPackagePage ? `/${packageRoot}/pages/${options.pageKey}/index` : `/pages/${options.pageKey}/index`;

  return {
    isPackagePage,
    packageRoot,
    pageRoute,
    serviceRoute,
    appConfigPage,
    routeValue,
  };
}

function renderTemplate(fileName, replacements) {
  let content = readText(`templates/mp-page/${fileName}`);
  for (const [key, value] of Object.entries(replacements)) {
    content = content.split(`__${key}__`).join(value);
  }
  return content;
}

function buildRuntimeOptions(options, paths, names) {
  const fields = [];
  if (options.service) {
    fields.push(`initPage: async () => {
      await fetch${names.pascalName}Data();
    }`);
  }
  if (options.loginRequired) {
    fields.push('loginRequired: true');
    fields.push(`loginReason: '登录后可查看${options.title}'`);
  }

  if (fields.length === 0) return '{}';
  return `{
    ${fields.join(',\n    ')},
  }`;
}

function appendRouteConstant(paths, names) {
  const routeFile = 'src/core/constants/routes.ts';
  const text = readText(routeFile);
  const routeGroup = paths.isPackagePage ? 'MINI_PACKAGE_ROUTES' : 'MINI_MAIN_ROUTES';
  const routeLine = `  ${names.routeKey}: '${paths.routeValue}',`;

  if (text.includes(`${names.routeKey}: '${paths.routeValue}'`)) return;

  const pattern = new RegExp(`(export const ${routeGroup} = \\{\\n)([\\s\\S]*?)(\\n\\} as const;)`);
  const nextText = text.replace(pattern, (_match, start, body, end) => {
    const normalizedBody = body.endsWith('\n') ? body : `${body}\n`;
    return `${start}${normalizedBody}${routeLine}\n${end}`;
  });
  if (nextText === text) fail(`无法更新 ${routeFile} 中的 ${routeGroup}`);
  writeText(routeFile, nextText);
}

function registerAppConfig(paths) {
  const configFile = 'src/app.config.ts';
  const text = readText(configFile);

  if (!paths.isPackagePage) {
    const pageLine = `    '${paths.appConfigPage}',`;
    if (text.includes(`'${paths.appConfigPage}'`)) return;
    const nextText = text.replace(/(pages:\s*\[\n)([\s\S]*?)(\s*\],\n\s*window:)/, (_match, start, body, end) => `${start}${body}${pageLine}\n${end}`);
    if (nextText === text) fail(`无法把 ${paths.appConfigPage} 注册到主包 pages`);
    writeText(configFile, nextText);
    return;
  }

  const blockPattern = new RegExp(`(root:\\s*'${paths.packageRoot}'[\\s\\S]*?pages:\\s*\\[)([^\\]]*)(\\])`);
  const nextText = text.replace(blockPattern, (_match, start, body, end) => {
    const pages = [];
    const pagePattern = /['"]([^'"]+)['"]/g;
    let match;
    while ((match = pagePattern.exec(body))) pages.push(match[1]);
    if (pages.includes(paths.appConfigPage)) return `${start}${body}${end}`;
    pages.push(paths.appConfigPage);
    return `${start}${pages.map((page) => `'${page}'`).join(', ')}${end}`;
  });

  if (nextText === text) fail(`无法把 ${paths.appConfigPage} 注册到 ${paths.packageRoot}`);
  writeText(configFile, nextText);
}

function createPageFiles(options, paths, names) {
  if (existsSync(join(rootDir, paths.pageRoute))) {
    fail(`页面已存在：${paths.pageRoute}。请进入更新模式，直接修改已有页面。`);
  }

  mkdirSync(join(rootDir, paths.pageRoute), { recursive: true });
  if (options.service) {
    const serviceDir = paths.serviceRoute.split('/').slice(0, -1).join('/');
    mkdirSync(join(rootDir, serviceDir), { recursive: true });
  }

  const pageClassName = `${options.pageKey}-page`;
  const serviceImport = options.service
    ? `import { fetch${names.pascalName}Data } from '@/${paths.serviceRoute.replace(/^src\//, '').replace(/\.ts$/, '')}';\n`
    : '';
  const pageShellProps = options.systemNavbar ? ' navbar={false}' : '';
  const navigationStyle = options.systemNavbar ? '' : ",\n  navigationStyle: 'custom',";

  const replacements = {
    PAGE_TITLE: options.title,
    PAGE_COMPONENT_NAME: `${names.pascalName}Page`,
    PAGE_CLASS_NAME: pageClassName,
    PAGE_PASCAL_NAME: names.pascalName,
    SERVICE_IMPORT: serviceImport,
    RUNTIME_OPTIONS: buildRuntimeOptions(options, paths, names),
    PAGE_SHELL_PROPS: pageShellProps,
    NAVIGATION_STYLE: navigationStyle,
  };

  writeText(`${paths.pageRoute}/index.tsx`, renderTemplate('page.tsx.tpl', replacements));
  writeText(`${paths.pageRoute}/index.scss`, renderTemplate('page.scss.tpl', replacements));
  writeText(`${paths.pageRoute}/index.config.ts`, renderTemplate('config.ts.tpl', replacements));

  if (options.service && !existsSync(join(rootDir, paths.serviceRoute))) {
    writeText(paths.serviceRoute, renderTemplate('service.ts.tpl', replacements));
  }
}

function main() {
  const options = parseOptions(args);
  const paths = resolvePaths(options);
  const names = {
    pascalName: toPascalCase(options.pageKey),
    camelName: toCamelCase(options.pageKey),
    routeKey: resolveRouteConstantKey(options.pageKey, options.packageName),
  };

  createPageFiles(options, paths, names);
  appendRouteConstant(paths, names);
  registerAppConfig(paths);

  info(`OK 已创建页面 ${options.pageKey}`);
  info(`页面路径：${paths.pageRoute}`);
}

main();
