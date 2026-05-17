import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = process.cwd();
const uiRoot = resolve(projectRoot, 'docs/ui');
const registryPath = resolve(uiRoot, 'page-registry.yaml');
const validPageStatuses = new Set([
  'design-draft',
  'design-review',
  'design-approved',
  'implementation-ready',
  'implementing',
  'implemented',
  'wireframe',
  'visual-ready',
  'interaction-ready',
  'commercial-ready',
  'verified',
  'design-changed',
]);
const statusesWithImplementation = new Set([
  'implementing',
  'implemented',
  'wireframe',
  'visual-ready',
  'interaction-ready',
  'commercial-ready',
  'verified',
]);

function fail(message) {
  console.error(`UI Contract 检查失败：${message}`);
  process.exitCode = 1;
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

// 去除 registry 中简单标量两侧的引号，保持脚本不依赖额外 YAML 包。
function normalizeScalar(value) {
  return value.trim().replace(/^['"]|['"]$/g, '');
}

// 解析缩进层级，当前 registry 只使用空格缩进。
function getIndent(line) {
  return line.match(/^ */)[0].length;
}

// 从 page-registry.yaml 中读取 pages 区块里的页面条目。
function parseRegistryPages(registryContent) {
  const pages = [];
  const lines = registryContent.split(/\r?\n/);
  let inPagesBlock = false;
  let currentPage;
  let currentBlock;
  let currentNestedBlock;
  let currentListKey;

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const indent = getIndent(line);
    const trimmed = line.trim();

    if (indent === 0) {
      inPagesBlock = trimmed === 'pages:';
      currentPage = undefined;
      currentBlock = undefined;
      currentNestedBlock = undefined;
      currentListKey = undefined;
      continue;
    }

    if (!inPagesBlock) continue;

    if (indent === 2) {
      const pageMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*$/);
      if (!pageMatch) {
        fail(`page-registry.yaml 的 pages 区块存在无法识别的页面行：${trimmed}`);
        continue;
      }

      currentPage = {
        key: pageMatch[1],
        design: {},
        implementation: {
          files: [],
          verification: [],
        },
      };
      pages.push(currentPage);
      currentBlock = undefined;
      currentNestedBlock = undefined;
      currentListKey = undefined;
      continue;
    }

    if (!currentPage) continue;

    if (indent === 4) {
      const fieldMatch = trimmed.match(/^([a-zA-Z0-9_-]+):(?:\s*(.*))?$/);
      if (!fieldMatch) continue;

      const [, key, rawValue = ''] = fieldMatch;
      currentBlock = key;
      currentNestedBlock = undefined;
      currentListKey = undefined;

      if (!rawValue) {
        if (key === 'design' && !currentPage.design) currentPage.design = {};
        if (key === 'implementation' && !currentPage.implementation) {
          currentPage.implementation = {
            files: [],
            verification: [],
          };
        }
        continue;
      }

      currentPage[key] = normalizeScalar(rawValue);
      continue;
    }

    if (indent === 6 && currentBlock === 'design') {
      const fieldMatch = trimmed.match(/^([a-zA-Z0-9_-]+):(?:\s*(.*))?$/);
      if (!fieldMatch) continue;

      const [, key, rawValue = ''] = fieldMatch;
      currentNestedBlock = undefined;

      if (!rawValue) {
        currentPage.design[key] = {};
        currentNestedBlock = key;
        continue;
      }

      currentPage.design[key] = normalizeScalar(rawValue);
      continue;
    }

    if (indent === 8 && currentBlock === 'design' && currentNestedBlock) {
      const fieldMatch = trimmed.match(/^([a-zA-Z0-9_-]+):(?:\s*(.*))?$/);
      if (!fieldMatch) continue;

      const [, key, rawValue = ''] = fieldMatch;
      currentPage.design[currentNestedBlock][key] = normalizeScalar(rawValue);
      continue;
    }

    if (indent === 6 && currentBlock === 'implementation') {
      const listMatch = trimmed.match(/^([a-zA-Z0-9_-]+):\s*$/);
      if (listMatch) {
        currentListKey = listMatch[1];
        currentPage.implementation[currentListKey] = [];
      }
      continue;
    }

    if (indent === 8 && currentBlock === 'implementation' && currentListKey) {
      const itemMatch = trimmed.match(/^-\s+(.+?)\s*$/);
      if (itemMatch) {
        currentPage.implementation[currentListKey].push(normalizeScalar(itemMatch[1]));
      }
    }
  }

  return pages;
}

function checkRequiredFiles() {
  const requiredFiles = [
    'README.md',
    'tokens.md',
    'components.md',
    'states.md',
    'service-rules.md',
    'workflows.md',
    'page-spec-template.md',
    'page-registry.yaml',
  ];

  for (const fileName of requiredFiles) {
    const filePath = resolve(uiRoot, fileName);
    if (!existsSync(filePath)) {
      fail(`缺少 docs/ui/${fileName}`);
    }
  }
}

function checkPageSpec(page) {
  if (!page.route) {
    fail(`页面 ${page.key} 缺少 route 字段`);
  } else if (!existsSync(resolve(projectRoot, page.route))) {
    fail(`页面 ${page.key} 的 route 路径不存在：${page.route}`);
  }

  if (!page.status) {
    fail(`页面 ${page.key} 缺少 status 字段`);
  } else if (!validPageStatuses.has(page.status)) {
    fail(`页面 ${page.key} 的 status 不在状态机内：${page.status}`);
  }

  if (!page.spec) {
    fail(`页面 ${page.key} 缺少 spec 字段`);
    return;
  }

  const specPath = resolve(projectRoot, page.spec);
  if (!existsSync(specPath)) {
    fail(`页面 ${page.key} 的设计文档不存在：${page.spec}`);
    return;
  }

  const content = readText(specPath);
  const requiredSections = [
    '## 基本信息',
    '## 设计意图',
    '## 页面结构',
    '## 动态与静态边界',
    '## 状态要求',
    '## 接口与 Service',
    '## 交互与跳转',
    '## 实现映射',
    '## 变更记录',
    '## 验证记录',
  ];

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      fail(`页面 ${page.key} 的设计文档缺少章节：${section}`);
    }
  }

  if (page.route && !content.includes(page.route)) {
    fail(`页面 ${page.key} 的设计文档未记录 registry 中的 route：${page.route}`);
  }

  if (!page.design?.currentTool) {
    fail(`页面 ${page.key} 缺少 design.currentTool`);
  }

  if (page.design?.currentTool === 'pencil') {
    const pencilDesign = page.design.pencil ?? {};
    for (const field of ['nodeId', 'name', 'width']) {
      if (!pencilDesign[field]) {
        fail(`页面 ${page.key} 缺少 design.pencil.${field}`);
      }
    }
  }

  if (page.design?.currentTool === 'figma') {
    const figmaDesign = page.design.figma ?? {};
    for (const field of ['fileKey', 'nodeId']) {
      if (!figmaDesign[field]) {
        fail(`页面 ${page.key} 缺少 design.figma.${field}`);
      }
    }
  }

  if (statusesWithImplementation.has(page.status)) {
    const implementationFiles = page.implementation?.files ?? [];
    if (implementationFiles.length === 0) {
      fail(`页面 ${page.key} 已进入实现阶段，但 implementation.files 为空`);
    }

    for (const filePath of implementationFiles) {
      if (!existsSync(resolve(projectRoot, filePath))) {
        fail(`页面 ${page.key} 的实现文件不存在：${filePath}`);
      }
    }
  }
}

checkRequiredFiles();

if (existsSync(registryPath)) {
  const registryContent = readText(registryPath);
  const pages = parseRegistryPages(registryContent);

  if (pages.length === 0) {
    fail('page-registry.yaml 没有登记任何页面');
  }

  for (const page of pages) {
    checkPageSpec(page);
  }
}

if (!process.exitCode) {
  console.log('OK UI Contract 文档、页面索引和页面设计说明检查通过');
}
