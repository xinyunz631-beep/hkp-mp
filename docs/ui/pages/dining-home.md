# 餐饮首页页面设计说明

## 基本信息

- 页面：餐饮首页
- 路由：src/pkg-dining/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：docs/ui/source/hkp-mini-page/dining-home.png
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-17
- 实现文件：
  - src/pkg-dining/pages/index/index.tsx
  - src/pkg-dining/pages/index/index.scss
  - src/pkg-dining/pages/index/index.config.ts

## 设计意图

餐饮分包首页，当前按暂缓策略展示业务化准备中状态页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：`BaseEmpty` 准备中状态卡。

## 动态与静态边界

- 页面图片：当前暂不渲染餐饮图片。
- 接口数据：当前无阻断接口，完整餐饮服务另行进入。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：后续优先使用 `BaseEmpty`。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 准备中状态 | - | 静态配置 | 否 |

## 交互与跳转

- 当前仅展示餐饮服务准备中，不进入商家详情或套餐下单。

## 实现映射

- `src/pkg-dining/pages/index/index.tsx`：准备中状态页。
- `src/pkg-dining/pages/index/index.scss`：状态页样式。
- `src/pkg-dining/pages/index/index.config.ts`：页面配置。

## 变更记录

### v0.2

- Phase 7 按暂缓策略补齐餐饮首页准备中状态页。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
