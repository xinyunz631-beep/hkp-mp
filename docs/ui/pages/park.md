# 乐园页面设计说明

## 基本信息

- 页面：乐园
- 路由：src/pages/park
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：当前无独立截图，按代码骨架先登记，后续补设计源。
- 当前版本：v0.1
- 页面状态：implementing
- 更新时间：2026-05-16
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
- 内容区域：当前只保留 Phase 1 骨架，后续阶段按截图补齐 UI。

## 动态与静态边界

- 页面图片：真实图片区域后续统一使用 `AppImage`。
- 接口数据：通过对应分包 service 获取，页面不直接写接口 mock。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：后续优先使用 `BaseEmpty`。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| Phase 1 骨架 | - | 暂无接口 | 否 |

## 交互与跳转

- 后续按 HKP PRD 对应流程继续补齐入口和下一跳。

## 实现映射

- `src/pages/park/index.tsx`：页面骨架相关文件。
- `src/pages/park/index.scss`：页面骨架相关文件。
- `src/pages/park/index.config.ts`：页面骨架相关文件。

## 变更记录

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- 待验证。
