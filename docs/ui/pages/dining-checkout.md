# 餐饮确认订单页面设计说明

## 基本信息

- 页面：餐饮确认订单
- 路由：src/pkg-dining/pages/checkout
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：dining-checkout
- 设计稿名称：餐饮确认订单 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：dining-checkout
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-17
- 实现文件：
  - src/pkg-dining/pages/checkout/index.tsx
  - src/pkg-dining/pages/checkout/index.scss
  - src/pkg-dining/pages/checkout/index.config.ts
  - src/pkg-dining/services/checkout.ts

## 设计意图

餐饮确认订单页面当前按暂缓策略展示业务化准备中状态页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：`BaseEmpty` 准备中状态卡

## 动态与静态边界

- 接口图片：真实图片区域统一用项目封装 `AppImage`，render 内以空字符串变量预留地址，由组件承接加载中、淡入和失败态。
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
| 页面数据 | `fetchCheckoutData()` | service 内归一和兜底 | 否 |

## 交互与跳转

- 当前仅展示餐饮订单准备中，不进入提交订单。

## 实现映射

- `src/pkg-dining/pages/checkout/index.tsx`：页面主体。
- `src/pkg-dining/pages/checkout/index.scss`：页面样式。
- `src/pkg-dining/pages/checkout/index.config.ts`：页面配置。
- `src/pkg-dining/services/checkout.ts`：页面 service。

## 变更记录

### v0.2

- Phase 7 按暂缓策略补齐餐饮确认订单准备中状态页。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
