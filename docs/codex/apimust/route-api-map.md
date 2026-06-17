# 小程序路由接口映射

更新时间：2026-06-17

最新核验：后端 `origin/uat@320a014` 只补管理端会员补录和 CRM 会员券实例操作，没有补小程序 BFF 券资产同源；下表后端缺口继续有效。

本文件用于后端按页面理解小程序 BFF 依赖。新增或切换页面接口时必须同步更新。

## 会员优惠券链路

| 页面路由 | 用户能力 | 当前接口 | 写接口签名 | 当前状态 | 后端缺口 |
| --- | --- | --- | --- | --- | --- |
| `pkg-member/pages/coupon-center/index` | 领券中心列表 | `GET /api/bff/member/coupon-packages`、`GET /api/bff/crm/entries/coupons` | 否 | 免费券包已读 promotion BFF；K 币入口继续读真实 CRM 入口 | 券包、领取结果、我的券和下单可用券必须统一 `couponNo/templateNo`；`320a014` 未补 |
| `pkg-member/pages/coupon-center/index` | 领取免费券 | `POST /api/bff/promotion/coupons/claim` | 是 | 已按当前真实 `templateNo` DTO 接入，成功后刷新列表 | 领取生成券必须进入 `member/coupons` 和 `available` |
| `pkg-member/pages/coupons/index` | 我的优惠券 | `GET /api/bff/member/coupons` | 否 | 已替换本地运行时 mock，只读真实会员券资产 | 需要分页、状态、同源 `couponNo`、使用范围、退款返还字段 |
| `pkg-member/pages/exchange/index` | K 币兑换列表 | `GET /api/bff/crm/entries/exchanges` | 否 | 已读真实 CRM 入口 | 兑换项需稳定标识发放券或券包 |
| `pkg-member/pages/exchange-detail/index` | 兑换详情 | `GET /api/bff/crm/entries/items/{itemNo}`、`GET /api/bff/member/kcoin/balance` | 否 | 详情和余额已接真实 BFF | 详情需返回库存、兑换限制、发券结果预期 |
| `pkg-member/pages/exchange-detail/index` | 提交 K 币兑换 | `POST /api/bff/member/kcoin/exchanges` | 是 | 已接入真实提交，成功提示克制，不承诺下单可用 | 当前兑换写 CRM 实例，但我的券/下单可用券读 promotion，存在同源断链；`320a014` 未补 |

## 交易用券链路

| 页面路由 | 用户能力 | 当前接口 | 写接口签名 | 当前状态 | 后端缺口 |
| --- | --- | --- | --- | --- | --- |
| `pkg-ticket/pages/checkout/index` | 门票确认单可用券 | `GET /api/bff/promotion/coupons/available`、`POST /api/bff/orders/confirm` | 确认单是 | 已接入可用券；选择后携带 `selectedCouponNos` 重新确认；查询已带 `itemIds/skuIds/visitDate` 供后端后续精筛 | `available` 必须读取同一 `couponNo` 资产，订单金额以后端 confirm 为准 |
| `pkg-ticket/pages/checkout/index` | 门票下单用券 | `POST /api/bff/orders`、`POST /api/bff/promotion/lock|confirm|release` | 是 | 订单创建已真实；优惠状态机待后端与订单联动验收 | 锁券、确认、释放需要和统一订单状态一致 |
| `pkg-hotel/pages/checkout/index` | 酒店确认单可用券 | `GET /api/bff/promotion/coupons/available`、`POST /api/bff/orders/confirm` | 确认单是 | 已接入可用券；选择或清空后携带 `selectedCouponNos` 重新确认；查询已带 `itemIds/skuIds/checkInDate/checkOutDate` 供后端后续精筛 | `available` 需支持酒店日期、房型、价规和金额参数 |
| `pkg-hotel/pages/checkout/index` | 酒店下单用券 | `POST /api/bff/orders`、`POST /api/bff/orders/{orderNo}/pay` | 是 | 创建和支付已真实 | 后端订单确认需返回最终优惠和应付金额 |
| `pkg-order/pages/detail/index` | 退款返还 | `POST /api/bff/orders/{orderNo}/refunds`、`POST /api/bff/promotion/coupons/refund-return` | 是 | 订单退款已接真实 BFF | 退款后券状态要回写我的券、可用券和管理端追溯 |

## 暂不宣称闭环的链路

| 页面路由 | 原因 | 当前处理 |
| --- | --- | --- |
| `pkg-order/pages/checkout/index` | 商城确认单仍需先切统一订单 `confirm/create/pay` | 不宣称商城券闭环，不接本地券假优惠 |
| `pkg-dining/pages/checkout/index` | 餐饮订单 BFF 未完成 | 只记录缺口，不做假闭环 |

## 统一要求

- 小程序只走 `/api/bff/**`。
- 写接口统一 `sign: true`。
- 前端不传 `memberNo/openId/userId/phone/externalUserId`。
- 页面不可展示接口、mock、测试态和技术状态文案。
- 真实接口失败进入异常态、空态或业务阻断，不回退运行时本地 mock。
