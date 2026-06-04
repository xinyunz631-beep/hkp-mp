# 热玩项目页面设计说明

## 基本信息

- 页面：热玩项目
- 路由：src/pkg-ticket/pages/park-list
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-park-list
- 设计稿名称：热玩项目 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-park-list
- 当前版本：v0.2
- 页面状态：interaction-ready
- 更新时间：2026-05-30
- 实现文件：
  - src/pkg-ticket/pages/park-list/index.tsx
  - src/pkg-ticket/pages/park-list/index.scss
  - src/pkg-ticket/pages/park-list/index.config.ts
  - src/pkg-ticket/services/park-list.ts

## 设计意图

热玩项目列表页承接首页热玩榜单“查看全部”。页面通过 service 获取分类 tab 和项目列表，列表项点击使用接口返回的 `id` 跳转项目详情页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 顶部分类 tab：游乐设施、演出；放入 `PageHeader` 固定在导航栏下方
  - 项目列表卡：图片、标题、位置、喜欢数、开放状态、详情入口

## 动态与静态边界

- 接口图片：列表图片由接口字段 `imageSrc` 返回，页面用 `AppImage` 承载。
- 图标资源：优先使用项目封装；NutUI 有匹配项时先封装为项目组件，找不到匹配项时用图片组件预留空地址。
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
| 榜单列表 | `fetchParkListData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 首页热玩榜单“查看全部”：跳转 `src/pkg-ticket/pages/park-list`。
- 顶部 tab：切换当前分类列表。
- 列表卡片：使用接口返回的 `id` 跳转 `ticket-park-detail?id={id}`。

## 实现映射

- `src/pkg-ticket/pages/park-list/index.tsx`：页面主体。
- `src/pkg-ticket/pages/park-list/index.scss`：页面样式。
- `src/pkg-ticket/pages/park-list/index.config.ts`：页面配置。
- `src/pkg-ticket/services/park-list.ts`：页面 service。

## 变更记录

### v0.2

- 完成热玩项目列表页：分类 tab、项目列表卡和详情跳转闭环。
- 列表项详情参数统一使用接口返回的 `id`。

### v0.1

- 初始化页面基础实现。

## 验证记录

- 待验证。
