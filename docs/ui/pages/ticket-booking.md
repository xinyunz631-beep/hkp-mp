# 门票预定页面设计说明

## 基本信息

- 页面：门票预定
- 路由：src/pkg-ticket/pages/ticket-booking
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-booking
- 设计稿名称：门票预定 750px 开发稿
- 当前版本：v1.0
- 页面状态：commercial-ready
- 更新时间：2026-05-17
- 实现文件：
  - src/pkg-ticket/pages/ticket-booking/index.tsx
  - src/pkg-ticket/pages/ticket-booking/index.scss
  - src/pkg-ticket/pages/ticket-booking/index.config.ts
  - src/pkg-ticket/services/ticket-booking.ts
  - src/pkg-ticket/services/order-draft.ts
  - src/core/components/commerce/index.tsx
  - src/core/utils/wechat-actions.ts

## 设计意图

门票预定页作为 HKP 商用级补完样板页之一，不再只承接 UI 结构，而是完整覆盖景区图片、预定须知、电话、地图、单日日期、优惠券、票种数量、登录拦截和订单草稿流转。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 顶部景区图：`AppImage` 渲染，点击走微信图片预览。
- 开园信息：开放时间、详情须知、地址地图、客服热线。
- 游玩日期：点击打开项目封装 `DateSelectionPopup`，底层使用 NutUI `Calendar`，门票只允许单日。
- 优惠券：点击打开项目封装 `CouponSelectionPopup`，选择后联动底部金额。
- 商品区域：门票和年卡分区，数量使用项目封装 `QuantityStepper`。
- 固定底栏：`FixedSubmitBar` 展示应付金额、优惠金额和提交订单动作。
- 页面弹层：日期、优惠券和预定须知统一挂载到 `PageShare`，层级高于 header/footer/tabbar。

## 动态与静态边界

- 图片数据：由 service 返回 `heroImages`，空地址时仍通过 `AppImage` 展示灰底占位。
- 页面数据：由 `fetchTicketBookingData()` 返回 DTO，页面不直接写业务常量。
- 订单草稿：提交时由 `createTicketOrderDraft()` 写入本地草稿，再携带 `draftId` 跳转确认订单。
- 真实接口替换：后续只替换 service 和草稿提交实现，页面交互协议保持不变。

## 状态要求

- loading：页面运行时统一承接。
- 空态：后续票种为空时使用 `BaseEmpty`，当前 mock 保持有票。
- 错误态：阻断型接口失败使用页面运行时异常兜底。
- 未登录态：浏览和选票不打扰，提交订单时通过 `pageRuntime.ensureLogin()` 触发登录，支持本地会员身份登录后续执行。
- 禁用态：未选择票种时提交按钮禁用，并提示选择门票数量。
- 弹层态：日期、优惠券、预定须知均可独立打开和关闭。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchTicketBookingData()` | service 内归一和兜底 | 是 |
| 订单草稿 | `createTicketOrderDraft()` | 本地缓存保存草稿 | 是 |
| 微信动作 | `wechat-actions.ts` | 失败时给业务反馈或复制降级 | 否 |

## 交互与跳转

| 元素 | 交互结果 |
|---|---|
| 顶部景区图 / 图片数量 | 调用微信图片预览；无图片时提示暂无可预览图片 |
| 分享按钮 | 打开微信分享菜单并提示使用右上角分享 |
| 详情须知 | 打开预定须知弹层 |
| 地图 | 调用微信地图；缺经纬度时复制地址 |
| 客服电话 | 调用微信拨号；失败时复制号码 |
| 游玩日期 | 打开单日日期弹层，选择后更新日期 |
| 优惠券 | 打开优惠券弹层，选择后更新优惠金额 |
| 票种数量 | 使用项目封装步进器调整数量和应付金额 |
| 商品预定须知 | 打开预定须知弹层 |
| 提交订单 | 未选票提示；未登录弹登录；登录后创建草稿并跳 `ticket-checkout?draftId=` |

## 交互矩阵

| 点位 | 正常结果 | 异常/降级 |
|---|---|---|
| 图片预览 | `Taro.previewImage` | 无图片提示 |
| 分享 | `Taro.showShareMenu` | 调试环境不可用时只提示 |
| 电话 | `Taro.makePhoneCall` | 复制号码 |
| 地图 | `Taro.openLocation` | 复制地址 |
| 日期 | `DateSelectionPopup` 单日选择 | 关闭不改变日期 |
| 优惠券 | 选择券并联动金额 | 无券显示空提示 |
| 登录 | 本地会员身份可完成登录 | 用户取消则留在预定页 |
| 提交 | 生成本地草稿并跳确认订单 | 无票种提示选择数量 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| 首屏 loading | `usePageRuntime` 默认 loading |
| 正常态 | 展示图片、信息、日期、优惠券、票种和提交栏 |
| 未登录态 | 只在提交时弹登录，不阻断浏览 |
| 禁用态 | 0 件票时提交按钮禁用 |
| 弹层态 | 日期、优惠券、须知弹层覆盖当前页 |
| 草稿态 | 登录后提交写入本地 `draftId` |

## 实现映射

- `src/pkg-ticket/pages/ticket-booking/index.tsx`：页面主体和交互编排。
- `src/pkg-ticket/pages/ticket-booking/index.scss`：页面样式。
- `src/pkg-ticket/services/ticket-booking.ts`：页面 DTO。
- `src/pkg-ticket/services/order-draft.ts`：订单草稿创建。
- `src/core/components/commerce/index.tsx`：日期、优惠券、数量和提交栏组件。
- `src/core/utils/wechat-actions.ts`：微信小程序动作封装。

## 变更记录

### v1.0

- 升级为 `commercial-ready` 样板页。
- 日期选择改为项目封装 `DateSelectionPopup`，底层使用 NutUI `Calendar`。
- 日期、优惠券和须知弹层统一迁入 `PageShare`，避免被固定提交栏压住。
- 补齐图片预览、分享、预定须知、电话、地图、优惠券和登录后续执行。
- 提交订单改为创建本地草稿并携带 `draftId` 进入门票确认订单。

## 验证记录

- `yarn typecheck`
- 待本轮完成后执行：`yarn check:page-convention`
- 待本轮完成后执行：`yarn check:package-boundary`
- 待本轮完成后执行：`yarn check:ui-contract`

## 微信开发工具验收清单

| 步骤 | 预期 |
|---|---|
| 打开门票预定页，点顶部图片 | 有图片时预览，无图片时提示暂无可预览图片 |
| 点分享按钮 | 提示使用右上角分享 |
| 点详情须知或票种预定须知 | 打开预定须知弹层，可关闭 |
| 点地图 | 调起地图或复制地址 |
| 点拨打 | 调起拨号或复制号码 |
| 点游玩日期 | 打开日期弹层，只能选 1 天 |
| 点优惠券 | 打开优惠券弹层，选择后金额联动 |
| 加 1 张门票后提交 | 未登录先弹登录，本地会员登录后进入确认订单 |
