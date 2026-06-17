# 优惠券全链路验收操作手册

更新时间：2026-06-17 20:35 CST

## 1. 本手册边界

本手册只串联“后台配置/发券 -> 后端同源资产 -> 小程序可见可用 -> 订单用券 -> 退款返还”的验收动作，不复制管理后台接口字段。

管理后台接口事实源：

- `admin-frontend/docs/codex/admin-api-requirements/coupon-service.md`
- `admin-frontend/docs/codex/admin-api-requirements/coupon-service-backend-gap-handoff-2026-06-17.md`
- `admin-frontend/docs/codex/coupon-service-execution-matrix.md`

小程序 BFF 事实源：

- `mini-program/docs/codex/apimust/coupon-bff-required-interfaces-2026-06-17.md`
- `mini-program/docs/codex/apimust/route-api-map.md`

## 2. 当前真实状态

| 项 | 当前结论 |
| --- | --- |
| 管理后台券模板、批次、券包、券包实例、券码、免费领券、定向发券、会员券实例运营动作 | 已有真实运营入口；券实例延期、冻结、解冻、人工退款返还已在管理后台阶段分支接入 |
| 小程序领券中心、我的券、K 币兑换、门票/酒店可用券 | 已接真实 BFF，不失败回运行时本地 mock |
| 后端同源资产 | 未完成；`origin/uat@320a014` 仍是 `crm_member_coupon_instance` 与 `promotion_member_coupon` 两套读写源 |
| 当前能否完成“后台发券后小程序看到并使用” | 不能验收；必须等后端补同源资产 |

## 3. 后端修复前可以做的后台准备

以下动作只代表后台配置或运营动作可用，不代表 C 端闭环：

1. 在管理后台券模板库创建或选择一张门票/酒店适用券模板。
2. 建发券批次或券包，确认投放窗口、库存、预算和可用业态。
3. 用会员券实例或会员详情即时发券入口给目标会员发券。
4. 在管理后台会员券实例页确认能查到目标 `couponNo`，并记录：
   - `couponNo`
   - `couponTemplateId/templateNo`
   - `memberNo` 或后端可定位会员的脱敏信息
   - `couponStatus`
   - `source/sourceName`
5. 如需验证 K 币兑换，先在会员中心资产或兑换配置中准备兑换项，记录 `itemNo`。

如果第 4 步只能在 `crm_member_coupon_instance` 看到券，而小程序探针看不到同一 `couponNo`，这正是当前后端 P0 缺口。

## 4. 后端必须先补齐的同源条件

后端完成后，至少要满足：

| 条件 | 验收证据 |
| --- | --- |
| 后台发券、定向发券、券包赠送、K 币兑换写入同一会员券资产 | 同一 `couponNo` 能被管理后台和小程序同时查到 |
| `GET /api/bff/member/coupons` 读取同源资产 | 返回目标 `couponNo` |
| `GET /api/bff/promotion/coupons/available` 读取同源资产 | 在适用场景和金额下返回同一 `couponNo` |
| 订单确认使用同一券号 | 小程序统一订单 `selectedCouponNos=[couponNo]`，`orders/confirm` 返回优惠金额 |
| 锁券、核销、释放、退款返还更新同一资产 | 管理后台会员券实例、小程序我的券、下单可用券状态一致 |

## 5. 小程序只读探针

默认只读探针：

```bash
cd mini-program
yarn probe:coupon-closure
```

默认结果只能证明接口可达，不能证明后台发券或 K 币兑换闭环。

2026-06-17 20:20 已跑过一次只读探针，结果：

| 接口 | HTTP | 结果 |
| --- | --- | --- |
| `GET /api/bff/member/coupons` | 200 | 当前会员券数 0 |
| `GET /api/bff/promotion/coupons/available?sceneType=TICKET&orderAmountCent=6800` | 200 | 可用券数 0 |
| `GET /api/bff/member/coupon-packages` | 200 | 券包数 0 |
| `GET /api/bff/member/kcoin/balance` | 200 | 可用 K 币 0 |

traceId：`coupon-closure-mqi1iwfi-03..06`

## 6. 后端同源修复后的严格验收

拿后台发券或 K 币兑换返回的目标券号执行：

```bash
cd mini-program
COUPON_PROBE_EXPECT_COUPON_NO=目标couponNo \
COUPON_PROBE_SCENE_TYPE=TICKET \
COUPON_PROBE_ORDER_AMOUNT_CENT=6800 \
COUPON_PROBE_STRICT=1 \
yarn probe:coupon-closure
```

严格通过条件：

- `closure.closed=true`
- `targetPresence[].inMemberCoupons=true`
- `targetPresence[].inAvailableCoupons=true`
- 没有 `CRM/promotion 同源资产仍未闭环` 阻塞

如果探针失败，把输出里的 `traceId`、`targetPresence`、`blockers` 贴给后端。

## 7. K 币兑换专项验收

只有后端确认 K 币兑换会写入同源会员券资产后，才允许显式执行写入探针：

```bash
cd mini-program
COUPON_PROBE_KCOIN_EXCHANGE=1 \
COUPON_PROBE_KCOIN_ITEM_NO=兑换商品itemNo \
COUPON_PROBE_KCOIN_QUANTITY=1 \
COUPON_PROBE_SCENE_TYPE=TICKET \
COUPON_PROBE_ORDER_AMOUNT_CENT=6800 \
COUPON_PROBE_STRICT=1 \
yarn probe:coupon-closure
```

通过条件：

- `exchangeKcoin` 成功返回 `exchangeNo`。
- 返回的 `couponNos[]` 非空。
- 返回的每一个 `couponNo` 同时出现在 `member/coupons` 和 `available`。
- `beforeBalance/afterBalance` 与 K 币扣减一致。

## 8. 订单确认用券验收

小程序当前门票/酒店确认单已经会：

- 请求 `GET /api/bff/promotion/coupons/available`
- 选择券后把同一 `couponNo` 写入统一订单 `selectedCouponNos`
- 调 `POST /api/bff/orders/confirm`
- 以前端展示金额以后端 confirm 返回为准

后端同源修复后，验收步骤：

1. 先用严格探针确认目标 `couponNo` 同时在我的券和可用券。
2. 进入门票或酒店确认单。
3. 选择该券。
4. 确认网络请求 `POST /api/bff/orders/confirm` 的 `selectedCouponNos` 包含目标 `couponNo`。
5. 确认响应里的 `discountAmountCent/payableAmountCent` 与页面展示一致。

商城用券不能在本阶段宣称闭环，因为商城确认单仍需先切统一订单 `confirm/create/pay`。餐饮用券也不能宣称闭环，因为餐饮订单 BFF 未完成。

## 9. 退款返还验收

订单退款后必须验证：

1. 订单退款接口成功返回退款单号。
2. `POST /api/bff/promotion/coupons/refund-return` 使用同一 `couponNo`。
3. `GET /api/bff/member/coupons` 返回最新 `status/refundReturnStatus`。
4. `GET /api/bff/promotion/coupons/available` 按返还策略决定是否重新可用。
5. 管理后台会员券实例页能按同一 `couponNo/orderNo/refundNo` 追溯。

任一处不是同一 `couponNo`，都不算全链路闭环。
