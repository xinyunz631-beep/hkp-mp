# 小程序支付接口调整建议（2026-06-24）

## 背景

本轮前端已收口三业态结算页支付失败后的前端行为：

- 支付失败停留在当前结算页，不跳订单详情。
- 支付成功后才清理门票、酒店、商城各自草稿或购物车来源项。
- 支付失败后再次点击优先复用当前草稿记录的待支付订单号，不重新创建订单。
- 调用 `Taro.requestPayment` 前只保留微信官方字段：`timeStamp`、`nonceStr`、`package`、`signType`、`paySign`。

以下事项需要后端接口继续加强，前端不能通过本地逻辑保证。

## 建议一：`/api/bff/orders/{orderNo}/pay` 增加订单级幂等

当前前端可保证同一确认单尽量复用同一 `orderNo`，但无法保证后端同一订单多次调用 `/pay` 时是否生成多条有效支付流水。

建议：

- 同一 `orderNo + paymentChannel + appId` 在订单仍为 `PENDING_PAYMENT/PAYING` 且上一笔支付流水未过期时，优先返回已有 `payNo/paymentParams`。
- 如必须重新生成预支付，应显式关闭或标记上一笔支付流水，避免同一订单出现多笔可支付流水。
- 响应里返回当前实际使用的 `payNo`、`payExpireAt`、`paymentStatus`。

## 建议二：BFF 支付参数响应区分官方字段和诊断字段

微信小程序官方 `wx.requestPayment` 参数不包含 `appId`。前端已做白名单净化，但最好由 BFF 明确字段边界。

建议响应结构：

```json
{
  "order": {},
  "prepay": {
    "payNo": "PAY...",
    "payExpireAt": "2026-06-24T13:00:00+08:00",
    "paymentParams": {
      "timeStamp": "...",
      "nonceStr": "...",
      "package": "prepay_id=...",
      "signType": "RSA",
      "paySign": "..."
    },
    "appId": "wx..."
  }
}
```

`paymentParams` 只放官方可透传字段，`appId` 保留在 `prepay.appId` 或诊断字段里。

## 建议三：支付不可发起时返回可操作状态

`ORDER_PAYMENT_NOT_ALLOWED` 对前端而言还不够细。前端需要知道该刷新详情、提示重新下单，还是展示已支付结果。

建议错误响应至少包含：

```json
{
  "code": "ORDER_PAYMENT_NOT_ALLOWED",
  "message": "当前订单不可支付",
  "data": {
    "orderNo": "TKT...",
    "orderStatus": "CLOSED",
    "paymentStatus": "CLOSED",
    "payNo": "PAY...",
    "payExpireAt": "2026-06-24T13:00:00+08:00",
    "action": "RESELECT"
  }
}
```

`action` 建议枚举：

- `REFRESH_DETAIL`：订单状态已变化，前端刷新订单详情。
- `ALREADY_PAID`：订单已支付，前端跳订单详情。
- `RESELECT`：订单已关闭或支付超时，前端提示重新选择商品/门票/房型。

## 建议四：创建订单和支付接口返回统一过期信息

前端现在只在后端返回 `payExpireAt` 时展示或判断过期，不会本地假设 30 分钟。

建议：

- `POST /api/bff/orders` 返回订单级 `payExpireAt` 或明确为空。
- `POST /api/bff/orders/{orderNo}/pay` 返回本次支付流水 `payExpireAt`。
- `GET /api/bff/orders/{orderNo}` 始终返回订单当前 `payNo/paymentStatus/payExpireAt`。

## 建议五：支付成功后的订单推进状态保持可轮询

支付成功后，前端仍应以 `GET /api/bff/orders/{orderNo}` 和 `GET /api/bff/orders/{orderNo}/status-snapshot` 作为事实源，不能直接用支付回调结果渲染出票、发货或入住状态。

建议：

- 支付成功 MQ、出票、库存确认、优惠核销失败时，订单详情返回明确处理中或失败状态。
- `status-snapshot` 返回版本号和关键状态变更，便于前端轻量轮询。
- 票务支付成功但出票未完成时，明确返回 `PAYING/PAID/FULFILLING` 之间的业务状态，不让前端猜。

## 前端已完成的配套收口

- 三业态结算页支付失败后不清草稿、不清购物车、不跳详情。
- 三业态草稿只保存各自 `pendingOrder`，互不影响。
- 草稿待支付订单带统一订单请求指纹，确认单内容变化时不会复用旧订单。
- 微信支付入参已白名单净化并做必填校验。
- 真机支付失败日志保留官方错误对象和安全参数摘要，不打印 `paySign` 明文。
