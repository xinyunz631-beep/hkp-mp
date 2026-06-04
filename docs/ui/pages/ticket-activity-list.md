# 精选活动页面设计说明

## 基本信息

- 页面：精选活动
- 路由：src/pkg-ticket/pages/activity-list
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-activity-list
- 设计稿名称：精选活动 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-activity-list
- 当前版本：v0.1
- 页面状态：interaction-ready
- 更新时间：2026-05-30
- 实现文件：
  - src/pkg-ticket/pages/activity-list/index.tsx
  - src/pkg-ticket/pages/activity-list/index.scss
  - src/pkg-ticket/pages/activity-list/index.config.ts
  - src/pkg-ticket/services/activity.ts

## 设计意图

精选活动列表页承接首页精选活动“查看全部”。页面通过 service 获取活动列表，列表项点击使用接口返回的 `id` 跳转活动详情页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 活动卡片列表：图片、标题、描述、日期
  - 空列表：`BaseEmpty`

## 动态与静态边界

- 接口图片：列表图片由接口字段 `imageSrc` 返回，页面用 `AppImage` 承载。
- 接口文本/数据：通过页面 service 获取。
- 代码渲染：页面结构、状态、交互和基础样式。
- 本地配置：页面标题、导航策略和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：使用 `BaseEmpty`。
- error：优先使用 `BaseException` 或 `StatusException`。
- 降级态：可降级接口在 service 内返回默认值。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 活动列表 | `fetchActivityListData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 首页精选活动“查看全部”：跳转 `src/pkg-ticket/pages/activity-list`。
- 列表卡片：使用接口返回的 `id` 跳转 `ticket-activity-detail?id={id}`。

## 实现映射

- `src/pkg-ticket/pages/activity-list/index.tsx`：页面主体。
- `src/pkg-ticket/pages/activity-list/index.scss`：页面样式。
- `src/pkg-ticket/pages/activity-list/index.config.ts`：页面配置。
- `src/pkg-ticket/services/activity.ts`：页面 service。

## 变更记录

### v0.1

- 完成精选活动列表页：活动卡片和详情跳转闭环。
- 列表项详情参数统一使用接口返回的 `id`。

## 验证记录

- 待验证。
