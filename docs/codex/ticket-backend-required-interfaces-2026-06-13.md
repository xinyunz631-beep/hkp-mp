# 票务小程序后端必补接口单 2026-06-13

## 背景

- 前端已复核后端 `backend-server@3290517` 票务接口更新。
- 本文只记录小程序票务闭环依赖的后端必补项，供后端优先修复。
- 小程序不会用本地库存、模拟支付成功或本地造票码补接口缺口。

## P0 必须补齐/稳定

| 编号 | 接口 | 当前问题/风险 | 后端必须交付 |
| --- | --- | --- | --- |
| TICKET-MP-P0-01 | `GET /api/bff/tickets/products` | 小程序需要同时展示待上线票和可购买票；缺 `publishStatus/categorySection/skuRules` 会导致所有票都像“不可点”。 | 稳定返回 `productCode/title/subtitle/productType/categorySection/minPrice/maxPrice/publishStatus/channels/skuRules`；支持 `productType=fastPass` 与 `categorySection=fastPass`；仅返回 `channels` 含 `miniProgram` 且状态为 `draft/pendingReview/published` 的商品。 |
| TICKET-MP-P0-02 | `GET /api/bff/tickets/products/{productCode}/calendar` | 草稿/待审核商品也在列表展示，但不能购买；日历不能报错或给脏库存。 | `draft/pendingReview` 返回 `200` 空分页：`total=0,list=[]`；`published` 只返回可售日历行；行字段含 `skuId/date/price/availableStock/saleStatus/restrictionReason`。 |
| TICKET-MP-P0-03 | `POST /api/bff/tickets/quote` 与 `POST /api/bff/orders/confirm` | 确认单必须显示真实价格和阻断原因；通用失败文案会让用户无法判断。 | 不可售、非发布、无库存、SKU 不匹配等返回稳定业务码和用户可读 message，例如 `BFF_TICKET_PRODUCT_NOT_ON_SALE`。 |
| TICKET-MP-P0-04 | `POST /api/bff/orders`，`sceneType=TICKET` | 新票务链路要求创建订单即出票；前端不再强制拉微信支付。 | 创建成功返回 `order.orderStatus=WAIT_USE` 或明确待使用状态，并返回 `order.ticketVouchers[]`；智游宝失败时释放库存/优惠锁并关闭订单。 |
| TICKET-MP-P0-05 | `GET /api/bff/orders/{orderNo}` | 订单详情只展示后端真实凭证；无凭证就无法闭环。 | 票务订单详情返回 `ticketVouchers[]`，字段至少含 `source/ticketCode/voucherCode/codeImage/qrImage/qrCodeUrl/ticketStatus/usedNum/totalNum`；二维码字段至少一个可展示。 |
| TICKET-MP-P0-06 | `POST /api/bff/orders/{orderNo}/pay` | 滚动发布期间兼容旧链路；空支付参数会阻断。 | 已免支付出票的门票订单返回 `prepay.paymentSkipped=true`、`prepay.reason=TICKET_PAYMENT_BYPASSED`，并带最新 `order.orderStatus/ticketVouchers`。 |
| TICKET-MP-P0-07 | `GET /api/bff/orders/{orderNo}` 与后台/闸机/三方核销事件 | 用户展示券码被扫码核销时，小程序页面不会触发 `onShow`，只靠回到页面刷新不够；异步出票前也可能尚无 `ticketVouchers[]`。 | 核销成功后后端必须把票码状态更新为 `used/partiallyUsed`，并把订单汇总推进到 `USED/COMPLETED/FULFILLED` 或返回明确履约状态；小程序订单详情会在 `TICKET` 未终态订单上每 15 秒静默轮询订单详情，不以已有入园凭证为启动条件，必须能读到出票后券码和核销后的最新状态。 |

## 后端需要提供的 UAT 数据

1. 至少一个 `published + miniProgram + 普通门票` 商品，今天或未来 7 天有 `onSale` 库存。
2. 至少一个 `published + miniProgram + fastPass` 商品，今天或未来 7 天有 `onSale` 库存。
3. 至少一个 `draft/pendingReview + miniProgram` 商品，用于验证待上线展示和加减号禁用。
4. 一个可创建订单并返回 `ticketVouchers` 的智游宝测试商品。

## 前端验收口径

1. 待上线票：展示但加减号不可点，文案为“待上线”或“暂无可售日期”。
2. 可售票：展示余票，加减号可点，可进入确认单。
3. 确认单：金额和库存以后端 `quote/confirm` 为准。
4. 提交订单：创建成功即跳订单详情，不拉起微信支付。
5. 订单详情：只展示后端 `ticketVouchers` 或历史 `ticketInstances`，不生成本地票码。
6. 核销刷新：用户停留在订单详情展示券码期间，页面通过定时轮询读取后端状态；即使异步出票前暂无券码，只要票务订单未终态也继续轮询；核销成功后订单状态、票码状态和使用次数必须自动更新，不依赖离开页面后的 `onShow`。
