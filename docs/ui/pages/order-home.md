# 订单首页页面设计说明

## 基本信息

- 页面：订单首页
- 路由：src/pkg-order/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：docs/ui/source/hkp-mini-page/order-list-all.png
- 当前版本：v0.5-entry-query-empty
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-order/pages/index/index.tsx
  - src/pkg-order/pages/index/index.scss
  - src/pkg-order/pages/index/index.config.ts
  - src/pkg-order/services/index.ts

## 设计意图

订单分包首页按 `order-list-all.png` 先完成订单 Tab、订单分组、订单商品列表和动作按钮，当前已补齐取消订单与申请售后入口，作为 Phase 5 订单主链路入口页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：顶部订单状态 Tab、日期/状态分组、订单商品项、底部合计文案、状态空态。

## 动态与静态边界

- 页面图片：真实图片区域后续统一使用 `AppImage`。
- 接口数据：通过对应分包 service 获取，页面不直接写接口 mock。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：无对应状态订单时使用 `BaseEmpty` 展示业务空态。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchOrderHomeData()` | service 内归一和兜底 | 否 |

## 交互与跳转

- 点击订单商品项进入 `order-detail`。
- 点击“去评价”进入评价晒单页。
- 点击“查看物流”进入物流详情页。
- 点击“申请售后”进入售后类型页。
- 点击“取消订单”进入取消订单页。
- 支付成功写入的本地订单会合流展示到订单首页。
- 未识别动作不再使用占位文案，改为业务 toast。
- 支持 `?tab=pendingPay|pendingShip|pendingReceive|pendingReview` 从外部入口默认选中状态。
- Tab 现在按 `pendingPay / pendingShip / pendingReceive / pendingReview` 做本地过滤，后续接真实订单状态时继续细化。

## 微信开发工具验收清单

- 切换订单 Tab，列表应按状态筛选。
- 从“我的”页点击待支付、待收货、待评价进入订单页，应默认选中对应 Tab。
- 进入暂无订单的状态 Tab，应展示统一空态，而不是空白页面。
- 点击订单卡，应进入订单详情。
- 点击去评价、查看物流、申请售后、取消订单，应进入对应页面。

## 实现映射

- `src/pkg-order/pages/index/index.tsx`：页面骨架相关文件。
- `src/pkg-order/pages/index/index.scss`：页面骨架相关文件。
- `src/pkg-order/pages/index/index.config.ts`：页面骨架相关文件。

## 变更记录

### v0.5-entry-query-empty

- 订单首页支持外部入口通过 `tab` query 默认选中订单状态。
- 无对应状态订单时补齐 `BaseEmpty` 空态，避免从“我的”页状态入口跳入后出现空白。

### v0.4

- 订单首页合流展示本地生成订单，并移除未知动作占位文案。
- 页面状态推进到 `interaction-ready`。

### v0.3

- 订单首页补齐取消订单、申请售后、查看物流和去评价动作路由。
- Tab 过滤从占位逻辑改为按订单状态键值过滤。

### v0.2

- 按 `order-list-all.png` 完成订单首页首版 UI。
- 新增 `fetchOrderHomeData()`，统一提供订单 Tab、分组和订单项数据。
- 页面已串到订单详情页，订单主链路开始成形。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
