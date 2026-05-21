# 门票预定页面设计说明

## 基本信息

- 页面：门票预定
- 路由：src/pkg-ticket/pages/ticket-booking
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-booking
- 设计稿名称：门票预定 750px 开发稿
- 当前版本：v1.2
- 页面状态：commercial-ready
- 更新时间：2026-05-19
- 实现文件：
  - src/pkg-ticket/pages/ticket-booking/index.tsx
  - src/pkg-ticket/pages/ticket-booking/index.scss
  - src/pkg-ticket/pages/ticket-booking/index.config.ts
  - src/pkg-ticket/services/ticket-booking.ts
  - src/pkg-ticket/services/order-draft.ts
  - src/core/components/commerce/index.tsx
  - src/core/utils/wechat-actions.ts

## 设计意图

门票预定页作为 HKP 商用级补完样板页之一，不再只承接 UI 结构，而是完整覆盖景区图片、预定须知、电话、地图、单日日期、票种数量、登录拦截和订单草稿流转。优惠券能力仅预留，当前无券业务时不展示入口。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 顶部景区图：`AppImage` 渲染，点击走微信图片预览。
- 开园信息：开放时间、详情须知、地址地图、客服热线。
- 游玩日期：点击打开项目封装 `DateSelectionPopup`，底层使用 NutUI `Calendar`，门票只允许单日。
- 优惠券：能力预留；当前无券业务时不展示入口，有券返回时再通过 `CouponSelectionPopup` 选择或清空。
- 商品导航：由 `fetchTicketBookingData({ travelDate })` 返回的 `sections` 决定，多个板块时按返回顺序展示 tabs，只有一个板块时不展示 tabs；2-3 个 tab 时内容自适应宽度并 `space-around` 分布，超过 3 个 tab 时横向滑动，单屏最多露出约 3.2 个 tab，标签文案和颜色由数据返回，当前年卡 `hot` 使用红色。
- 商品区域：按 `sections` 返回顺序渲染对应商品或套餐，数量使用项目封装 `QuantityStepper`；初始数量全部为 0，不默认选中门票、年卡或套餐。
- 固定底栏：`TicketSubmitFooter` 展示应付金额、优惠金额和提交订单动作。
- 页面弹层：日期和预定须知统一挂载到 `PageShare`，有券业务返回时优惠券弹层也挂载到 `PageShare`。

## 动态与静态边界

- 图片数据：由 service 返回 `heroImages`，空地址时仍通过 `AppImage` 展示灰底占位。
- 页面数据：由 `fetchTicketBookingData({ travelDate })` 返回 DTO，页面不直接写业务常量。
- 商品 tabs：依赖游玩日期返回 `sections` 顺序、标题、badge 和商品映射；mock 按日期稳定生成 2 个或 4-6 个板块，返回单个有效板块时隐藏 tabs，仅保留对应商品区；日期切换刷新期间必须展示 pageLoading 锁住页面。
- 商品数量：默认全部为 0，必须由用户主动加购；`defaultQuantity` 仅可用于真实接口明确要求的运营预选，当前 mock 不使用。
- 订单草稿：提交时由 `createTicketOrderDraft()` 写入本地草稿，再携带 `draftId` 跳转确认订单。
- 真实接口替换：后续只替换 service 和草稿提交实现，页面交互协议保持不变。

## 状态要求

- loading：页面运行时统一承接。
- 空态：后续票种为空时使用 `BaseEmpty`，当前 mock 保持有票。
- 错误态：阻断型接口失败使用页面运行时异常兜底。
- 未登录态：浏览和选票不打扰，提交订单时通过 `pageRuntime.ensureLogin()` 触发登录，支持本地会员身份登录后续执行。
- 禁用态：未选择票种时提交按钮禁用，并提示选择门票数量。
- 弹层态：日期、预定须知均可独立打开和关闭；优惠券仅在接口返回可用券时展示。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchTicketBookingData({ travelDate })` | service 内归一和兜底 | 是 |
| 订单草稿 | `createTicketOrderDraft()` | 本地缓存保存草稿 | 是 |
| 微信动作 | `wechat-actions.ts` | 失败时给业务反馈或复制降级 | 否 |

## 交互与跳转

| 元素 | 交互结果 |
|---|---|
| 顶部景区图 / 图片数量 | 调用微信图片预览；无图片时提示暂无可预览图片 |
| 分享按钮 | 使用 `AppShareButton` 直接触发微信好友分享 |
| 详情须知 | 打开预定须知弹层 |
| 地图 | 调用微信地图；缺经纬度时复制地址 |
| 客服电话 | 调用微信拨号；失败时复制号码 |
| 游玩日期 | 打开单日日期弹层，选择后展示 pageLoading，并按新日期刷新 tabs、商品和价格 |
| 优惠券 | 当前无券业务时不展示；有券返回时打开优惠券弹层 |
| 票种数量 | 使用项目封装步进器调整数量和应付金额 |
| 套餐立即预订 | 已选门票后提示是否带 1 份套餐进入确认订单；未选门票时提示先选票 |
| 商品预定须知 | 打开预定须知弹层 |
| 提交订单 | 未选票提示；未登录弹登录；登录后创建草稿并跳 `ticket-checkout?draftId=` |

## 交互矩阵

| 点位 | 正常结果 | 异常/降级 |
|---|---|---|
| 图片预览 | `Taro.previewImage` | 无图片提示 |
| 分享 | `useShareAppMessage` + `AppShareButton` | 只触发微信好友分享 |
| 电话 | `Taro.makePhoneCall` | 复制号码 |
| 地图 | `Taro.openLocation` | 复制地址 |
| 日期 | `DateSelectionPopup` 单日选择后用 `pageRuntime.withLoading()` 重新请求页面数据 | 关闭不改变日期 |
| 优惠券 | 有券返回时选择并联动金额，可清空不使用 | 当前无券业务时隐藏入口 |
| 登录 | 本地会员身份可完成登录 | 用户取消则留在预定页 |
| 提交 | 只提交用户主动选择的票种，默认不带套餐加购 | 无票种提示选择数量 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| 首屏 loading | `usePageRuntime` 默认 loading |
| 正常态 | 展示图片、信息、日期、票种和提交栏；无券时不展示优惠券入口 |
| 默认未选态 | 票种、年卡、套餐数量均为 0，底部提交禁用 |
| 未登录态 | 只在提交时弹登录，不阻断浏览 |
| 禁用态 | 0 件票时提交按钮禁用 |
| 弹层态 | 日期、须知弹层覆盖当前页；优惠券弹层仅在有券时出现 |
| 草稿态 | 登录后提交写入本地 `draftId` |

## 实现映射

- `src/pkg-ticket/pages/ticket-booking/index.tsx`：页面主体和交互编排。
- `src/pkg-ticket/pages/ticket-booking/index.scss`：页面样式。
- `src/pkg-ticket/services/ticket-booking.ts`：页面 DTO。
- `src/pkg-ticket/services/order-draft.ts`：订单草稿创建。
- `src/core/components/commerce/index.tsx`：日期、优惠券、数量和提交栏组件。
- `src/core/utils/wechat-actions.ts`：微信小程序动作封装。

## 变更记录

### v1.2

- 修正默认交易态：门票、年卡和套餐不再默认选中，预定页初始数量全部为 0。
- 普通“提交订单”只提交用户主动选择的票种；套餐入口只有用户点击并确认后才携带 1 份套餐进入确认订单。

### v1.1

- 优惠券能力改为低优先级预留：当前无券业务时隐藏入口，有券返回时再复用 `CouponSelectionPopup`。
- 提交订单创建草稿时只携带当前满足门槛的优惠券，避免后续开启券业务时确认订单误抵扣。
- 补齐页面内客服电话入口，使用微信拨号能力，失败时沿用项目封装复制号码降级。

### v1.0

- 升级为 `commercial-ready` 样板页。
- 日期选择改为项目封装 `DateSelectionPopup`，底层使用 NutUI `Calendar`。
- 日期和须知弹层统一迁入 `PageShare`，避免被固定提交栏压住；优惠券弹层作为预留能力，后续有券业务时再启用。
- 补齐图片预览、微信好友分享、预定须知、电话、地图和登录后续执行。
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
| 点分享按钮 | 直接唤起微信好友分享 |
| 点详情须知或票种预定须知 | 打开预定须知弹层，可关闭 |
| 点地图 | 调起地图或复制地址 |
| 点拨打 | 调起拨号或复制号码 |
| 点游玩日期 | 打开日期弹层，只能选 1 天 |
| 优惠券入口 | 当前无券业务时不展示；后续有券返回时再验弹层选择和金额联动 |
| 首次进入页面 | 所有票种 / 年卡数量均为 0，底部提交按钮禁用，不出现默认加购 |
| 加 1 张门票后提交 | 未登录先弹登录，本地会员登录后进入确认订单 |
