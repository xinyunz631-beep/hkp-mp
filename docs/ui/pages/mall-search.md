# 商品搜索页面设计说明

## 基本信息

- 页面：商品搜索
- 路由：src/pkg-mall/pages/search
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：mall-search
- 设计稿名称：商品搜索 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：mall-search
- 当前版本：v0.4-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-mall/pages/search/index.tsx
  - src/pkg-mall/pages/search/index.scss
  - src/pkg-mall/pages/search/index.config.ts
  - src/pkg-mall/services/search.ts
  - src/core/components/AppSearchBar/index.tsx

## 设计意图

商品搜索页按截图实现搜索头和热门搜索关键词，搜索输入使用项目 `AppSearchBar`，底层承接 NutUI `SearchBar`，不在页面内手写输入框、清除按钮或搜索图标。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 顶部区域：`PageHeader` 承接返回、搜索框和取消按钮，由 `PageShell` 注入微信状态栏高度和胶囊避让。
- 内容区域：热门搜索关键词区。

## 动态与静态边界

- 接口图片：真实图片区域统一用项目封装 `AppImage`，render 内以空字符串变量预留地址，由组件承接加载中、淡入和失败态。
- 图标资源：优先使用项目封装；搜索框图标和清除能力由 `AppSearchBar` / NutUI `SearchBar` 承接。
- 接口文本/数据：通过页面 service 获取。
- 代码渲染：页面结构、状态、交互和基础样式。
- 本地配置：页面标题、导航策略和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：优先使用 `BaseEmpty`。
- error：优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。
- 降级态：可降级接口在 service 内返回默认值。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchSearchData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 取消按钮统一走 `navigateBackOrHome()`。
- 左侧返回按钮统一走 `navigateBackOrHome()`。
- 搜索框支持输入、清除和键盘搜索；输入为空时使用默认关键词，默认关键词也不存在时展示微信 toast。
- 热门关键词进入 `mall-products`。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 返回 / 取消 | `navigateBackOrHome()` |
| 搜索框输入 | 更新本地 query |
| 搜索框清除 | 清空本地 query，不触发跳转 |
| 键盘搜索 | 带当前关键词进入商品列表；空关键词时使用默认关键词 |
| 热门关键词 | 带关键词进入商品列表 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化搜索数据 |
| 微信顶部安全区 | `PageHeader` 自动避让状态栏和胶囊 |
| 空关键词搜索 | 默认关键词兜底；无默认关键词时展示微信 toast |

## 微信开发工具验收清单

- 顶部返回、搜索框、取消按钮不得被状态栏或右侧胶囊遮挡。
- 点击返回 / 取消应回上一页或回首页。
- 在搜索框输入关键词后点击键盘搜索，应带关键词进入商品列表。
- 点击搜索框清除按钮，应只清空输入，不应跳转。
- 点击热门关键词应进入商品列表。

## 实现映射

- `src/pkg-mall/pages/search/index.tsx`：页面主体。
- `src/pkg-mall/pages/search/index.scss`：页面样式。
- `src/pkg-mall/pages/search/index.config.ts`：页面配置。
- `src/pkg-mall/services/search.ts`：页面 service。
- `src/core/components/AppSearchBar/index.tsx`：项目级 NutUI 搜索框封装。

## 变更记录

### v0.4-interaction-ready

- 搜索框改用项目组件 `AppSearchBar`，底层使用 NutUI `SearchBar`。
- 补齐输入、清除、键盘搜索和空关键词 toast 兜底，修复清除按钮点击误触发搜索的问题。

### v0.3-interaction-ready

- 搜索页顶部迁入 `PageHeader`，补回左侧返回按钮并统一微信顶部安全区。

### v0.2

- 按搜索截图补齐搜索头和热门搜索首版。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
- `2026-05-18`：待复验 `AppSearchBar` 输入、清除和键盘搜索。
