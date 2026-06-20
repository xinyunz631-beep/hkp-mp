# 票务小程序后端必补接口单 2026-06-13

## 背景

- 前端已复核后端 `backend-server@3290517` 票务接口更新。
- 本文只记录小程序票务闭环依赖的后端必补项，供后端优先修复。
- 小程序不会用本地库存、模拟支付成功或本地造票码补接口缺口。
- 最新状态：2026-06-21 02:51/02:58 后端已复拉到 `origin/uat@38fb4d7`；按“不要只看 uat”扫描全部远端 head，当前只有 `main@22fe369`、`prod@ff17e45`、`uat@38fb4d7`，没有从 uat 最新提交后派生出来的票务模块分支。收窄关键词也未发现 `booking-page/calendar-batch` 票务聚合接口。默认探针 `ticket-closure-mqmpqmz2-03..06` 证明 `products/calendar/quote/confirm` 均 200；显式创建探针订单 `TKT202606210251011328A085` 后，`/pay` 返回 `PAYING/prepayPayNo=PAY20260621025101915635ed7b6d/hasPaymentParams=true/paymentParamsAppId=wx72b9e08ce45d3e79`，付款前详情无 `ticketVouchers[]`，探针单已取消。TICKET-MP-P0-06 从“后端需修预下单”改为“保持稳定并进入真实支付成功后出票验收”。

## P0 必须补齐/稳定

| 编号 | 接口 | 当前问题/风险 | 后端必须交付 |
| --- | --- | --- | --- |
| TICKET-MP-P0-01 | `GET /api/bff/tickets/products` | 小程序需要同时展示待上线票和可购买票；缺 `publishStatus/categorySection/skuRules` 会导致所有票都像“不可点”。 | 稳定返回 `productCode/title/subtitle/productType/categorySection/minPrice/maxPrice/publishStatus/channels/skuRules`；支持 `productType=fastPass` 与 `categorySection=fastPass`；仅返回 `channels` 含 `miniProgram` 且状态为 `draft/pendingReview/published` 的商品。 |
| TICKET-MP-P0-02 | `GET /api/bff/tickets/products/{productCode}/calendar` | 草稿/待审核商品也在列表展示，但不能购买；日历不能报错或给脏库存。 | `draft/pendingReview` 返回 `200` 空分页：`total=0,list=[]`；`published` 只返回可售日历行；行字段含 `skuId/date/price/availableStock/saleStatus/restrictionReason`。 |
| TICKET-MP-P0-03 | `POST /api/bff/tickets/quote` 与 `POST /api/bff/orders/confirm` | 确认单必须显示真实价格和阻断原因；通用失败文案会让用户无法判断。 | 不可售、非发布、无库存、SKU 不匹配等返回稳定业务码和用户可读 message，例如 `BFF_TICKET_PRODUCT_NOT_ON_SALE`。 |
| TICKET-MP-P0-04 | `POST /api/bff/orders`，`sceneType=TICKET` | `d92be1e` 已撤回创建即免支付出票；创建后必须先得到待支付订单。 | 创建成功返回稳定订单号、待支付态和应付金额；前端随后调用 `/pay` 拉起微信支付，支付成功后由后端确认优惠/库存并调用智游宝出票。 |
| TICKET-MP-P0-05 | `GET /api/bff/orders/{orderNo}` | 订单详情只展示后端真实凭证；无凭证就无法闭环。 | 票务订单详情返回 `ticketVouchers[]`，字段至少含 `source/ticketCode/voucherCode/codeImage/qrImage/qrCodeUrl/ticketStatus/usedNum/totalNum`；二维码字段至少一个可展示。 |
| TICKET-MP-P0-06 | `POST /api/bff/orders/{orderNo}/pay` | 门票恢复真实微信支付后，空支付参数会阻断小程序拉起支付；`94d87f6/b4fb3f7` 已补 AppID 字段透传，`b6c5258/94930b3` 已修复 AppID 大写导致的微信商户号不匹配；2026-06-21 02:51 在 `origin/uat@38fb4d7` 复跑探针，`/pay` traceId=`ticket-closure-20260621-create-06` 返回 `PAYING/prepayPayNo=PAY20260621025101915635ed7b6d/hasPaymentParams=true/paymentParamsAppId=wx72b9e08ce45d3e79`。 | `PENDING_PAYMENT/PAYING` 门票订单必须持续稳定返回 `prepay.payNo` 和 `prepay.paymentParams/payParams`，并保持小程序 AppID 原始大小写；非待支付状态重复调用返回 `ORDER_PAYMENT_NOT_ALLOWED`；支付成功后必须推动 order-service 出票并在订单详情返回 `ticketVouchers[]`。 |
| TICKET-MP-P0-07 | `GET /api/bff/orders/{orderNo}` 与后台/闸机/三方核销事件 | 用户展示券码被扫码核销时，小程序页面不会触发 `onShow`，只靠回到页面刷新不够；异步出票前也可能尚无 `ticketVouchers[]`。 | 核销成功后后端必须把票码状态更新为 `used/partiallyUsed`，并把订单汇总推进到 `USED/COMPLETED/FULFILLED` 或返回明确履约状态；小程序订单详情会在 `TICKET` 未终态订单上每 3 秒后台静默轮询订单详情，失败不弹窗、不展示 loading，状态未变化不触发页面重渲染；探针响应只用于比较状态变化，发现变化后再走正常订单详情刷新入口更新页面，不以已有入园凭证为启动条件，必须能读到出票后券码和核销后的最新状态。 |
| TICKET-MP-P0-08 | `POST /api/bff/orders` 与 `park_order_fulfillment` 履约表 | 2026-06-18 11:52 UAT 已证明智游宝发码成功后，本地履约表旧状态约束不允许 `WAIT_USE`，导致订单事务回滚且外部票已生成。 | UAT/生产 schema 必须允许 order-service 实际写入的票务履约状态，至少覆盖 `WAIT_USE/PART_USED/USED/FULFILLED/FAILED/CANCELED` 或统一服务状态映射；三方发码成功后本地落库失败必须有补偿记录/取消策略，不能只返回 `INTERNAL_ERROR`。 |

## 2026-06-19 验收更新

- 后端 `origin/uat@d92be1e` 已在 `cf7e4b5` 履约状态约束扩展、智游宝二维码 `img` 兼容、裸 base64 图片 data URI 归一、退款终态保护和内部主动查询同步基础上，撤回门票创建后 `BYPASS_` 免支付出票契约，恢复真实微信预支付；`img` 仍会映射到既有 `ticketVouchers[].codeImage/qrImage`，小程序不新增 `rawFields.img` 运行时依赖。
- 2026-06-19 13:25 再次复拉后端到 `HEAD=origin/uat=FETCH_HEAD=2e44302`。`TICKET_PROBE_CREATE=1 node scripts/probe-ticket-closure.mjs` 曾证明商品、日历、报价、确认单、创建待支付订单和 `/pay` 微信预支付参数均可用：订单 `TKT202606191325080E335D16` 创建为 `PENDING_PAYMENT`，traceId=`ticket-closure-mqkhitex-07`；随后的 `/pay` traceId=`ticket-closure-mqkhitex-08` 返回 `success=true`、`orderStatus=PAYING`、`prepayPayNo=PAY202606191325081664ffd075f9`、`hasPaymentParams=true`；付款前详情 traceId=`ticket-closure-mqkhitex-09` 仍无券码，探针订单已通过 `ticket-pay-cleanup-mqkhjaem` 取消。
- 2026-06-19 17:08 同一 UAT 运行态又回归：默认探针商品、日历、报价、确认单均 200；显式创建探针订单 `TKT2026061917083350C6EB34`、`TKT20260619170848E3023085` 成功后，`/pay` traceId=`ticket-cleanup-mqkpi-06`、`ticket-pay-regress-mqkpj-06` 均返回 `INTERNAL_ERROR /api/pay/prepay failed`，探针单已自动取消。当前 P0 阻塞重新回到 TICKET-MP-P0-06 预下单稳定性；恢复后再推进真实微信支付成功后出票、真实支付退款样本、后台票码实例和核销流水同步。
- 2026-06-19 17:35 后端 `origin/uat@94d87f6/b4fb3f7` 已补 AppID 字段透传并回填发布记录，但真实登录态探针仍失败：默认探针 `ticket-closure-mqkqhaj0-01..04` 证明商品、日历、报价、确认单 200；显式创建订单 `TKT202606191735589114167C` 后 `/pay` traceId=`ticket-appid-fix-06` 返回 `INTERNAL_ERROR /api/pay/prepay failed`，cleanup traceId=`ticket-appid-fix-08` 已取消探针单。当前不能再把失败归因于前端 AppID 写死或未传，后端需继续排查 pay-service/微信预下单运行态。
- 2026-06-19 18:09 前端插队复核 AppID 后再次创建真实登录态探针：登录换 token、旧预支付和统一订单支付均已优先使用微信运行态 AppID，上传无 AppID 契约字段不新增无契约参数；探针 `ticket-appid-runtime-01..08` 商品、日历、报价、确认单和订单创建均成功，订单 `TKT20260619180950513F4AC8` 的 `/pay` traceId=`ticket-appid-runtime-06` 仍返回 `INTERNAL_ERROR /api/pay/prepay failed`，cleanup traceId=`ticket-appid-runtime-08` 已取消。当前 P0 仍是后端 pay-service/微信预下单稳定性。
- 2026-06-19 18:21 后端 `origin/uat@3b5c884` 只修 admin-config 券模板目标对象和互斥组同步，不触达票务支付；探针 `ticket-after-3b5c884-01..08` 商品、日历、报价、确认单和订单创建均成功，订单 `TKT20260619182138ADD42AFD` 的 `/pay` traceId=`ticket-after-3b5c884-06` 仍返回 `INTERNAL_ERROR /api/pay/prepay failed`，cleanup traceId=`ticket-after-3b5c884-08` 已取消。当前 P0 仍是后端 pay-service/微信预下单稳定性。
- 2026-06-19 18:57 后端 `origin/uat@a0341e2` 只补 promotion 历史会员券同源资产回填，不触达票务支付；探针 `ticket-after-a0341e2-01..08` 商品、日历、报价、确认单和订单创建均成功，订单 `TKT2026061918575095AEB3DD` 的 `/pay` traceId=`ticket-after-a0341e2-06` 仍返回 `INTERNAL_ERROR /api/pay/prepay failed`，cleanup traceId=`ticket-after-a0341e2-08` 已取消。当前 P0 仍是后端 pay-service/微信预下单稳定性。
- 2026-06-19 20:25 后端 `origin/uat@839f4a5` 无新增票务源码；探针 `ticket-after-839f4a5-recheck-20260619202509-03..10` 显示 `GET /api/bff/tickets/products`、单商品 `/calendar`、`POST /api/bff/tickets/quote`、`orders/confirm` 与创建订单均 200，订单 `TKT202606192025104781708D` 的 `/pay` traceId=`ticket-after-839f4a5-recheck-20260619202509-08` 仍返回 `INTERNAL_ERROR /api/pay/prepay failed`，cleanup 已取消。当前 P0 顺序调整为恢复 pay-service/微信预下单稳定性。
- 2026-06-19 21:22 后端 `origin/uat@f56a059` 只改会员查询性能、折扣券同源字段和多业态券同源场景，不触达票务源码；探针 `ticket-after-f56a059-20260619212212-01..08` 显示 `GET /api/bff/tickets/products`、单商品 `/calendar`、`POST /api/bff/tickets/quote`、`orders/confirm` 与创建订单均 200，订单 `TKT20260619212212B6FB3624` 的 `/pay` traceId=`ticket-after-f56a059-20260619212212-06` 仍返回 `INTERNAL_ERROR /api/pay/prepay failed`，cleanup 已取消。当前 P0 顺序仍是恢复 pay-service/微信预下单稳定性。
- 2026-06-20 14:19 按“不要只看 uat”要求扫描全部远端分支：`origin/uat` 已到 `1c2ef2d`，`origin/mall-closure-isolation-20260620` 与 `origin/feature/mall-favorites-closure-20260620` 均为商城分支，未发现票务支付修复分支。探针 `ticket-after-1c2ef2d-20260620141908-01..08` 和诊断 `ticket-after-1c2ef2d-diag-20260620141938-03..29` 仍显示商品、日历、报价、确认单和创建订单均 200，订单 `TKT20260620141938C28B6E97` 的 `/pay` 失败。DB 只读 `pay_payment_operation_log` 显示 pay-service 请求微信时 `appId=WX72B9E08CE45D3E79`、`mchid=1483462312`，微信返回 `INVALID_REQUEST` / `商户号mch_id与appid不匹配`；小程序源码仍通过 `resolveCurrentMiniProgramAppId()` 传当前运行态 AppID，当前阻塞明确归后端 BFF/pay-service 支付主体处理。
- 2026-06-21 02:51/02:58 再次按“不要只看 uat”要求扫描全部远端分支：当前远端只有 `main/prod/uat` 三个 head，无 uat 后派生的票务接口分支；`origin/uat@38fb4d7` 只修认证会话验证备注。默认探针 `ticket-closure-mqmpqmz2-03..06` 商品、日历、报价、确认单均 200；显式创建探针 `ticket-closure-20260621-create-01..08` 显示订单 `TKT202606210251011328A085` 创建成功，`/pay` traceId=`ticket-closure-20260621-create-06` 返回 `PAYING/prepayPayNo=PAY20260621025101915635ed7b6d/hasPaymentParams=true/paymentParamsAppId=wx72b9e08ce45d3e79`，付款前详情无 `ticketVouchers[]`，cleanup traceId=`ticket-closure-20260621-create-08` 已取消探针单。当前 P0 顺序推进为真实微信支付成功后出票、真实支付退款、后台票码实例和核销流水同步；支付前链路不再是第一阻塞。
- `TICKET_PROBE_CREATE=1 TICKET_PROBE_STRICT=1 node scripts/probe-ticket-closure.mjs` 已对 `6ecc3be` 退出 0，traceId=`ticket-closure-mqj7yaw3-01..06`，订单 `TKT202606181609268A8727B2` 进入 `WAIT_USE`，创建响应和订单详情均有可用 `ticketVouchers[]`。
- 订单详情复查确认 `ticketVouchers[0]` 同时包含 `ticketCode/voucherCode`，`codeImage/qrImage` 均为可直接渲染的 `data:image/jpeg;base64,...` 且长度均为 13583，`ticketStatus=WAIT_USE`、`usedNum=0`、`totalNum=1`。该证据证明历史旧直出票凭证回读已满足；`d92be1e` 后创建、支付、出票三段真实链路仍需新样本复测。
- TICKET-MP-P0-07 已完成订单详情状态刷新层验证：同单标准化智游宝回调 traceId=`ticket-callback-mqj6ptam` 成功后，`GET /api/bff/orders/{orderNo}` traceId=`ticket-callback-mqj6ptc6` 已读到 `orderStatus=USED/ticketStatus=FULFILLED/usedNum=1/totalNum=1`；小程序 3 秒后台静默轮询只做变化探针，发现变化后走正常详情刷新入口，不能本地伪造已核销。
- 历史直出票退款已验证：订单 `TKT202606181609268A8727B2` 调用 `POST /api/bff/orders/{orderNo}/refunds` traceId=`ticket-refund-mqj81o00-01` 返回 `REFUNDED`，详情 traceId=`ticket-refund-mqj81o00-02` 回读 `orderStatus=REFUNDED/ticketStatus=REFUNDED`；DB 只读确认旧 `BYPASS_` 支付退款跳过 pay-service。`d92be1e` 后真实微信支付退款仍需新样本复测。
- 退款后迟到核销回调已验证：对订单 `TKT202606181609268A8727B2` 再打标准化智游宝核销完成回调，traceId=`ticket-refund-callback-mqj8zgrl-01` 返回 `operation=ZHIYOUBAO_ORDER_STATUS_CALLBACK_IGNORED/status=REFUNDED/ignored=true`；DB 只读确认 `order_status/fulfillment_status/refund_status` 均保持 `REFUNDED`，状态事件 `reason=REFUNDED_ORDER_TERMINAL`。
- `cf7e4b5` 只证明内部主动查询入口会复用回调逻辑落 order-service 履约；当前小程序 `GET /api/bff/orders/{orderNo}` 详情链路没有自动调用该内部 check-status，3 秒静默轮询能否及时刷新仍依赖智游宝异步回调到达，或后端另有定时任务/后台动作主动调用该内部同步入口。`d92be1e` 后前端已去掉 `prepay.paymentSkipped` 依赖，`2e44302` 后真实支付参数已可获取，支付成功后出票仍待微信开发工具复验。
- 剩余必须补齐项：后台登录 traceId=`ticket-admin-closure-mqj7npe7` 已成功，但 `GET /api/admin-config/ticket/instances?orderNo=...` traceId=`ticket-admin-closure-mqj7nplg`、`verifications?orderNo/keyword=...` traceId=`ticket-admin-closure-mqj7npmp/mqj7npnj` 均为 200 空结果；按真实票码查询实例 traceId=`ticket-admin-read-ticket-mqj7q6b4` 仍为空，详情 traceId=`ticket-admin-read-ticket-mqj7q6bp` 返回 `ADMIN_TICKET_INSTANCE_NOT_FOUND`，流水 traceId=`ticket-admin-read-ticket-mqj7q6cc` 为空。后端需把 order-service 出票、主动查询同步、核销回调和退款履约同步到 admin-config 票码实例与核销流水。

## 后端需要提供的 UAT 数据

1. 至少一个 `published + miniProgram + 普通门票` 商品，今天或未来 7 天有 `onSale` 库存。
2. 至少一个 `published + miniProgram + fastPass` 商品，今天或未来 7 天有 `onSale` 库存。
3. 至少一个 `draft/pendingReview + miniProgram` 商品，用于验证待上线展示和加减号禁用。
4. 一个可创建订单并返回 `ticketVouchers` 的智游宝测试商品。
5. 一笔可稳定返回 `/pay` 微信预支付参数并完成真实微信支付的 UAT 样本，用于验证支付参数、`WAIT_USE + ticketVouchers[]` 和核销状态轮询。

## 前端验收口径

1. 待上线票：展示但加减号不可点，文案为“待上线”或“暂无可售日期”。
2. 可售票：展示余票，加减号可点，可进入确认单。
3. 确认单：金额和库存以后端 `quote/confirm` 为准。
4. 提交订单：创建成功后必须调用 `/pay` 拉起微信支付；缺 `prepay.paymentParams/payParams` 时直接阻断，不跳订单详情假装出票成功。
5. 订单详情：只展示后端 `ticketVouchers` 或历史 `ticketInstances`，不生成本地票码。
6. 核销刷新：用户停留在订单详情展示券码期间，页面通过定时轮询读取后端状态；即使异步出票前暂无券码，只要票务订单未终态也继续轮询；核销成功后订单状态、票码状态和使用次数必须自动更新，不依赖离开页面后的 `onShow`。
