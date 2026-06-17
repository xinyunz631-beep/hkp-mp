# 小程序优惠券 BFF 必须接口复核

更新时间：2026-06-17 20:09 CST

后端核验基线：`backend-server origin/uat@320a014 docs(admin-config): 回填会员券接口UAT验证`

## 1. 本文件边界

本文件是 `coupon-bff-required-interfaces-2026-06-16.md` 的后续复核，只记录小程序 `/api/bff/**` 需要后端补齐的券链路能力。

管理后台优惠券配置、券模板、发券任务、会员券实例运营动作和管理端缺口仍维护在：

- `admin-frontend/docs/codex/admin-api-requirements/coupon-service.md`
- `admin-frontend/docs/codex/coupon-service-execution-matrix.md`

小程序不复制管理后台字段清单；只有当后台配置能力影响 C 端 BFF 验收时，才在本文引用后台文档路径和阻塞关系。

## 2. 2026-06-17 源码复核结论

本次按 `$hk-api-mp` 口径复核了 release、Controller、DTO、Service、Repository/Mapper：

| 链路 | 已核验源码 | 当前读写源 | 结论 |
| --- | --- | --- | --- |
| 我的优惠券 | `BffMemberCouponController` -> `PromotionClient.memberCoupons` -> `PromotionService.memberCoupons` -> `PromotionMemberCouponMapper.selectMemberCoupons` | `promotion_member_coupon` | 仍只读 promotion 会员券资产 |
| 下单可用券 | `BffPromotionController.availableCoupons` -> `PromotionClient.availableCoupons` -> `PromotionService.availableCoupons` -> `PromotionMemberCouponMapper.selectAvailableCoupons` | `promotion_member_coupon` | 仍只读 promotion 会员券资产 |
| 领券 | `BffPromotionController.claimCoupon` -> `PromotionService.claimCoupon` -> `issueCoupon` -> `PromotionMemberCouponMapper.insertMemberCoupon` | `promotion_member_coupon` | 免费领取能进入 promotion 资产 |
| K 币兑换 | `BffMemberKcoinController.exchange` -> `MemberClient.exchangeKcoin` -> `MemberService`/`CrmMemberRepository.kcoinExchange` -> `issueKcoinCoupons` | `crm_member_coupon_instance` | 兑换成功写 CRM 会员券实例，不进入 promotion 资产 |
| 管理端会员券运营 | `MarketingAdminController`/`MarketingAdminService`/`MarketingAdminMapper` | `crm_member_coupon_instance` | 管理端运营动作服务 CRM 实例，不代表小程序可用券同源完成 |
| 退款返还 | `BffPromotionController.refundReturnCoupons` -> `PromotionService.refundReturnCoupons` -> `PromotionMemberCouponMapper.refundReturnCoupons` | `promotion_member_coupon` | 返还仍回写 promotion 资产 |

结论：`origin/uat@320a014` 仍存在两套券资产源。K 币兑换和管理端运营在 `crm_member_coupon_instance`，小程序我的券、下单可用券、锁券、核销、释放、退款返还在 `promotion_member_coupon`。因此“小程序兑换成功后能在我的券看到并在门票/酒店确认单使用”当前不可验收。

## 3. P0 必须补齐：会员券资产同源

后端必须在 BFF 层给小程序暴露同一套会员券实例，稳定主键统一为 `couponNo`。

必须满足：

| 发券来源 | C 端入口 | 必须进入我的券 | 必须进入下单可用券 | 必须可售后返还 | 必须可管理端追溯 |
| --- | --- | --- | --- | --- | --- |
| 免费领取 | `POST /api/bff/promotion/coupons/claim` | 是 | 按券规则是 | 是 | 是 |
| K 币兑换 | `POST /api/bff/member/kcoin/exchanges` | 是 | 按券规则是 | 是 | 是 |
| 券包发放 | `GET /api/bff/member/coupon-packages` 关联包内券 | 包内券是 | 按券规则是 | 是 | 是 |
| 后台定向发券 | 管理后台发券任务或会员券运营动作 | 是 | 按券规则是 | 是 | 是 |
| 退款返还 | `POST /api/bff/promotion/coupons/refund-return` | 状态一致 | 状态一致 | 是 | 是 |

可接受实现方式由后端决定，但 BFF 给小程序的结果必须一致：

- 方案 A：promotion 服务读取 CRM 会员券实例，并把 CRM 实例映射为 promotion 状态机可锁定、可核销的资产。
- 方案 B：K 币兑换、后台发券和 CRM 会员券实例动作同步写入 `promotion_member_coupon`，并保证事务、幂等和状态回补。
- 方案 C：建设统一会员券资产表或视图，BFF 的我的券、可用券、锁券、核销、释放和返还全部读写该统一资产。

不接受：

- K 币扣减成功但只返回 `crm_member_coupon_instance`，我的券和下单可用券查不到。
- 我的券能看到但 `available` 查不到同一 `couponNo`。
- 可用券能选中但订单确认、锁券或核销阶段找不到同一 `couponNo`。
- 退款返还只更新一张表，导致我的券和管理端追溯状态不一致。

## 4. 小程序 BFF 字段级必需契约

### 4.1 `GET /api/bff/member/coupons`

必须支持查询参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `status` | enum | 否 | `available/locked/used/expired/disabled/voided/returned` |
| `sceneType` | enum | 否 | `TICKET/MALL/HOTEL/DINING` |
| `page` | number | 否 | 从 1 开始 |
| `size` | number | 否 | 每页数量 |

必须支持响应：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `list` | array | 当前页会员券实例 |
| `total` | number | 总条数 |
| `page` | number | 当前页 |
| `size` | number | 每页数量 |
| `hasMore` | boolean | 是否还有下一页 |

券项字段必须包括：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `couponNo` | string | 小程序全链路稳定券实例号 |
| `templateNo/templateId` | string | 券模板标识 |
| `title` | string | 券面标题 |
| `description` | string | 券说明 |
| `amount` | number | 优惠金额，单位分 |
| `discountRate` | number | 折扣券折扣，可为空 |
| `thresholdAmount` | number | 使用门槛，单位分 |
| `status` | enum | `available/locked/used/expired/disabled/voided/returned` |
| `validStartAt` | datetime | 生效时间 |
| `validEndAt` | datetime | 失效时间 |
| `source` | string | `claim/kcoin/package/task/manual/thirdParty/refundReturn` |
| `sourceName` | string | 活动、券包、任务或兑换项目名称 |
| `applicableSceneTypes` | enum[] | 可用业态 |
| `applicableObjectIds` | string[] | 可用商品、SKU、房型、票种或门店 |
| `packageNo` | string | 来源券包实例号，可为空 |
| `lockedOrderNo` | string | 锁定订单号，可为空 |
| `usedOrderNo` | string | 核销订单号，可为空 |
| `refundReturnStatus` | enum | `none/pending/returned/rejected/voided` |

### 4.2 `GET /api/bff/promotion/coupons/available`

必须支持查询参数：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sceneType` | enum | 是 | `TICKET/MALL/HOTEL/DINING` |
| `orderAmountCent` | number | 是 | 订单金额，单位分 |
| `itemIds` | string | 否 | 逗号分隔商品、票种、酒店或餐饮项目 |
| `skuIds` | string | 否 | 逗号分隔 SKU |
| `visitDate` | date | 否 | 门票游玩日期 |
| `checkInDate/checkOutDate` | date | 否 | 酒店入住/离店日期 |

响应券项必须包括：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `couponNo` | string | 必须与我的券同一实例 |
| `available` | boolean | 是否可用 |
| `unavailableReason` | string | 不可用原因，用户可读 |
| `discountAmount` | number | 预计优惠金额，单位分 |
| `thresholdAmount` | number | 使用门槛，单位分 |
| `priority` | number | 排序权重 |
| `mutexGroup` | string | 互斥组，可为空 |

门票和酒店确认单选择券后，小程序会把同一 `couponNo` 放入统一订单 `selectedCouponNos`，最终金额以后端 `POST /api/bff/orders/confirm` 为准。

### 4.3 `POST /api/bff/member/kcoin/exchanges`

请求只允许小程序提交：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `itemNo` | string | 是 | 兑换专区商品编号 |
| `quantity` | number | 是 | 兑换数量 |
| `idempotencyKey` | string | 是 | 防重复提交 |

BFF 从登录态注入会员身份，小程序不得传 `memberNo/openId/userId/phone/externalUserId`。

响应必须包括：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `exchangeNo` | string | 兑换单号 |
| `pointsCost` | number | 实际扣减 K 币 |
| `beforeBalance` | number | 兑换前余额 |
| `afterBalance` | number | 兑换后余额 |
| `couponNos` | string[] | 本次发放的统一券实例号 |
| `packageNos` | string[] | 本次发放的券包实例号 |
| `status` | enum | `success/pending/failed` |
| `message` | string | 用户可读提示 |

验收硬要求：

- 扣 K 币、写兑换流水、发券必须同事务或可补偿。
- `couponNos/packageNos` 必须能立即或最终一致进入 `member/coupons`、`coupon-packages` 和 `available`。
- 幂等重放同一 `idempotencyKey` 不得重复扣 K 币或重复发券。

### 4.4 `POST /api/bff/promotion/coupons/refund-return`

请求字段必须支持：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `orderNo` | string | 是 | 订单号 |
| `refundNo` | string | 是 | 退款单号 |
| `sceneType` | enum | 是 | `TICKET/MALL/HOTEL/DINING` |
| `couponNos` | string[] | 是 | 返还、作废或审核的券实例 |
| `refundAmount` | number | 是 | 退款金额，单位分 |
| `refundType` | enum/string | 是 | 全退、部分退等 |
| `idempotencyKey` | string | 是 | 防重复提交 |

返还后必须保证：

- `GET /api/bff/member/coupons` 能看到最新 `status/refundReturnStatus`。
- `GET /api/bff/promotion/coupons/available` 按策略决定是否重新可用。
- 管理端可按订单号、退款单号和 `couponNo` 追溯。

## 5. 小程序当前适配状态

小程序已完成真实接口适配，不会在运行时失败回本地 mock：

| 小程序能力 | 当前落点 | 状态 |
| --- | --- | --- |
| 券 BFF service | `src/core/services/bff-coupon-api.ts` | 已收口会员券、券包、领券、可用券、K 币余额/流水/兑换、退款返还 |
| 领券中心 | `src/pkg-member/services/coupon-center.ts`、`src/pkg-member/pages/coupon-center/index.tsx` | 免费券包读真实 BFF，领取调用 `claim` 并刷新 |
| 我的优惠券 | `src/pkg-member/services/coupons.ts`、`src/pkg-member/pages/coupons/index.tsx` | 已删除运行时本地券 mock，只读 `member/coupons` |
| K 币兑换 | `src/pkg-member/services/exchange.ts`、`src/pkg-member/pages/exchange-detail/index.tsx` | 提交调用 `member/kcoin/exchanges`，成功提示不承诺立即下单可用 |
| 门票用券 | `src/pkg-ticket/services/checkout.ts`、`src/pkg-ticket/services/order-draft.ts` | 确认单拉 `available`，选券后带 `selectedCouponNos` 重新 confirm |
| 酒店用券 | `src/pkg-hotel/services/checkout.ts` | 确认单拉 `available`，选券后带 `selectedCouponNos` 重新 confirm/create |

暂不宣称闭环：

| 链路 | 原因 | 当前口径 |
| --- | --- | --- |
| 商城用券 | 商城确认单仍未完成统一订单 `confirm/create/pay` 切换 | 先完成商城统一订单，再接券闭环 |
| 餐饮用券 | 餐饮订单 BFF 未完成 | 只记录缺口，不做假闭环 |
| K 币兑换券可下单使用 | 后端同源资产未完成 | 文档记录 P0 阻塞，页面不承诺“立即可用” |

## 6. 后端验收用例

后端补齐后，请至少用同一会员完成以下验收：

1. 后台创建一张门票/酒店可用券模板并发给会员，`GET /api/bff/member/coupons` 能看到同一 `couponNo`。
2. 同一会员打开门票或酒店确认单，`GET /api/bff/promotion/coupons/available` 能返回同一 `couponNo`。
3. 小程序选择该券后提交统一订单确认，`selectedCouponNos=[couponNo]`，`POST /api/bff/orders/confirm` 返回后端计算后的优惠和应付金额。
4. 下单后锁券、支付成功后核销，取消或超时后释放，状态能在我的券和管理端一致追溯。
5. K 币兑换成功返回 `couponNos/packageNos`，这些券能在我的券和下单可用券中按同一 `couponNo` 出现。
6. 发起退款后，`refund-return` 更新券状态；我的券、下单可用券和管理端会员券实例状态一致。

以上验收未通过前，小程序只能认为“券接口已接入，但优惠券全链路未闭环”。

## 7. 小程序侧可重复探针

小程序仓库已提供只读默认探针：

```bash
cd mini-program
yarn probe:coupon-closure
```

默认探针只读取：

- `GET /api/bff/member/coupons`
- `GET /api/bff/promotion/coupons/available`
- `GET /api/bff/member/coupon-packages`
- `GET /api/bff/member/kcoin/balance`

它会复用 `COUPON_PROBE_SESSION_FILE`，默认 `/tmp/hkitty-ticket-closure/mini-session.json`，并在 accessToken 过期时自动调用 `/api/bff/auth/refresh` 后重放一次。输出只包含 HTTP 状态、业务码、traceId、券号交集和阻塞原因，不打印 token、refreshToken 或 signSecret。

后端完成同源修复后，用目标券号做严格验收：

```bash
COUPON_PROBE_EXPECT_COUPON_NO=后端发放的couponNo \
COUPON_PROBE_STRICT=1 \
yarn probe:coupon-closure
```

如需显式触发写操作，必须手动打开开关，避免 UAT 误发券：

```bash
COUPON_PROBE_CLAIM=1 \
COUPON_PROBE_CLAIM_TEMPLATE_NO=promotion模板编号 \
COUPON_PROBE_STRICT=1 \
yarn probe:coupon-closure
```

```bash
COUPON_PROBE_KCOIN_EXCHANGE=1 \
COUPON_PROBE_KCOIN_ITEM_NO=兑换商品编号 \
COUPON_PROBE_KCOIN_QUANTITY=1 \
COUPON_PROBE_STRICT=1 \
yarn probe:coupon-closure
```

严格模式通过条件：目标 `couponNo` 必须同时出现在 `member/coupons` 和 `promotion/coupons/available`。如果只存在候选交集但没有目标券号，探针只作为只读观察，不证明后台发券或 K 币兑换券闭环。
