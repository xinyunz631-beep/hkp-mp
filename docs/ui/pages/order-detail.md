# 订单详情页面设计说明

## 基本信息

- 页面：订单详情
- 路由：src/pkg-order/pages/detail
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-detail
- 设计稿名称：订单详情 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-detail
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-order/pages/detail/index.tsx
  - src/pkg-order/pages/detail/index.scss
  - src/pkg-order/pages/detail/index.config.ts
  - src/pkg-order/services/detail.ts

## 设计意图

订单详情页面按 `order-detail-paid.png` 先完成状态头、订单信息、入园信息、取票信息、金额汇总、订单元信息和底部退款按钮。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：状态头、商品信息卡、入园信息卡、取票信息卡、金额卡、订单信息卡。

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
| 页面数据 | `fetchDetailData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 底部“申请退款”当前先提示能力即将开放。
- 后续接真实订单详情接口时，只替换 service 层字段映射。

## 实现映射

- `src/pkg-order/pages/detail/index.tsx`：页面主体。
- `src/pkg-order/pages/detail/index.scss`：页面样式。
- `src/pkg-order/pages/detail/index.config.ts`：页面配置。
- `src/pkg-order/services/detail.ts`：页面 service。

## 变更记录

### v0.2

- 按 `order-detail-paid.png` 完成订单详情首版 UI。
- 订单详情拆为状态、商品、入园、取票、金额和订单信息六个信息区，便于后续扩展售后入口。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
