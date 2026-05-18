# 售后进度页面设计说明

## 基本信息

- 页面：售后进度
- 路由：src/pkg-order/pages/aftersale-progress
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-aftersale-progress
- 设计稿名称：售后进度 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-aftersale-progress
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-order/pages/aftersale-progress/index.tsx
  - src/pkg-order/pages/aftersale-progress/index.scss
  - src/pkg-order/pages/aftersale-progress/index.config.ts
  - src/pkg-order/services/aftersale-progress.ts

## 设计意图

售后进度页面负责展示售后单状态和处理轨迹，当前已补齐状态头图、订单摘要、售后信息、时间线和列表返回动作。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 状态头图：展示售后处理状态和说明。
- 订单摘要：复用 `OrderCard` 展示当前售后商品。
- 售后信息：展示单号、类型、退款金额和原因。
- 处理进度：纵向时间线展示售后节点。
- 补充信息：展示申请时间、退款方式、联系人等字段。
- 固定底部：跳回售后列表按钮。

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
| 页面数据 | `fetchAftersaleProgressData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 从售后申请提交后进入本页，也可从售后列表点击记录进入。
- 点击底部按钮跳转到售后列表。

## 实现映射

- `src/pkg-order/pages/aftersale-progress/index.tsx`：页面主体。
- `src/pkg-order/pages/aftersale-progress/index.scss`：页面样式。
- `src/pkg-order/pages/aftersale-progress/index.config.ts`：页面配置。
- `src/pkg-order/services/aftersale-progress.ts`：页面 service。

## 变更记录

### v0.2

- 回补售后进度首版 UI 和时间线展示。
- 接通售后申请页与售后列表页的双向跳转。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
