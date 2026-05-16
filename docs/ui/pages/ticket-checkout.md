# 门票确认订单页面设计说明

## 基本信息

- 页面：门票确认订单
- 路由：src/pkg-ticket/pages/checkout
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-checkout
- 设计稿名称：门票确认订单 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-checkout
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-ticket/pages/checkout/index.tsx
  - src/pkg-ticket/pages/checkout/index.scss
  - src/pkg-ticket/pages/checkout/index.config.ts
  - src/pkg-ticket/services/checkout.ts

## 设计意图

门票确认订单页面按 `ticket-checkout.png` 先完成白底卡片流、套餐数量步进、出游信息表单和固定支付栏，保证门票预定页能进入确认订单页形成首版票务闭环。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：订单条目卡、套餐数量卡、出游信息卡、折扣与优惠券卡。

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

- 套餐购买数量：使用项目内 `QuantityStepper` 调整数量，并实时联动支付金额。
- 出游信息：联系人姓名、手机号、身份证号在页面内本地维护，未填完整时阻止提交。
- 提交支付：当前先提示“支付能力即将开放”，后续真实支付仅替换提交逻辑。

## 实现映射

- `src/pkg-ticket/pages/checkout/index.tsx`：页面主体。
- `src/pkg-ticket/pages/checkout/index.scss`：页面样式。
- `src/pkg-ticket/pages/checkout/index.config.ts`：页面配置。
- `src/pkg-ticket/services/checkout.ts`：页面 service。

## 变更记录

### v0.2

- 按 `ticket-checkout.png` 完成订单卡、数量步进、联系人表单、折扣信息、优惠券和底部支付栏首版。
- 复用项目交易组件 `FixedSubmitBar`、`QuantityStepper`，避免页面重复造轮子。
- 扩展票务 checkout mock 数据结构，沉淀联系人、套餐和优惠金额字段。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
