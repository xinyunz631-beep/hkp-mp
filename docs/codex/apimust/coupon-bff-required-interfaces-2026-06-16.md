# 小程序优惠券 BFF 必须接口清单

更新时间：2026-06-17

后端核验基线：`backend-server origin/uat@abbe80b feat(multi): 补齐票券K币P0接口`
最新核验：`backend-server origin/uat@320a014 docs(admin-config): 回填会员券接口UAT验证`

2026-06-17 追加结论：

- `320a014` 本批真实变更只覆盖 `admin-config`：会员补录、门店字典、CRM 会员券实例延期/冻结/解冻/人工退款返还和发券失败 CSV 导出。
- 后端 release `2026-06-17-admin-member-coupon-gap-closure.md` 明确写明未包含“CRM 券实例与小程序 promotion 券资产完全同源”。
- 本次未修改 `hellokitty-park-bff-service` 的 `BffMemberCouponController`、`BffMemberKcoinController`、`BffPromotionController`，未修改 `member-service` K 币兑换写券逻辑，也未修改 `promotion-service` 会员券查询/可用券 mapper。
- 小程序可继续调用已有 BFF，但 `POST /api/bff/member/kcoin/exchanges` 返回的 `couponNos` 仍来自 `crm_member_coupon_instance`，`GET /api/bff/member/coupons` 和 `GET /api/bff/promotion/coupons/available` 仍读取 `promotion_member_coupon`；“兑换成功后我的券/下单可用券可见”仍不可验收。

## 1. 本文件边界

本文件只面向小程序 BFF：

- 领券中心领取
- K 币兑换券
- 我的优惠券
- 下单可用券
- 锁券、核销、释放
- 退款返还
- 券包和分页状态字段

管理后台优惠券配置、运营动作和管理端缺口不在本文件展开。小程序依赖后台闭环时，只引用：

- `admin-frontend/docs/codex/admin-api-requirements/coupon-service.md`
- `admin-frontend/docs/codex/coupon-service-execution-matrix.md`

## 2. 当前后端事实

已存在小程序 BFF：

| 接口 | 当前用途 | 小程序结论 |
| --- | --- | --- |
| `GET /api/bff/member/coupons` | 我的券列表 | 已存在，但当前读取 promotion 会员券资产 |
| `GET /api/bff/member/coupon-packages` | 我的券包 | 已存在，但需要确认与券包实例、包内券实例同源 |
| `POST /api/bff/promotion/coupons/claim` | 领券动作 | 已存在；当前真实 DTO 只接收 `templateNo`，小程序已按该口径接入 |
| `GET /api/bff/promotion/coupons/available` | 下单可用券 | 已存在，但当前读取 promotion 会员券资产 |
| `POST /api/bff/promotion/lock` | 锁券 | 已存在 |
| `POST /api/bff/promotion/confirm` | 核销优惠 | 已存在 |
| `POST /api/bff/promotion/release` | 释放优惠 | 已存在 |
| `POST /api/bff/promotion/coupons/refund-return` | 退款返还 | 已存在，需要与订单退款和会员券资产同源验收 |
| `GET /api/bff/member/kcoin/balance` | K 币余额 | 已存在 |
| `GET /api/bff/member/kcoin/ledgers` | K 币流水 | 已存在 |
| `POST /api/bff/member/kcoin/exchanges` | K 币兑换专区提交 | 已存在，当前发券写 CRM 会员券实例 |

关键断链：

- `POST /api/bff/member/kcoin/exchanges` 当前经 member service 写入 `crm_member_coupon_instance`。
- `GET /api/bff/member/coupons` 和 `GET /api/bff/promotion/coupons/available` 当前经 promotion service 读取 `promotion_member_coupon`。
- 因此会出现“兑换成功但我的券/下单可用券看不到”的同源断链。后端必须统一 CRM 会员券实例、promotion 会员券资产和订单优惠状态机。

注意：`POST /api/bff/promotion/coupons/exchange` 是兑换码核销类接口，不等同于小程序 K 币兑换专区提交。

## 3. 必须补齐的同源资产契约

### 3.1 会员券实例同源

后端必须保证以下发券来源最终进入同一套可查询、可下单、可售后返还的会员券资产：

| 来源 | 生成动作 | 我的券 | 下单可用券 | 管理端追溯 |
| --- | --- | --- | --- | --- |
| 免费领取 | `POST /api/bff/promotion/coupons/claim` | `GET /api/bff/member/coupons` 可见 | `GET /api/bff/promotion/coupons/available` 可见 | 可在会员券实例按活动/来源回查 |
| K 币兑换 | `POST /api/bff/member/kcoin/exchanges` | 必须可见 | 必须按券规则可见 | 来源为 `exchange/kcoin`，可回查 K 币扣减流水 |
| 券包发放 | 后台赠送、权益、新人礼、生日礼或兑换 | 券包和包内券可见 | 包内券按规则可见 | 可按 `packageNo` 回查 |
| 定向发券 | 后台任务发券 | 必须可见 | 必须按券规则可见 | 可按 `issueTaskId` 回查 |
| 三方券发放 | 导入或活动触达 | 必须可见 | 按券类型决定 | 可追溯三方批次和码库存 |

后端返回给小程序的会员券实例主键必须稳定，建议统一为 `couponNo`。如果内部同时存在 CRM 实例号和 promotion 实例号，BFF 必须完成映射，小程序不接收也不传 `memberNo/openId/userId/phone/externalUserId`。

### 3.2 我的优惠券列表

接口：`GET /api/bff/member/coupons`

查询参数必须支持：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `status` | enum | 否 | `available/used/expired/disabled/locked`，小程序可按 tab 查询 |
| `page` | number | 否 | 页码，从 1 开始 |
| `size` | number | 否 | 每页数量 |
| `sceneType` | enum | 否 | `TICKET/MALL/HOTEL/DINING`，用于业务入口筛选 |

响应必须支持：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `list` | array | 当前页券列表 |
| `total` | number | 总数 |
| `page` | number | 当前页 |
| `size` | number | 每页数量 |
| `hasMore` | boolean | 是否还有下一页 |

券项字段必须支持：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `couponNo` | string | 小程序券实例稳定主键 |
| `templateId` | string | 券模板 ID |
| `title` | string | 券面标题 |
| `description` | string | 券说明 |
| `amount` | number | 优惠金额，单位分 |
| `discountRate` | number | 折扣券折扣，可为空 |
| `thresholdAmount` | number | 使用门槛，单位分 |
| `status` | enum | `available/locked/used/expired/disabled/voided/returned` |
| `validStartAt` | datetime | 生效时间 |
| `validEndAt` | datetime | 失效时间 |
| `source` | string | `claim/kcoin/package/task/manual/thirdParty` 等 |
| `sourceName` | string | 活动、券包、任务或兑换项目名称 |
| `applicableSceneTypes` | enum[] | 可用业态 |
| `applicableObjectIds` | string[] | 可用商品、房型、票种或门店对象 |
| `useType` | enum/string | 小程序使用路径，线上/线下/指定业态 |
| `buttonText` | string | 可选，券卡动作文案 |
| `packageNo` | string | 来源券包实例，可为空 |
| `lockedOrderNo` | string | 锁定订单，可为空 |
| `usedOrderNo` | string | 已核销订单，可为空 |
| `refundReturnStatus` | enum | `none/pending/returned/rejected` |

### 3.3 我的券包列表

接口：`GET /api/bff/member/coupon-packages`

必须支持分页和状态：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `packageNo` | string | 会员券包实例号 |
| `packageId` | string | 券包模板 ID |
| `packageName` | string | 券包名称 |
| `packageStatus` | enum | `available/partiallyUsed/used/expired/voided` |
| `source` | string | `gift/newUser/birthday/kcoin/manual` |
| `couponNos` | string[] | 包内券实例号 |
| `coupons` | array | 包内券摘要，字段同我的券 |
| `validStartAt/validEndAt` | datetime | 券包有效期 |

券包内券必须同时能在 `GET /api/bff/member/coupons` 中按 `couponNo` 查到，不能只存在券包响应里。

### 3.4 领券中心领取

展示接口已按小程序当前链路收口：

- 可免费领取券包：`GET /api/bff/member/coupon-packages`
- K 币兑换入口：`GET /api/bff/crm/entries/coupons` 中 `pointsCost > 0` 的兑换项

领取接口：`POST /api/bff/promotion/coupons/claim`

当前 `backend-server origin/uat@320a014` 真实请求体未变，仍为：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `templateNo` | string | 是 | promotion 券模板号；BFF 从登录态注入会员身份 |

当前真实响应：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `coupon` | object | 领取后的券实例摘要，字段按 promotion 当前 `PromotionCouponView/AssetView` 返回 |

后续若要恢复活动/券包/CRM 入口追溯能力，BFF 可在不要求前端传会员身份字段的前提下补充以下字段：

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `activityId` | string | 否 | 领券活动 ID，建议从展示项 `extraPayload.activityId` 或同级字段返回 |
| `giftId` | string | 否 | 多礼品时指定 |
| `itemNo` | string | 否 | CRM 入口项编号，便于后端追溯 |
| `channel` | string | 否 | 默认 `miniProgram` |
| `scene` | string | 否 | 默认 `couponCenter` |
| `idempotencyKey` | string | 否 | 防重复提交 |

响应：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `claimResult` | enum | 可选；`success/repeated/limitReached/outOfStock/notEligible/expired` |
| `couponNos` | string[] | 本次生成或已存在券实例 |
| `packageNos` | string[] | 本次生成或已存在券包实例 |
| `message` | string | 用户可读提示 |

领取成功或重复领取时，新券必须能立即通过 `GET /api/bff/member/coupons` 或券包接口查询到。

当前核验补充：`320a014` 没有修改 `PromotionCouponClaimRequest`，BFF 领取仍只转发 `templateNo`，领取成功写入 `promotion_member_coupon`。

### 3.5 K 币兑换

余额接口：`GET /api/bff/member/kcoin/balance`

流水接口：`GET /api/bff/member/kcoin/ledgers`

兑换提交接口：`POST /api/bff/member/kcoin/exchanges`

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `itemNo` | string | 是 | 兑换专区商品编号 |
| `quantity` | number | 是 | 兑换数量 |
| `idempotencyKey` | string | 是 | 防重复提交 |

响应：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `exchangeNo` | string | 兑换单号 |
| `pointsCost` | number | 实际扣减 K 币 |
| `beforeBalance` | number | 兑换前余额 |
| `afterBalance` | number | 兑换后余额 |
| `couponNos` | string[] | 发放的券实例 |
| `packageNos` | string[] | 发放的券包实例 |
| `status` | enum | `success/pending/failed` |
| `message` | string | 用户可读提示 |

验收硬要求：

- 兑换成功扣 K 币和发券必须在同一事务或可恢复事务链路内。
- `couponNos/packageNos` 必须进入我的券和下单可用券，不允许只写 `crm_member_coupon_instance` 而 promotion 资产不可见。
- 失败时必须返回业务错误，不能扣 K 币后无券、也不能发券后 K 币流水缺失。

当前核验补充：`320a014` 的 `CrmMemberRepository.issueKcoinCoupons()` 仍只 `INSERT INTO crm_member_coupon_instance`，`kcoinExchangeResponse()` 返回 `exchangeNo/itemNo/quantity/couponNos/packageNos/pointsCost/beforeBalance/afterBalance/pointsBalance`；未写入 `promotion_member_coupon`，也未在 BFF 层做 CRM 到 promotion 的资产桥接。

### 3.6 下单可用券

接口：`GET /api/bff/promotion/coupons/available`

查询参数必须支持：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `sceneType` | enum | 是 | `TICKET/MALL/HOTEL/DINING` |
| `orderAmountCent` | number | 是 | 订单金额，单位分 |
| `itemIds` | string | 否 | 逗号分隔商品、票种、酒店或餐饮项目 ID |
| `skuIds` | string | 否 | 逗号分隔 SKU |
| `visitDate/checkInDate/checkOutDate` | date | 否 | 业务日期 |

响应券项需要带：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `couponNo` | string | 必须与我的券同一实例 |
| `available` | boolean | 是否可用 |
| `unavailableReason` | string | 不可用原因，用户可读 |
| `discountAmount` | number | 本券预计优惠金额，单位分 |
| `thresholdAmount` | number | 门槛，单位分 |
| `priority` | number | 排序权重 |
| `mutexGroup` | string | 互斥组，可为空 |

前端可展示可用和不可用券，但订单最终金额以后端 `POST /api/bff/orders/confirm` 为准。

### 3.7 锁券、确认、释放和退款返还

接口：

- `POST /api/bff/promotion/lock`
- `POST /api/bff/promotion/confirm`
- `POST /api/bff/promotion/release`
- `POST /api/bff/promotion/coupons/refund-return`

必须满足：

| 动作 | 必填字段 | 后端状态要求 |
| --- | --- | --- |
| 锁券 | `orderNo/sceneType/selectedCouponNos/idempotencyKey` | 券从 `available` 进入 `locked`，写 `lockedOrderNo` 和锁定过期时间 |
| 确认核销 | `orderNo/sceneType/selectedCouponNos/idempotencyKey` | 券进入 `used`，写订单、核销时间和预算消耗 |
| 释放 | `orderNo/sceneType/selectedCouponNos/reason/idempotencyKey` | 未支付取消或超时释放回 `available` |
| 退款返还 | `orderNo/refundNo/sceneType/couponNos/refundAmount/refundType/idempotencyKey` | 按券模板策略返还、作废或待审核，写 `refundReturnStatus` |

退款返还后，`GET /api/bff/member/coupons` 和 `GET /api/bff/promotion/coupons/available` 必须能看到一致状态。

## 4. 小程序前端约束

- 小程序前端不得传 `memberNo/openId/userId/phone/externalUserId`。
- 写接口统一走 `sign: true`。
- 已接入真实接口的页面不得失败回本地 mock。
- 后端未完成同源资产前，小程序可以阻断兑换后的“立即使用”承诺，但必须继续展示后端返回的业务结果。
- 页面不展示“接口、mock、测试、技术状态”等内部文案。

## 5. 验收标准

| 场景 | 必须通过 |
| --- | --- |
| 领券中心领取 | 领取成功后刷新领券中心；我的券能看到新券；重复领取返回业务化提示 |
| K 币兑换券 | K 币扣减、兑换流水、我的券、下单可用券同源可见 |
| 我的优惠券 | `available/used/expired/locked/disabled` 状态和分页稳定 |
| 门票/酒店确认单 | 可用券来自 BFF；选择券后带 `selectedCouponNos` 调订单确认；金额以后端确认为准 |
| 商城确认单 | 先切统一订单 `confirm/create/pay` 后再接券；未切前不能宣称商城券闭环 |
| 餐饮确认单 | 订单 BFF 未完成时只记录缺口，不做假闭环 |
| 退款返还 | 订单退款后券资产状态、管理端追溯和小程序可见状态一致 |

## 6. 当前后端阻塞清单

| 编号 | 阻塞 | 影响 |
| --- | --- | --- |
| MP-COUPON-001 | CRM 会员券实例与 promotion 会员券资产未同源 | K 币兑换、后台发券、券包赠送可能无法进入我的券和下单可用券 |
| MP-COUPON-002 | `member/coupons` 和 `available` 状态字段需要统一枚举和分页字段 | 小程序无法稳定展示已领取、已使用、已过期、锁定和返还状态 |
| MP-COUPON-003 | K 币兑换响应当前已返回 `couponNos/packageNos/exchangeNo/pointsCost/beforeBalance/afterBalance`，但仍缺稳定 `status/message` 且 `couponNos` 未进入 promotion 同源资产 | 兑换后只能刷新余额或展示受理结果，不能宣称券已可下单使用 |
| MP-COUPON-004 | 退款返还需要回写同一券实例状态机 | 售后后我的券和可用券状态可能不一致 |
| MP-COUPON-005 | 管理后台配置闭环仍有未补能力 | 后台配置、三方券、券包、预算和互斥需继续按管理后台文档推进，小程序只消费完成后的 BFF 结果 |
