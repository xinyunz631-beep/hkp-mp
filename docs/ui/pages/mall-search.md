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
- 当前版本：v0.5-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-19
- 实现文件：
  - src/pkg-mall/pages/search/index.tsx
  - src/pkg-mall/pages/search/index.scss
  - src/pkg-mall/pages/search/index.config.ts
  - src/pkg-mall/services/search.ts
  - src/core/components/AppSearchBar/index.tsx

## 设计意图

商品搜索页按商用搜索入口处理首页搜索链路：进入页面默认聚焦输入框，键盘确认键为微信 `search`，输入内容变化后节流请求相关商品接口并支持查看全部进入商品列表结果页；页面只保留左侧返回，不同时展示“取消”和返回两个同义动作。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 顶部区域：`PageHeader` 承接返回和搜索框，由 `PageShell` 注入微信状态栏高度和胶囊避让。
- 内容区域：空输入时展示热门搜索和历史搜索；输入关键词后展示相关商品列表，命中关键词标红。

## 动态与静态边界

- 接口图片：真实图片区域统一用项目封装 `AppImage`，render 内以空字符串变量预留地址，由组件承接加载中、淡入和失败态。
- 图标资源：优先使用项目封装；搜索框图标和清除能力由 `AppSearchBar` 承接。
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
| 静态配置 | `getMallSearchData()` | service 内归一和兜底 | 否 |
| 历史搜索 | `readMallSearchHistory()` / `saveMallSearchKeyword()` | 读取失败返回空数组 | 否 |
| 相关商品 | `fetchMallSearchRelatedProducts()` | service 内归一和兜底 | 否 |

## 交互与跳转

- 左侧返回按钮统一走 `navigateBackOrHome()`。
- 搜索框进入页面默认聚焦，使用微信 `confirmType="search"`。
- `initPage` 只读取本地历史搜索；热门词和 placeholder 不触发初始化请求。
- 搜索框支持输入、清除和键盘搜索；输入为空时展示微信 toast，不自动带默认词。
- 输入关键词后 300ms 节流请求相关商品接口，商品名命中片段标红。
- 相关商品点击进入商品详情；“查看全部”和热门关键词进入 `mall-products?keyword=...`。
- 提交搜索、点击历史搜索或点击相关商品进入详情时写入本地历史搜索，最新排最前，同词去重，最多保留 10 条；历史搜索展示在热门搜索下方，按文本和淡灰色下划线列表展示。
- 历史搜索右侧提供“清空”文字和删除图标，点击后必须先弹微信确认，确认后再清空本地缓存和页面列表。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 返回 | `navigateBackOrHome()` |
| 搜索框输入 | 更新本地 query |
| 搜索框清除 | 清空本地 query，不触发跳转 |
| 输入停顿 | 节流请求相关商品接口 |
| 键盘搜索 | 带当前关键词进入商品列表；空关键词展示 toast |
| 热门关键词 | 带关键词进入商品列表 |
| 历史搜索 | 带关键词进入商品列表，并更新为最新历史 |
| 历史搜索清空 | 微信确认弹窗确认后清空本地历史，入口展示删除图标和清空文字 |
| 相关商品 | 进入商品详情，并把当前搜索词写入历史 |
| 查看全部 | 带当前关键词进入商品列表 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 读取本地历史搜索 |
| 微信顶部安全区 | `PageHeader` 自动避让状态栏和胶囊 |
| 初始进入 | 搜索框自动聚焦，query 为空，展示热门搜索和历史搜索 |
| 空关键词搜索 | 展示微信 toast，不自动带默认词 |
| 历史搜索为空 | 不展示历史搜索板块 |
| 有关键词且有匹配 | 展示相关商品，命中关键词标红 |
| 有关键词且无匹配 | 使用统一 `BaseEmpty` / NutUI Empty 空态 |
| 清空历史取消 | 保留现有历史搜索 |
| 清空历史确认 | 历史搜索板块消失，缓存同步清空 |

## 微信开发工具验收清单

- 顶部返回、搜索框不得被状态栏或右侧胶囊遮挡。
- 进入页面后搜索框默认聚焦，键盘右下角应为搜索。
- 点击返回应回上一页或回首页。
- 在搜索框输入关键词后点击键盘搜索，应带关键词进入商品列表。
- 点击搜索框清除按钮，应只清空输入，不应跳转。
- 点击热门关键词应进入商品列表。
- 执行搜索后回到搜索页，应在热门搜索下方看到最新历史搜索，最多只保留 10 条。
- 点击历史搜索右侧“清空”应先出现确认弹窗；取消不清空，确认后历史列表消失。
- 输入关键词后相关商品名称命中片段应标红；点击相关商品应进入商品详情。
- 点击相关商品后回到搜索页，应看到当前搜索词写入历史搜索。

## 实现映射

- `src/pkg-mall/pages/search/index.tsx`：页面主体。
- `src/pkg-mall/pages/search/index.scss`：页面样式。
- `src/pkg-mall/pages/search/index.config.ts`：页面配置。
- `src/pkg-mall/services/search.ts`：页面 service。
- `src/core/components/AppSearchBar/index.tsx`：项目级微信搜索框封装。

## 变更记录

### v0.5-interaction-ready

- 搜索页去掉右侧取消按钮，只保留左侧返回。
- 进入页面后搜索框默认聚焦，使用微信 `search` 键盘确认。
- 搜索默认 query 置空，不再预填默认关键词。
- 输入关键词后展示相关商品，命中关键词标红，并支持查看全部进入商品列表结果页。
- 输入内容变化后节流请求相关商品接口；`initPage` 收敛为只读取本地历史搜索。
- 新增历史搜索缓存和展示，读写都只保留最近 10 条，展示为文本加淡灰色下划线列表。
- 相关商品点击也写入历史搜索；历史搜索清空增加微信确认拦截。
- 历史搜索清空入口补充删除图标，并放大文字提升可点击感。
- 空态回到统一 `BaseEmpty` / NutUI Empty，不再展示自造文字图形。

### v0.4-interaction-ready

- 搜索框改用项目组件 `AppSearchBar`。
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
