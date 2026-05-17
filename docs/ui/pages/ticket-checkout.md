# 门票确认订单页面设计说明

## 基本信息

- 页面：门票确认订单
- 路由：src/pkg-ticket/pages/checkout
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-checkout
- 设计稿名称：门票确认订单 750px 开发稿
- 当前版本：v1.0
- 页面状态：commercial-ready
- 更新时间：2026-05-17
- 实现文件：
  - src/pkg-ticket/pages/checkout/index.tsx
  - src/pkg-ticket/pages/checkout/index.scss
  - src/pkg-ticket/pages/checkout/index.config.ts
  - src/pkg-ticket/services/checkout.ts
  - src/pkg-ticket/services/order-draft.ts
  - src/core/services/local-order.ts

## 设计意图

门票确认订单页承接门票预定页生成的本地草稿，完成出游日期、优惠券、联系人、加购数量、支付确认和订单详情跳转闭环，是票务样板链路的第二个验收页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 订单票品卡：展示草稿中的票品、数量和可改游玩日期。
- 加购卡：展示餐饮套餐加购项，可调整数量。
- 出游信息卡：联系人姓名、手机号、身份证号输入。
- 优惠信息卡：展示折扣和可选优惠券。
- 固定支付栏：展示实付金额、优惠金额和支付按钮。
- 页面弹层：日期和优惠券弹层统一挂载到 `PageShare`，层级高于 header/footer/tabbar。

## 动态与静态边界

- 草稿读取：页面通过路由 `draftId` 调用 `fetchCheckoutData(draftId)`，优先读取本地草稿。
- 日期和优惠券：改动后写回草稿，保证刷新或返回后仍可恢复。
- 支付提交：`submitTicketOrderDraft()` 模拟支付成功并写入本地订单中心。
- 真实接口替换：未来只替换草稿和提交 service，页面表单、校验和跳转协议保持稳定。

## 状态要求

- loading：页面运行时统一承接。
- 草稿缺失：提示先选择门票，不继续生成订单。
- 表单错误：姓名、手机号、身份证逐项校验，错误用微信 toast 提示。
- 支付确认：使用微信 `showModal` 二次确认。
- 支付成功：写入本地订单并跳订单详情。
- 弹层态：日期和优惠券弹层可打开、选择、关闭。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchCheckoutData(draftId)` | 无草稿时返回基础兜底数据 | 是 |
| 草稿更新 | `updateTicketOrderDraft()` | 本地缓存更新 | 否 |
| 支付提交 | `submitTicketOrderDraft()` | 无草稿时返回空并提示 | 是 |
| 订单中心 | `saveLocalOrder()` | 本地缓存写入 | 是 |

## 交互与跳转

| 元素 | 交互结果 |
|---|---|
| 游玩日期 | 打开单日日期弹层，选择后写回草稿 |
| 套餐数量 | 使用项目封装步进器调整数量并联动支付金额 |
| 姓名输入 | 更新联系人姓名 |
| 手机输入 | 限制 11 位手机号并在提交时校验 |
| 身份证输入 | 提交时校验证件号长度 |
| 优惠券 | 打开优惠券弹层，选择后联动优惠金额 |
| 去支付 | 微信确认弹窗，确认后生成本地订单并跳订单详情 |

## 交互矩阵

| 点位 | 正常结果 | 异常/降级 |
|---|---|---|
| 日期 | `DateSelectionPopup` 单日选择 | 关闭不改变日期 |
| 套餐数量 | 金额即时重算 | 最小值为 1 |
| 优惠券 | 选择券并重算优惠 | 无券显示空提示 |
| 表单 | 本地状态维护 | 提交时逐项提示 |
| 支付 | `Taro.showModal` 确认后提交 | 取消确认留在当前页 |
| 订单写入 | 本地订单中心新增记录 | 草稿缺失提示重新选择门票 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| 首屏 loading | `usePageRuntime` 默认 loading |
| 正常态 | 展示草稿票品、联系人、优惠券和支付栏 |
| 表单错误态 | toast 提示具体错误 |
| 提交确认态 | 微信 modal 二次确认 |
| 提交成功态 | toast 成功并跳订单详情 |
| 草稿缺失态 | 提示先选择门票 |

## 实现映射

- `src/pkg-ticket/pages/checkout/index.tsx`：页面主体和支付闭环。
- `src/pkg-ticket/pages/checkout/index.scss`：页面样式。
- `src/pkg-ticket/services/checkout.ts`：草稿转页面 DTO。
- `src/pkg-ticket/services/order-draft.ts`：草稿更新和提交。
- `src/core/services/local-order.ts`：本地订单中心写入和读取。

## 变更记录

### v1.0

- 升级为 `commercial-ready` 样板页。
- 确认订单页改为读取预定页 `draftId`，支持本地草稿恢复。
- 日期和优惠券弹层统一迁入 `PageShare`，避免被固定支付栏压住。
- 补齐改日期、选优惠券、表单校验、支付确认、订单写入和订单详情跳转。

## 验证记录

- `yarn typecheck`
- 待本轮完成后执行：`yarn check:page-convention`
- 待本轮完成后执行：`yarn check:package-boundary`
- 待本轮完成后执行：`yarn check:ui-contract`

## 微信开发工具验收清单

| 步骤 | 预期 |
|---|---|
| 从门票预定提交进入确认订单 | 页面读取草稿并展示所选票种、日期和金额 |
| 点游玩日期 | 打开日期弹层，选择后页面日期更新 |
| 调整套餐数量 | 底部金额即时变化 |
| 点优惠券 | 打开优惠券弹层，选择后优惠金额变化 |
| 留空姓名 / 手机 / 身份证后支付 | 分别提示对应信息 |
| 填完整信息后支付 | 出现确认弹窗 |
| 确认支付 | 生成本地订单并跳订单详情 |
