# 会员页面设计说明

## 基本信息

- 页面：会员
- 路由：src/pages/member
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：当前无独立截图，按代码优先完成会员聚合入口。
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-17
- 实现文件：
  - src/pages/member/index.tsx
  - src/pages/member/index.scss
  - src/pages/member/index.config.ts

## 设计意图

主包会员聚合入口，串联会员中心和权益能力。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：会员态摘要和进入会员中心动作。

## 动态与静态边界

- 页面图片：当前页面无真实图片区域。
- 接口数据：读取全局会员态，不直接请求接口。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：后续优先使用 `BaseEmpty`。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 会员态摘要 | `rootStore.member` | 全局状态兜底游客态 | 否 |

## 交互与跳转

- 点击入口时通过 `AuthAction` 登录守卫，登录后进入 `src/pkg-member/pages/index`。

## 实现映射

- `src/pages/member/index.tsx`：会员聚合入口和登录守卫。
- `src/pages/member/index.scss`：页面样式。
- `src/pages/member/index.config.ts`：页面配置。

## 变更记录

### v0.2

- Phase 7 确认会员聚合入口接入登录守卫并保持不展示页面内 tabbar。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
