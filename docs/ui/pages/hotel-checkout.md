# 酒店确认订单页面设计说明

## 基本信息

- 页面：酒店确认订单
- 路由：src/pkg-hotel/pages/checkout
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：hotel-checkout
- 设计稿名称：酒店确认订单 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：hotel-checkout
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-hotel/pages/checkout/index.tsx
  - src/pkg-hotel/pages/checkout/index.scss
  - src/pkg-hotel/pages/checkout/index.config.ts
  - src/pkg-hotel/services/checkout.ts

## 设计意图

酒店确认订单页面按 `hotel-checkout.png` 先完成房型摘要卡、入住信息卡、优惠券/折扣/发票卡和底部支付栏，和酒店首页一起组成酒店预订首版闭环。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：房型摘要卡、入住信息表单、优惠券卡、折扣信息卡、发票卡。

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
| 页面数据 | `fetchCheckoutData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 通过 `roomId` 查询参数带入不同房型。
- 房型详情：点击摘要卡右上角“房型详情”跳到 `hotel-room-detail`。
- 去支付：当前校验入住人和手机号后提示“支付能力即将开放”。
- 房间数、优惠券、折扣信息：当前先保留结构并提示能力即将开放。

## 实现映射

- `src/pkg-hotel/pages/checkout/index.tsx`：页面主体。
- `src/pkg-hotel/pages/checkout/index.scss`：页面样式。
- `src/pkg-hotel/pages/checkout/index.config.ts`：页面配置。
- `src/pkg-hotel/services/checkout.ts`：页面 service。

## 变更记录

### v0.2

- 按 `hotel-checkout.png` 完成确认订单首版 UI。
- 复用 `FixedSubmitBar` 作为底部支付栏，并通过页面自有 `_pg-submit_*` 文案节点控制金额样式。
- `fetchCheckoutData()` 支持按 `roomId` 注入房型信息。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
