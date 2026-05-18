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
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
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
- 房间数：点击房间数在 1-3 间循环调整，入住人字段和金额同步刷新。
- 入住人：每间房生成一个入住人输入项，提交前必填。
- 手机号：提交前按大陆手机号格式校验。
- 优惠券：点击展示微信 modal 说明当前自动匹配优惠。
- 折扣信息：点击展示微信 modal 说明优惠金额。
- 去支付：微信 modal 模拟支付确认，确认后写入本地订单并跳转订单详情。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 房型详情 | 跳转房型详情 | `hotel-room-detail?roomId=` |
| 房间数 | 1-3 间循环调整 | toast 反馈并刷新入住人/金额 |
| 入住人输入 | 更新本地表单 | 提交时校验非空 |
| 手机号输入 | 更新本地表单 | 提交时校验 `1xxxxxxxxxx` |
| 优惠券 | 微信 modal | 展示优惠券抵扣说明 |
| 折扣信息 | 微信 modal | 展示当前优惠金额 |
| 去支付 | 微信 modal 二次确认 | 写入本地订单并跳 `order-detail` |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| loading | `usePageRuntime` 统一承接 |
| 房型未命中 | service 兜底第一条房型 |
| 入住人缺失 | toast 提示补全入住人信息 |
| 手机号错误 | toast 提示输入正确手机号 |
| 取消支付 | 留在当前页，保留表单状态 |
| 支付成功 | `submitHotelCheckoutOrder()` 写入本地订单 |

## 微信开发工具验收清单

- 从酒店首页点任一房型“预订”进入确认订单，标题、房型、金额应随房型变化。
- 点房间数，入住人字段数量和底部金额应同步变化。
- 留空入住人或输入错误手机号点支付，应看到业务 toast。
- 点优惠券/折扣信息，应出现微信 modal，不再出现占位提示。
- 补全表单后点支付并确认，应生成本地酒店订单并跳订单详情。

## 实现映射

- `src/pkg-hotel/pages/checkout/index.tsx`：页面主体。
- `src/pkg-hotel/pages/checkout/index.scss`：页面样式。
- `src/pkg-hotel/pages/checkout/index.config.ts`：页面配置。
- `src/pkg-hotel/services/checkout.ts`：页面 service。

## 变更记录

### v0.3

- 补齐房间数调整、入住人动态字段、手机号校验、优惠券/折扣说明和模拟微信支付。
- 新增 `submitHotelCheckoutOrder()`，支付成功后写入本地订单中心并跳转订单详情。
- 页面状态推进到 `interaction-ready`。

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
