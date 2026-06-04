# 节目单页面设计说明

## 基本信息

- 页面：节目单
- 路由：src/pkg-ticket/pages/schedule
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-schedule
- 设计稿名称：节目单 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-schedule
- 当前版本：v0.2
- 页面状态：interaction-ready
- 更新时间：2026-05-30
- 实现文件：
  - src/pkg-ticket/pages/schedule/index.tsx
  - src/pkg-ticket/pages/schedule/index.scss
  - src/pkg-ticket/pages/schedule/index.config.ts
  - src/pkg-ticket/services/schedule.ts

## 设计意图

节目单页面承接首页“今日开园时间”卡片点击。页面只展示当天日期标题，具体节目内容完全渲染接口返回富文本，由后端配置图片、文字和排版。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 当天日期标题
  - 接口富文本节目内容

## 动态与静态边界

- 接口图片：由接口富文本配置，页面不拆字段、不自定义节目卡片。
- 图标资源：页面不额外绘制节目图标，富文本内容由后端配置。
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
| 日期标题 | `fetchScheduleData().dateText` | service 内归一和兜底 | 是 |
| 节目内容富文本 | `fetchScheduleData().richTextHtml` | service 内返回默认富文本 | 是 |

## 交互与跳转

- 首页今日开园时间卡：跳转 `src/pkg-ticket/pages/schedule`。
- 页面内容仅展示信息，不要求登录。

## 实现映射

- `src/pkg-ticket/pages/schedule/index.tsx`：页面主体。
- `src/pkg-ticket/pages/schedule/index.scss`：页面样式。
- `src/pkg-ticket/pages/schedule/index.config.ts`：页面配置。
- `src/pkg-ticket/services/schedule.ts`：页面 service。

## 变更记录

### v0.2

- 完成当天节目单落地页主体：页面只保留日期标题和接口富文本渲染，不在前端拆节目单 UI。
- 首页“今日开园时间”卡片改为进入节目单页。

### v0.1

- 初始化页面基础实现。

## 验证记录

- 待验证。
