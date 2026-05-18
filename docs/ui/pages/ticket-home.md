# 票务首页页面设计说明

## 基本信息

- 页面：票务首页
- 路由：src/pkg-ticket/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：当前无独立截图，按代码优先完成票务服务聚合入口。
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-ticket/pages/index/index.tsx
  - src/pkg-ticket/pages/index/index.scss
  - src/pkg-ticket/pages/index/index.config.ts

## 设计意图

票务分包首页，承接乐园详情、门票预定和乐园导览入口。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 票务服务说明卡
  - 乐园详情入口
  - 门票预定入口
  - 乐园导览入口

## 动态与静态边界

- 页面图片：当前页面无真实图片区域。
- 接口数据：当前使用静态入口配置，不依赖接口。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：后续优先使用 `BaseEmpty`。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 票务入口配置 | - | 静态配置 | 否 |

## 交互与跳转

- 乐园详情：跳转 `src/pkg-ticket/pages/park-detail`
- 门票预定：跳转 `src/pkg-ticket/pages/ticket-booking`
- 乐园导览：跳转 `src/pkg-ticket/pages/park-guide`

## 微信开发工具验收清单

- 点击乐园详情，应进入乐园详情页。
- 点击门票预定，应进入门票预定页。
- 点击乐园导览，应进入乐园导览页。

## 实现映射

- `src/pkg-ticket/pages/index/index.tsx`：票务聚合入口和跳转。
- `src/pkg-ticket/pages/index/index.scss`：页面样式。
- `src/pkg-ticket/pages/index/index.config.ts`：页面配置。

## 变更记录

### v0.3

- 确认票务聚合入口跳转闭环，页面状态推进到 `interaction-ready`。

### v0.2

- Phase 7 完成票务聚合入口，串联乐园详情、门票预定和乐园导览。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
