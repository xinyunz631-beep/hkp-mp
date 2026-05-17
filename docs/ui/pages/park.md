# 乐园页面设计说明

## 基本信息

- 页面：乐园
- 路由：src/pages/park
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：当前无独立截图，按代码优先完成乐园聚合入口。
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-17
- 实现文件：
  - src/pages/park/index.tsx
  - src/pages/park/index.scss
  - src/pages/park/index.config.ts

## 设计意图

主包乐园聚合入口，串联票务、酒店和餐饮分包。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：票务、酒店和餐饮三个业务分包入口。

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
| 乐园入口配置 | - | 静态配置 | 否 |

## 交互与跳转

- 票务核验：跳转 `src/pkg-ticket/pages/index`
- 酒店服务：跳转 `src/pkg-hotel/pages/index`
- 餐饮点单：跳转 `src/pkg-dining/pages/index`

## 实现映射

- `src/pages/park/index.tsx`：乐园聚合入口和跳转。
- `src/pages/park/index.scss`：页面样式。
- `src/pages/park/index.config.ts`：页面配置。

## 变更记录

### v0.2

- Phase 7 确认乐园聚合入口可串联票务、酒店和餐饮分包，并保持不展示页面内 tabbar。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
