# HKP 小程序全页面工程 PRD

## 基本信息

- 项目：HKP C 端乐园小程序全页面工程
- 当前阶段：Phase 0 - PRD、截图资产、恢复入口和工程基线
- 当前 Git 分支：`feature/hkp-mini-phase-0-prd-assets`
- 基线提交：`36b7517 chore: 保存小程序当前开发基线`
- UI 事实源：`docs/ui/source/hkp-mini-page/*.png`
- UI 宽度：`750px`
- 首页策略：首页现有实现暂不改，本工程只补后续页面与入口串联。

## 设计意图

本阶段把 70 张 750px 页面截图沉淀为小程序工程事实源，先完成页面清单、分包边界、路由规划、mock service 规划和恢复机制。后续实现必须以页面流程可走通为第一目标，真实接口未完成前全部使用 service 层 mock 数据。

## 页面结构

- 主包：`home` 已实现；`park` 做乐园聚合入口；`member` 做会员聚合入口；`profile` 做我的入口。
- `pkg-mall`：商城首页、搜索、列表、详情、规格弹层、购物车、收藏、赠品选择。
- `pkg-ticket`：乐园详情、门票预定、日期选择、优惠券弹层、门票确认订单。
- `pkg-hotel`：酒店详情、入住人弹层、入住日期、房型详情、酒店确认订单。
- `pkg-dining`：餐饮首页、商家详情、套餐选择、餐饮确认订单。
- `pkg-order`：订单列表、详情、售后、退款、评价、物流、地址。
- `pkg-member`：优惠券、分享收益、收益明细、邀请明细、提现。

## 动态与静态边界

- 页面图片：开发时统一走 `AppImage`，本目录截图仅作为 UI 参考，不直接打包进小程序运行资源。
- mock 数据：统一放在各分包 service 或同目录 `mock-data.ts`，页面不直接写 mock 常量。
- 真实接口替换：后续只替换 service 内 request 与 mapper，保持页面 DTO 不变。
- 订单归属：商城、票务、酒店、餐饮下单后统一进入 `pkg-order` 的订单中心。

## 状态要求

- 必备：正常态、首屏 loading、局部提交 loading、空态、错误态、未登录态、可降级态。
- 空态：订单、购物车、地址、优惠券、收藏、邀请记录必须补齐。
- 错误态：阻断型接口失败才进入 `StatusException`。
- 未登录态：优先通过 `usePageRuntime` 或 `AuthAction` 引导登录，不在页面散写登录判断。

## 接口与 Service

- `pkg-mall/services`：商品、分类、搜索、SKU、购物车、收藏、赠品。
- `pkg-ticket/services`：乐园详情、门票商品、游玩日期、票务订单。
- `pkg-hotel/services`：酒店详情、房型、入住人、酒店订单。
- `pkg-dining/services`：餐饮首页、商家详情、套餐、餐饮订单。
- `pkg-order/services`：订单列表、订单详情、售后、退款、物流、评价、地址。
- `pkg-member/services`：优惠券、分享收益、邀请记录、提现。

所有 service 方法必须返回页面 DTO，字段归一和失败默认值在 service 内处理。

## 交互与跳转

- `park` 入口：乐园详情、票务预定、酒店详情、餐饮首页。
- `member` 入口：会员码、优惠券、分享收益、提现。
- `profile` 入口：我的订单、地址管理、售后记录、优惠券。
- 商品：商城首页/列表 -> 商品详情 -> SKU 弹层 -> 购物车/确认订单 -> 订单详情。
- 票务：乐园详情 -> 门票预定 -> 日期/优惠券 -> 确认订单 -> 订单详情。
- 酒店：酒店详情 -> 房型详情/入住信息 -> 确认订单 -> 订单详情。
- 餐饮：餐饮首页 -> 商家详情 -> 套餐选择 -> 确认订单 -> 订单详情。
- 售后：订单列表/详情 -> 选择售后类型 -> 售后申请 -> 售后进度。

## 实现映射

### `pkg-mall`

| 页面/状态 | 计划路由 | UI 图 |
|---|---|---|
| 商城首页 | `src/pkg-mall/pages/index` | `docs/ui/source/hkp-mini-page/mall-home.png` |
| 分类首页 | `src/pkg-mall/pages/category` | `docs/ui/source/hkp-mini-page/mall-category-home.png` |
| 分类列表 | `src/pkg-mall/pages/category-list` | `docs/ui/source/hkp-mini-page/mall-category-list.png` |
| 商品搜索 | `src/pkg-mall/pages/search` | `docs/ui/source/hkp-mini-page/mall-search-keyboard.png` |
| 商品列表 | `src/pkg-mall/pages/products` | `docs/ui/source/hkp-mini-page/mall-product-list.png` |
| 商品列表排序 | `src/pkg-mall/pages/products` | `docs/ui/source/hkp-mini-page/mall-product-list-sort.png` |
| 商品宫格 | `src/pkg-mall/pages/products` | `docs/ui/source/hkp-mini-page/mall-product-grid.png` |
| 推荐商品宫格 | `src/pkg-mall/pages/recommend` | `docs/ui/source/hkp-mini-page/mall-recommend-grid.png` |
| 商品详情长页 | `src/pkg-mall/pages/product-detail` | `docs/ui/source/hkp-mini-page/product-detail-long.png` |
| 商品属性弹层 | `src/pkg-mall/pages/product-detail` | `docs/ui/source/hkp-mini-page/product-detail-props-modal.png` |
| 商品 SKU 弹层 | `src/pkg-mall/pages/product-detail` | `docs/ui/source/hkp-mini-page/product-detail-sku-modal.png` |
| 商品优惠券弹层 | `src/pkg-mall/pages/product-detail` | `docs/ui/source/hkp-mini-page/product-detail-coupon-modal.png` |
| 购物车编辑 | `src/pkg-mall/pages/cart` | `docs/ui/source/hkp-mini-page/cart-edit.png` |
| 购物车结算 | `src/pkg-mall/pages/cart` | `docs/ui/source/hkp-mini-page/cart-checkout.png` |
| 购物车选择态 | `src/pkg-mall/pages/cart` | `docs/ui/source/hkp-mini-page/cart-settlement-edit.png` |
| 我的收藏 | `src/pkg-mall/pages/favorites` | `docs/ui/source/hkp-mini-page/mall-favorites.png` |
| 赠品选择 | `src/pkg-mall/pages/gift-select` | `docs/ui/source/hkp-mini-page/gift-select.png` |

### `pkg-ticket`

| 页面/状态 | 计划路由 | UI 图 |
|---|---|---|
| 乐园详情 | `src/pkg-ticket/pages/park-detail` | `docs/ui/source/hkp-mini-page/park-detail-intro.png` |
| 乐园导览详情 | `src/pkg-ticket/pages/park-guide` | `docs/ui/source/hkp-mini-page/park-guide-detail-map.png` |
| 门票确认订单 | `src/pkg-ticket/pages/checkout` | `docs/ui/source/hkp-mini-page/ticket-checkout.png` |
| 门票日期选择 | `src/pkg-ticket/pages/ticket-booking` | `docs/ui/source/hkp-mini-page/ticket-date-picker.png` |
| 门票预定表单 | `src/pkg-ticket/pages/ticket-booking` | `docs/ui/source/hkp-mini-page/ticket-booking-form.png` |
| 门票优惠券弹层 | `src/pkg-ticket/pages/ticket-booking` | `docs/ui/source/hkp-mini-page/ticket-coupon-modal.png` |
| 门票预定长页 | `src/pkg-ticket/pages/ticket-booking` | `docs/ui/source/hkp-mini-page/ticket-booking-long.png` |
| 门票预定简版 | `src/pkg-ticket/pages/ticket-booking` | `docs/ui/source/hkp-mini-page/ticket-booking-compact.png` |

### `pkg-hotel`

| 页面/状态 | 计划路由 | UI 图 |
|---|---|---|
| 酒店详情 | `src/pkg-hotel/pages/index` | `docs/ui/source/hkp-mini-page/hotel-detail.png` |
| 入住人选择弹层 | `src/pkg-hotel/pages/checkout` | `docs/ui/source/hkp-mini-page/hotel-guest-selector-modal.png` |
| 入住人数 | `src/pkg-hotel/pages/checkout` | `docs/ui/source/hkp-mini-page/hotel-guest-count.png` |
| 酒店确认订单 | `src/pkg-hotel/pages/checkout` | `docs/ui/source/hkp-mini-page/hotel-checkout.png` |
| 房间详情 | `src/pkg-hotel/pages/room-detail` | `docs/ui/source/hkp-mini-page/hotel-room-detail.png` |

### `pkg-dining`

| 页面/状态 | 计划路由 | UI 图 |
|---|---|---|
| 餐饮首页 | `src/pkg-dining/pages/index` | `docs/ui/source/hkp-mini-page/dining-home.png` |
| 商家详情 | `src/pkg-dining/pages/merchant-detail` | `docs/ui/source/hkp-mini-page/dining-merchant-detail.png` |
| 套餐选择下单 | `src/pkg-dining/pages/merchant-detail` | `docs/ui/source/hkp-mini-page/dining-merchant-sku-checkout.png` |
| 餐饮确认订单 | `src/pkg-dining/pages/checkout` | `docs/ui/source/hkp-mini-page/dining-checkout.png` |
| 餐饮提交订单 | `src/pkg-dining/pages/checkout` | `docs/ui/source/hkp-mini-page/dining-submit-order.png` |

### `pkg-order`

| 页面/状态 | 计划路由 | UI 图 |
|---|---|---|
| 订单列表全部 | `src/pkg-order/pages/index` | `docs/ui/source/hkp-mini-page/order-list-all.png` |
| 订单列表退款 | `src/pkg-order/pages/index` | `docs/ui/source/hkp-mini-page/order-list-refund.png` |
| 订单列表退款态 | `src/pkg-order/pages/index` | `docs/ui/source/hkp-mini-page/order-list-refund-state.png` |
| 订单待付款 | `src/pkg-order/pages/index` | `docs/ui/source/hkp-mini-page/order-list-pending-pay.png` |
| 订单待发货 | `src/pkg-order/pages/index` | `docs/ui/source/hkp-mini-page/order-list-pending-ship.png` |
| 订单已完成 | `src/pkg-order/pages/index` | `docs/ui/source/hkp-mini-page/order-list-completed.png` |
| 订单详情已支付 | `src/pkg-order/pages/detail` | `docs/ui/source/hkp-mini-page/order-detail-paid.png` |
| 订单详情已完成 | `src/pkg-order/pages/detail` | `docs/ui/source/hkp-mini-page/order-detail-completed.png` |
| 确认订单地址态 | `src/pkg-order/pages/checkout` | `docs/ui/source/hkp-mini-page/order-checkout-address.png` |
| 收货地址列表 | `src/pkg-order/pages/address` | `docs/ui/source/hkp-mini-page/address-list.png` |
| 收货地址选择 | `src/pkg-order/pages/address` | `docs/ui/source/hkp-mini-page/address-select-list.png` |
| 取消订单申请 | `src/pkg-order/pages/cancel` | `docs/ui/source/hkp-mini-page/order-cancel-apply.png` |
| 售后申请商品 | `src/pkg-order/pages/aftersale-apply` | `docs/ui/source/hkp-mini-page/aftersale-apply-product.png` |
| 售后申请表单 | `src/pkg-order/pages/aftersale-apply` | `docs/ui/source/hkp-mini-page/aftersale-submit-logistics.png` |
| 售后类型商品 | `src/pkg-order/pages/aftersale-type` | `docs/ui/source/hkp-mini-page/aftersale-type-product.png` |
| 售后类型餐饮 | `src/pkg-order/pages/aftersale-type` | `docs/ui/source/hkp-mini-page/aftersale-type-food.png` |
| 售后列表 | `src/pkg-order/pages/aftersale-list` | `docs/ui/source/hkp-mini-page/aftersale-list.png` |
| 售后记录 | `src/pkg-order/pages/aftersale-list` | `docs/ui/source/hkp-mini-page/aftersale-list-records.png` |
| 售后进度商品 | `src/pkg-order/pages/aftersale-progress` | `docs/ui/source/hkp-mini-page/aftersale-progress-product-form.png` |
| 售后进度退款 | `src/pkg-order/pages/aftersale-progress` | `docs/ui/source/hkp-mini-page/aftersale-progress-refund-detail.png` |
| 售后进度详情 | `src/pkg-order/pages/aftersale-progress` | `docs/ui/source/hkp-mini-page/aftersale-progress-detail-product.png` |
| 售后原因详情 | `src/pkg-order/pages/aftersale-progress` | `docs/ui/source/hkp-mini-page/aftersale-progress-detail-reason.png` |
| 物流详情 | `src/pkg-order/pages/logistics` | `docs/ui/source/hkp-mini-page/logistics-detail.png` |
| 创建评价 | `src/pkg-order/pages/review-create` | `docs/ui/source/hkp-mini-page/review-create.png` |
| 评价列表 | `src/pkg-order/pages/review-list` | `docs/ui/source/hkp-mini-page/review-list.png` |

### `pkg-member`

| 页面/状态 | 计划路由 | UI 图 |
|---|---|---|
| 已使用优惠券 | `src/pkg-member/pages/coupons` | `docs/ui/source/hkp-mini-page/coupon-list-used.png` |
| 已过期优惠券 | `src/pkg-member/pages/coupons` | `docs/ui/source/hkp-mini-page/coupon-list-expired.png` |
| 已过期优惠券补充 | `src/pkg-member/pages/coupons` | `docs/ui/source/hkp-mini-page/coupon-list-expired-alt.png` |
| 分享规则 | `src/pkg-member/pages/share-rule` | `docs/ui/source/hkp-mini-page/share-rule.png` |
| 分享收益空态 | `src/pkg-member/pages/share` | `docs/ui/source/hkp-mini-page/share-home-empty.png` |
| 分享收益统计 | `src/pkg-member/pages/share` | `docs/ui/source/hkp-mini-page/share-home-stats.png` |
| 收益明细 | `src/pkg-member/pages/share-income` | `docs/ui/source/hkp-mini-page/share-income-detail.png` |
| 邀请明细 | `src/pkg-member/pages/share-invite` | `docs/ui/source/hkp-mini-page/share-invite-list.png` |
| 提现记录 | `src/pkg-member/pages/withdraw-records` | `docs/ui/source/hkp-mini-page/withdraw-records.png` |
| 申请提现 | `src/pkg-member/pages/withdraw` | `docs/ui/source/hkp-mini-page/withdraw-apply.png` |

## 变更记录

- `2026-05-16`：建立 HKP 全页面工程 PRD，登记 70 张 750px UI 图、分包边界、路由规划和 service 替换策略。

## 验证记录

- Phase 0 基线前已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
