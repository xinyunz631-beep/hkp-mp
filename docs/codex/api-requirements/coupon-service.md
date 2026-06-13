# 小程序会员券接口缺口清单

## 本阶段

- 日期：`2026-06-13`
- 后端只读同步分支：`backend-server uat`
- 已核验后端辅助提交：`0a33cfe`、`2569e74`、`4080957`、`06ef472`
- 适配范围：小程序会员券资产、领券中心、兑换码、门票结算用券、带券下单后订单详情承接。

## 已适配接口

| 能力 | 接口 | 前端落点 | 结论 |
| --- | --- | --- | --- |
| 我的优惠券 | `GET /api/bff/member/coupons` | `src/core/services/bff-api.ts`、`src/pkg-member/services/coupons.ts` | 已按当前 token 用户读取券资产；前端不传会员身份字段；页面不再回退本地券。 |
| 领券中心券包 | `GET /api/bff/member/coupon-packages` | `src/core/services/bff-api.ts`、`src/pkg-member/services/coupon-center.ts` | 已读取 promotion 同源券包；页面展示可领取状态和后端原因。 |
| 领取优惠券 | `POST /api/bff/promotion/coupons/claim` | `src/pkg-member/pages/coupon-center/index.tsx` | 已按 `templateNo` 领取，写接口走 HMAC 签名。 |
| 兑换码兑券 | `POST /api/bff/promotion/coupons/exchange` | `src/pkg-member/pages/coupon-center/index.tsx`、`src/pkg-member/services/exchange.ts` | 已在领券中心增加兑换码入口；兑换专区只在 CRM 条目提供真实 `exchangeCode` 时允许提交。 |
| 退款退券服务入口 | `POST /api/bff/promotion/coupons/refund-return` | `src/core/services/bff-api.ts` | service 已补齐，订单退款页面尚未接真实售后触发。 |
| 门票结算可用券 | `GET /api/bff/member/coupons?status=AVAILABLE` | `src/pkg-ticket/services/ticket-booking.ts` | 已筛选 `TICKET/ALL` 场景券，作为门票结算券列表。 |
| 带券创建门票订单 | `POST /api/bff/orders` | `src/core/services/bff-order-api.ts`、`src/pkg-ticket/services/order-draft.ts` | 已切新版统一创建单，提交 `selectedCouponNos`；门票创建成功后按后端免支付出票结果进入订单详情。 |
| 订单详情票码承接 | `GET /api/bff/orders/{orderNo}` | `src/pkg-order/services/detail.ts`、`src/pkg-order/pages/detail/index.tsx` | 已展示后端 `ticketVouchers` 中的智游宝票码或二维码，不在前端自造码。 |

## 后端仍需补齐或确认

### 1. K 币商品兑换提交接口

当前 `/api/bff/promotion/coupons/exchange` 只支持真实兑换码兑券，不能承接“兑换专区”里的 K 币商品兑换。

建议新增：

| 字段 | 类型 | 必填 | 生成方 | 说明 |
| --- | --- | --- | --- | --- |
| `itemNo` | `string` | 是 | 前端提交 | CRM 兑换商品编号。 |
| `quantity` | `number` | 是 | 前端提交 | 兑换数量，默认每次 1。 |
| `addressNo` | `string` | 否 | 前端提交 | 实物兑换时使用。 |
| `contactName` | `string` | 否 | 前端提交 | 收件或核销联系人。 |
| `contactPhone` | `string` | 否 | 前端提交 | 联系手机号。 |
| `remark` | `string` | 否 | 前端提交 | 兑换备注。 |
| `exchangeOrderNo` | `string` | 是 | 后端生成 | 兑换单号，前端不可生成。 |
| `memberNo/userId` | `string` | 否 | 后端派生 | 必须从 token 派生，前端不传。 |

响应建议：`exchangeOrderNo`、`itemNo`、`itemName`、`quantity`、`pointsCost`、`totalPointsCost`、`orderStatus`、`createdAt`、`updatedAt`。

### 2. K 币余额事实源

当前页面不能真实判断用户 K 币余额，只能在无 `exchangeCode` 时阻断提交。

建议接口：

| 字段 | 类型 | 必填 | 生成方 | 说明 |
| --- | --- | --- | --- | --- |
| `pointsBalance` | `number` | 是 | 后端返回 | 当前可用 K 币。 |
| `pointsFrozen` | `number` | 是 | 后端返回 | 冻结 K 币。 |
| `pointsExpireAt` | `string` | 否 | 后端返回 | 最近过期时间。 |

可独立提供 `GET /api/bff/member/points/balance`，也可并入 `GET /api/bff/auth/member/status` 或 `GET /api/bff/crm/center`。

### 3. 后台券包编排与小程序券包一致性

当前小程序 `GET /api/bff/member/coupon-packages` 由 promotion 券模板同源生成；后台运营配置的券包组合、包内多券、包库存和包领取限制是否会进入该 BFF 仍需确认。

小程序需要字段：

| 字段 | 类型 | 必填 | 生成方 | 说明 |
| --- | --- | --- | --- | --- |
| `packageNo` | `string` | 是 | 后端生成 | 券包编号。 |
| `packageName` | `string` | 是 | 后端返回 | 券包名称。 |
| `sceneType` | `string` | 是 | 后端返回 | 适用场景。 |
| `coupons` | `PromotionCouponTemplateView[]` | 是 | 后端返回 | 包内券模板列表，需支持多券。 |
| `claimable` | `boolean` | 是 | 后端计算 | 当前用户是否可领。 |
| `reason` | `string` | 否 | 后端返回 | 不可领取原因。 |
| `remainingStock` | `number` | 否 | 后端返回 | 包库存。 |
| `perUserLimit` | `number` | 否 | 后端返回 | 单用户限制。 |
| `validStartAt/validEndAt` | `string` | 否 | 后端返回 | 券包展示有效期。 |

### 4. 退款退券触发口径

后端已有 `POST /api/bff/promotion/coupons/refund-return`，但订单退款接口文档写明“优惠券不由前端核销”。需要明确：

- `POST /api/bff/orders/{orderNo}/refunds` 成功后是否由后端自动退券。
- 若自动退券，退款响应需返回 `couponReturnStatus`、`returnedCouponNos`、`returnedCount`。
- 若不自动退券，需要由后端提供订单售后侧安全编排接口，前端不能直接拼接 promotion 退券当作退款成功。

### 5. 商城/酒店结算用券页面适配条件

后端统一订单已支持 `selectedCouponNos`，但当前小程序本阶段只完成门票场景。

后端需确认：

- `MALL/HOTEL` 订单确认和创建均按 `selectedCouponNos` 试算、锁定和详情回显。
- 订单详情返回 `discountAmountCent`、`promotionSnapshotNo`、已选券号或券名，便于小程序展示优惠明细。
- `GET /api/bff/promotion/coupons/available` 是否用于按订单金额查询精确可用券，还是仅用于结算页候选券；当前门票阶段先用会员券资产列表筛选候选券。

## 本阶段前端处理原则

- 不修改后端代码。
- 后端未满足的 K 币商品兑换、退款退券自动触发、后台券包编排一致性不做假成功。
- 已进入真实接口链路的会员券、领券、兑换码和门票结算用券不再回退本地 mock。
- 票务页面改动只服务券消费闭环：可用券展示、提交 `selectedCouponNos`、订单详情承接后端出票结果。
