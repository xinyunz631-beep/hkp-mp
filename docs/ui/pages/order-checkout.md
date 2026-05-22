# 确认订单页面设计说明

## 基本信息

- 页面：确认订单
- 路由：src/pkg-order/pages/checkout
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-checkout
- 设计稿名称：确认订单 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-checkout
- 当前版本：v0.6-mall-delivery-feedback
- 页面状态：interaction-ready
- 更新时间：2026-05-21
- 实现文件：
  - src/pkg-order/pages/checkout/index.tsx
  - src/pkg-order/pages/checkout/index.scss
  - src/pkg-order/pages/checkout/index.config.ts
  - src/pkg-order/services/checkout.ts

## 设计意图

确认订单页面按 `order-checkout-address.png` 完成默认地址、支付方法、商品列表、配送、金额汇总和底部支付栏；商城链路下优先读取结算草稿 `draftId`，支持选择收货地址、配送范围校验、暂不支付订单和继续支付闭环。优惠券能力暂缓，当前无券业务时不展示入口。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：地址卡、配送不可用提示、支付方式、商城商品组、配送、金额汇总；有可用券时才展示优惠券和折扣信息。

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
| 商城结算草稿 | `getMallCheckoutDraft()` | 草稿缺失时回落静态结算数据 | 否 |
| 微信支付 | `requestWechatPayment()` | 无真实支付参数时使用本地支付 / 暂不支付闭环 | 是 |

## 交互与跳转

- 点击地址卡：有 `draftId` 时进入地址选择模式，选择后返回并刷新当前订单配送信息。
- 商品图：点击调用微信图片预览，无图时给出业务提示。
- 优惠券与折扣信息：有可用券时才展示，点击后使用微信 modal 说明。
- 配送校验失败时页面展示独立提示区，列出当前地址或商品配送限制；底部支付按钮置灰但点击仍提示原因。
- 支付按钮：统一走 `requestWechatPayment()`；确认支付写入待发货订单，点击暂不支付写入待付款订单并跳订单详情，30 分钟内可继续支付。

## 微信开发工具验收清单

- 点击地址卡，应进入地址选择列表；选择地址后回到确认订单并重新展示配送信息。
- 点击商品图，应预览或提示暂无商品大图。
- 当前无券业务时，不应展示优惠券/折扣信息卡；后续有券时点击应出现微信 modal。
- 当前地址不支持配送时，应看到橙色配送提示区；点击提示区的更换地址应进入地址选择。
- 配送不可用时点击底部去支付，应 toast 当前失败原因，不应静默无反馈。
- 点击去支付并确认，应生成待发货订单并跳订单详情。
- 点击暂不支付，应生成待付款订单；订单详情应显示继续支付入口。

## 实现映射

- `src/pkg-order/pages/checkout/index.tsx`：页面主体。
- `src/pkg-order/pages/checkout/index.scss`：页面样式。
- `src/pkg-order/pages/checkout/index.config.ts`：页面配置。
- `src/pkg-order/services/checkout.ts`：页面 service。

## 变更记录

### v0.6-mall-delivery-feedback

- 地址卡增加标题和更换入口，信息层级更接近真实商城结算页。
- 商品列表增加商城组头和商品总件数。
- 配送不可用时新增页面内提示区，并支持底部禁用按钮点击后给出失败原因。

### v0.5-mall-commercial-flow

- 商城确认订单接入结算草稿 `draftId`，商品、规格、数量、赠品和配送规则从商品详情 / 购物车传入。
- 地址卡进入选择地址模式，选择后回到确认订单并刷新配送校验。
- 支付统一走 `requestWechatPayment()`，支持暂不支付生成待付款订单，订单详情 30 分钟内可继续支付。
- 商城订单写入订单详情时，商品信息、配送方式、收货信息和金额字段分区展示；静态待付款订单支付成功后会写成本地已付款订单，订单首页隐藏同 id 静态待付款项。
- 商城订单列表操作支持多按钮：待付款展示继续支付，待发货可同时展示查看详情 / 申请售后；售后入口带 `orderId`。

### v0.4

- 当前无券业务下隐藏优惠券/折扣信息，订单详情金额字段也不写入空优惠券。
- 地址页和支付后订单详情跳转改为受保护路由封装。

### v0.3

- 补齐商品图预览、优惠券/折扣说明、模拟微信支付和本地订单写入。
- 页面状态推进到 `interaction-ready`。

### v0.2

- 按 `order-checkout-address.png` 完成确认订单首版 UI。
- 复用 `FixedSubmitBar` 实现底部支付栏，并保留优惠金额提示。
- 已串到地址页，为后续地址管理和提交订单能力预留入口。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
