# 乐园资讯页面设计说明

## 基本信息

- 页面：乐园资讯
- 路由：src/pkg-ticket/pages/activity-detail
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-activity-detail
- 设计稿名称：乐园资讯 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-activity-detail
- 当前版本：v0.1
- 页面状态：interaction-ready
- 更新时间：2026-05-30
- 实现文件：
  - src/pkg-ticket/pages/activity-detail/index.tsx
  - src/pkg-ticket/pages/activity-detail/index.scss
  - src/pkg-ticket/pages/activity-detail/index.config.ts
  - src/pkg-ticket/services/activity.ts

## 设计意图

乐园资讯页根据路由 `id` 请求内容详情。精选活动、精彩推荐和玩转乐园都复用本页面；页面只承载接口返回的顶部图片、标题/副标题、微信好友分享和富文本正文，不把正文拆成前端硬编码模块。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 顶部活动图片
  - 标题区：标题、副标题、分享
  - 接口正文内容

## 动态与静态边界

- 接口图片：顶部图片由接口字段 `imageSrc` 返回，页面用 `AppImage` 承载。
- 接口富文本：正文由接口字段 `richTextHtml` 返回，页面用 `TicketRichText` 承载，组件外层提供默认富文本样式，并给常见标签补 inline style 兜底。
- 接口文本/数据：通过页面 service 获取。
- 代码渲染：页面结构、状态、交互和基础样式。

## 状态要求

- loading：页面运行时统一承接。
- empty：优先使用 `BaseEmpty`。
- error：优先使用 `BaseException` 或 `StatusException`。
- 缺少 id：service 返回默认活动兜底。
- 降级态：可降级接口在 service 内返回默认值。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 内容详情 | `fetchActivityDetailData(id)` | service 内归一和兜底 | 是 |

## 交互与跳转

- 页面进入：从路由参数读取接口数据里的 `id`，调用 `fetchActivityDetailData(id)`。
- 分享：使用微信好友分享，分享路径携带接口数据里的 `id`。

## 实现映射

- `src/pkg-ticket/pages/activity-detail/index.tsx`：页面主体。
- `src/pkg-ticket/pages/activity-detail/index.scss`：页面样式。
- `src/pkg-ticket/pages/activity-detail/index.config.ts`：页面配置。
- `src/pkg-ticket/services/activity.ts`：页面 service。

## 变更记录

### v0.1

- 完成乐园资讯页：顶部图片、标题区、分享和接口正文内容。
- 详情请求和分享路径统一使用接口返回的 `id`。

## 验证记录

- 待验证。
