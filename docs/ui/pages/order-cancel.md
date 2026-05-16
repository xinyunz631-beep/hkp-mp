# 取消订单页面设计说明

## 基本信息

- 页面：取消订单
- 路由：src/pkg-order/pages/cancel
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-cancel
- 设计稿名称：取消订单 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-cancel
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-order/pages/cancel/index.tsx
  - src/pkg-order/pages/cancel/index.scss
  - src/pkg-order/pages/cancel/index.config.ts
  - src/pkg-order/services/cancel.ts

## 设计意图

取消订单页面用于待付款订单的主动撤销场景，当前已补齐订单摘要、取消原因、补充说明和提交按钮，优先保证订单侧闭环可走通。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 订单摘要：复用 `OrderCard` 展示待取消订单。
- 取消原因：胶囊选项形式，单选提交。
- 补充说明：文本域补充取消背景。
- 说明区域：展示取消后的库存和退款提示。
- 固定底部：提交取消申请按钮。

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
| 页面数据 | `fetchCancelData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 从订单列表中“取消订单”动作进入本页。
- 选择取消原因后可提交；未选原因时给出 toast 提示。
- 提交后返回上一页，保留订单主链路闭环。

## 实现映射

- `src/pkg-order/pages/cancel/index.tsx`：页面主体。
- `src/pkg-order/pages/cancel/index.scss`：页面样式。
- `src/pkg-order/pages/cancel/index.config.ts`：页面配置。
- `src/pkg-order/services/cancel.ts`：页面 service。

## 变更记录

### v0.2

- 回补取消订单首版 UI 和交互，包含订单摘要、原因选择、说明输入和提交动作。
- 页面改为消费 `fetchCancelData()` 的结构化 DTO，不再停留在空骨架。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
