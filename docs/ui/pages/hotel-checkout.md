# 酒店确认订单页面设计说明

## 基本信息

- 页面：酒店确认订单
- 路由：src/pkg-hotel/pages/checkout
- UI 图：docs/ui/source/hkp-mini-page/hotel-checkout.png
- 当前版本：v1.0
- 页面状态：commercial-ready
- 更新时间：2026-05-20
- 实现文件：
  - src/pkg-hotel/pages/checkout/index.tsx
  - src/pkg-hotel/pages/checkout/index.scss
  - src/pkg-hotel/services/checkout.ts
  - src/pkg-hotel/services/order-draft.ts

## 设计意图

确认订单页通过 `draftId` 恢复酒店预订上下文，完成房间数、入住人、联系人、金额明细和支付落单。优惠券业务当前低优先级，无券时不展示入口。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：产品摘要、日期和房间数、入住人 tab、联系人、政策信息、底部支付栏。

## 动态与静态边界

- 订单上下文：页面通过 `draftId` 读取，不从页面内拼结算信息。
- 表单状态：入住人、联系人、手机号由页面本地维护，提交时写回订单上下文。
- 金额：按上下文单价、晚数和房间数计算。
- 优惠券：当前无券业务时不渲染入口。

## 状态要求

- loading：首屏由 `usePageRuntime` 承接。
- error：上下文缺失时 service 尝试补建默认上下文，仍失败则走运行时兜底。
- 未登录：页面使用 `loginRequired` 兜底。
- 表单错误：使用微信 toast 给出业务提示。

## 接口与 Service

| 模块 | service | 说明 |
|---|---|---|
| 结算数据 | `fetchCheckoutData()` | 通过 `draftId` 恢复产品、日期、房间数、价规和金额 |
| 支付落单 | `submitHotelCheckoutOrder()` | 写入本地酒店订单并返回订单编号 |

## 交互与跳转

- 点击产品详情回到详情页查看产品和价规。
- 调整房间数后同步金额和入住人 tab。
- 点击去支付前校验联系人、手机号和每间房入住人。
- 支付成功后跳订单详情。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 产品详情 | 进入详情页 | 保留当前产品、日期和入住人数 |
| 房间数 | 数量选择 | 使用 `QuantityStepper`，金额和入住人房间 tab 同步 |
| 房间 tab | 切换入住人 | 展示当前房间入住人输入 |
| 入住人输入 | 更新本地表单 | 提交时逐房间校验 |
| 联系人姓名 | 更新本地表单 | 提交前必填 |
| 手机号 | 更新本地表单 | 提交前校验大陆手机号 |
| 去支付 | 微信确认弹窗 | 确认后写入本地订单中心并跳订单详情 |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| 未登录 | 页面 `loginRequired` 二次兜底 |
| 无订单上下文 | 自动用默认条件补建可用上下文 |
| 入住人缺失 | 切到对应房间 tab 并 toast 提示 |
| 联系人缺失 | toast 提示填写联系人姓名 |
| 手机号错误 | toast 提示输入正确手机号 |
| 无券业务 | 不展示优惠券和折扣卡 |
| 支付成功 | 生成本地酒店订单并跳订单详情 |

## 微信开发工具验收清单

- 从酒店首页或详情页预订进入，产品、日期、晚数、房间数和金额应一致。
- 调整房间数，房间 tab 数量和底部金额同步变化。
- 留空任一入住人提交，应切到对应房间并提示。
- 留空联系人或手机号错误，应给出业务提示。
- 点击去支付，弹窗文案为正式支付确认；确认后跳订单详情。
- 订单详情和订单列表能看到新酒店订单。

## 实现映射

- `src/pkg-hotel/pages/checkout/index.tsx`：页面结构、表单校验和支付入口。
- `src/pkg-hotel/pages/checkout/index.scss`：确认订单样式。
- `src/pkg-hotel/services/checkout.ts`：结算数据和提交入口。
- `src/pkg-hotel/services/order-draft.ts`：酒店订单上下文与本地订单写入。

## 变更记录

### v1.0

- 确认订单页改为通过 `draftId` 恢复酒店预订上下文。
- 入住人改为房间 tab 交互，房间数和金额联动。
- 支付成功写入本地酒店订单中心。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
