# 小程序接口联调进度

## 目标

本文件是小程序对接后端接口的执行表。根目录负责跨项目同步，本文件只记录小程序侧的鉴权模式、字段归一、页面映射、验证进度、剩余风险和 HANDOFF，不复制 Feishu DTO 全量字段。

## 当前批次

| 批次 | 辅助 commit | 来源 | 小程序结论 |
| --- | --- | --- | --- |
| `BE-2026-05-19-feishu-bff-base` | `ff17e45` | Feishu 主文档：`backend-server/docs/hellokitty-park-feishu-api-doc.md`；OpenAPI：`backend-server/docs/swagger/hellokitty-park-bff-service-openapi.json` | Feishu 主文档 13 个 BFF 对外入口已在小程序 service/request 层落地；小程序不直连 promotion/pay/admin-config/xxl-job 内部服务接口 |
| `BE-2026-05-28-purchase-cms` | `ff17e45` | 后续变更：`backend-server/release-records/uploads/2026-05-27-purchase-module/purchase-module-api.md` | 购票列表和 CMS 资源位为公开展示 GET，已接入票务页面数据服务；失败兜底旧本地数据 |
| `BE-2026-05-28-crm-uat` | `b40c8ed` | uat 后续变更：`backend-server/release-records/uploads/2026-05-28-crm-module/crm-module-api.md`、`backend-server/release-records/uploads/2026-05-29-mini-program-p0-p1/mini-program-p0-p1-api-plan.md` | CRM 会员中心、资料、地址、会员码、老会员绑定和 P1 配置已落小程序 service 层；会员首页、资料、会员码、地址、领券中心、兑换专区已做低风险兜底接入 |
| `BE-2026-05-30-order-checkout-uat` | `b40c8ed` | uat 后续变更：`backend-server/release-records/uploads/2026-05-30-order-checkout/order-checkout-api.md` | 订单提交、订单详情、订单列表已新增 BFF service 入口；页面交易链路仍待后续按票务/商城切片替换本地订单 |
| `BE-2026-06-03-wechat-login-fix-uat` | `b40c8ed` | uat 后续变更：`backend-server/release-records/uploads/2026-06-03-wechat-login-fix/README.md` | 后端修复微信 `jscode2session` text/plain 响应导致的登录 500；小程序沿用现有授权路径，待微信开发工具用真实 code 复测 |

## BFF 主接口落地表

| 能力 | 接口 | 鉴权模式 | 小程序落点 | 适配状态 |
| --- | --- | --- | --- | --- |
| 小程序登录 | `POST /api/bff/auth/mini-program/login` | 免认证、免签名 | `src/core/request/index.ts` | 已切到 Feishu 路径，存储 `accessToken/refreshToken/signSecret` |
| 刷新令牌 | `POST /api/bff/auth/refresh` | 免认证、免签名 | `src/core/services/bff-api.ts` | service 已接入，待真实过期场景接入自动刷新策略 |
| 登出 | `POST /api/bff/auth/logout` | 登录态 + HMAC 签名 | `src/core/services/auth.ts`、`src/core/services/bff-api.ts` | 已在退出登录时优先调用后端，失败不阻塞本地退出 |
| 模块状态 | `GET /api/bff/modules` | 登录态 | `src/core/services/bff-api.ts` | service 已接入，暂无页面直接依赖 |
| 后台默认配置 | `GET /api/bff/admin-config/defaults` | 登录态 | `src/core/services/bff-api.ts` | service 已接入，暂无页面直接依赖 |
| 创建预支付单 | `POST /api/bff/pay/prepay` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待真实订单/微信支付链路替换 mock |
| 查询支付状态 | `GET /api/bff/pay/payments/{payNo}` | 登录态 | `src/core/services/bff-api.ts` | service 已接入，待订单详情/支付回查链路使用 |
| 促销试算 | `POST /api/bff/promotion/quote` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待票务/商城/餐饮结算链路使用 |
| 锁定优惠 | `POST /api/bff/promotion/lock` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待下单链路使用；Feishu BFF 转换稿漏写 body，按 uat 源码和内部 promotion 文档保留请求体 |
| 核销优惠 | `POST /api/bff/promotion/confirm` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待支付成功链路使用；Feishu BFF 转换稿漏写 body，按 uat 源码和内部 promotion 文档保留请求体 |
| 释放优惠 | `POST /api/bff/promotion/release` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待订单取消/超时链路使用；Feishu BFF 转换稿漏写 body，按 uat 源码和内部 promotion 文档保留请求体 |
| 可用优惠券 | `GET /api/bff/promotion/coupons/available` | 登录态 | `src/core/services/bff-api.ts` | service 已接入，待结算页真实券列表替换 mock |
| 节假日同步 | `POST /api/bff/xxl-job/holiday/sync` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，仅作受控调试入口，不建议普通页面暴露 |

## 购票/CMS 后续变更落地表

| 页面/能力 | 接口 | 鉴权模式 | 字段归一 | 适配状态 | 验证状态 |
| --- | --- | --- | --- | --- | --- |
| 门票预定列表 | `GET /api/bff/purchase/menus?sceneType=TICKET` | 公开展示 GET，不强制 `Authorization` | `menuNo -> id`，`menuName -> title`，`subtitle -> description`，`priceCent / 100 -> price`，`badgeText -> tags` | 已接入 `src/pkg-ticket/services/ticket-booking.ts`，失败兜底本地数据 | `curl` 返回 200；`yarn typecheck` 已通过；待微信开发工具验证 |
| 门票详情 | `GET /api/bff/purchase/menus/{menuNo}` | 公开展示 GET，不强制 `Authorization` | 详情字段暂按列表项复用，缺失字段由页面已有规则兜底 | `src/pkg-ticket/services/purchase-api.ts` 已接 service；待详情/下单链路接入 | 待验证 |
| 购票页资源位 | `GET /api/bff/cms/resources?sceneType=TICKET&pageCode=PURCHASE_HOME` | 公开展示 GET，不强制 `Authorization` | `mobileImageUrl/imageUrl -> heroImages`，缺图沿用本地兜底 | 已接入 `src/pkg-ticket/services/ticket-booking.ts` | `curl` 返回 200；待微信开发工具验证 |
| CMS 单资源位 | `GET /api/bff/cms/resources/{slotCode}` | 公开展示 GET，不强制 `Authorization` | `slotCode` 作为资源位稳定 key | `src/pkg-ticket/services/purchase-api.ts` 已接 service；暂无页面直接依赖 | 待验证 |

## CRM/P1 UAT 变更落地表

| 页面/能力 | 接口 | 鉴权模式 | 字段归一 | 适配状态 | 验证状态 |
| --- | --- | --- | --- | --- | --- |
| 会员中心首页 | `GET /api/bff/crm/center` | 登录态 | `profile.growthValue/couponCount/nextLevel*` 更新首页数值，`benefits` 映射权益区 | 已接入 `src/core/services/bff-crm-api.ts`、`src/pkg-member/services/index.ts`，失败兜底本地数据 | `yarn typecheck` 通过；待微信开发工具真实登录态验证 |
| 会员资料查询/保存 | `GET/POST /api/bff/crm/profile` | 查询登录态；保存登录态 + HMAC 签名 | `memberNo -> id`，`nickName -> nickname`，`phone -> mobile`，`idCardNo`、`gender UNKNOWN/MALE/FEMALE -> 0/1/2` | 已接入 `src/pkg-member/services/profile.ts`，保存失败兜底本地数据 | `yarn typecheck` 通过；待真实签名写接口验证 |
| 我的地址 | `GET/POST /api/bff/crm/addresses`、`POST /delete`、`POST /default` | 查询登录态；写接口登录态 + HMAC 签名 | `addressNo -> id`，`contactName -> name`，省市区名称拼 `region`，`detailAddress -> detail` | 已接入 `src/pkg-order/services/address.ts`；列表优先读后端，保存/删除/默认先本地更新再异步同步后端 | `yarn typecheck` 通过；待真实签名写接口验证 |
| 会员码 | `GET /api/bff/crm/member-code` | 登录态 | 优先 `qrContent`，缺失时使用 `memberNo` | 已接入 `src/pkg-member/services/member-code.ts`，失败兜底本地动态码 | `yarn typecheck` 通过；待真实登录态验证 |
| 老会员绑定 | `POST /api/bff/crm/legacy-bind` | 登录态 + HMAC 签名 | `phone` 入参，结果 `bound` 映射老会员绑定状态 | 已接入 `src/pkg-member/services/profile.ts` | `yarn typecheck` 通过；待真实签名写接口验证 |
| 领券中心 P1 | `GET /api/bff/crm/p1/coupons` | 登录态 | `itemNo/itemName/badgeText/tagText/pointsCost/extraPayload.buttonText` 映射券卡 | 已接入 `src/pkg-member/services/coupon-center.ts`，失败兜底本地数据 | `yarn typecheck` 通过；待微信开发工具验证 |
| 兑换专区 P1 | `GET /api/bff/crm/p1/exchanges`、`GET /api/bff/crm/p1/items/{itemNo}` | 登录态 | `itemNo/itemName/imageUrl/pointsCost/stockAvailable/description` 映射兑换商品 | 已接入 `src/pkg-member/services/exchange.ts`，失败兜底本地数据 | `yarn typecheck` 通过；待微信开发工具验证 |

## 订单 UAT 变更落地表

| 页面/能力 | 接口 | 鉴权模式 | 字段归一 | 适配状态 | 验证状态 |
| --- | --- | --- | --- | --- | --- |
| 提交订单 | `POST /api/bff/orders/submit` | 登录态 + HMAC 签名 | `sceneType/items/contact/paymentChannel/createPayment` 按后端 `OrderSubmitRequest` 建 service 类型 | 已新增 `src/core/services/bff-order-api.ts`；暂未替换票务/商城页面提交链路 | `yarn typecheck` 通过；待按页面工作包接入真实交易链路 |
| 订单详情 | `GET /api/bff/orders/{orderNo}` | 登录态 | `orderNo/orderStatus/amount/items/context` 按后端 `OrderView` 建 service 类型 | 已新增 service 入口，页面详情仍用现有本地/静态数据 | `yarn typecheck` 通过；待页面切片接入 |
| 订单列表 | `GET /api/bff/orders?sceneType=TICKET` | 登录态 | `sceneType` 支持 `TICKET/MALL/DINING` | 已新增 service 入口，订单中心页面仍待分场景替换 | `yarn typecheck` 通过；待页面切片接入 |

## 鉴权跟进

- `src/core/request/index.ts` 已支持 `sign: true`，对 `POST/PUT/PATCH/DELETE` 自动追加 `X-Timestamp`、`X-Nonce`、`X-Body-Sha256`、`X-Signature`。
- `src/core/utils/crypto.ts` 纯小程序运行时实现 SHA-256、HMAC-SHA256 Base64URL no padding 和 nonce，不引入 Node crypto。
- `src/core/store/member-store.ts` 已持久化 `refreshToken` 和 `signSecret`；清空会话时一并清掉签名密钥。
- 普通受保护接口默认携带 `Authorization: Bearer <token>`；登录、刷新和公开展示 GET 显式免授权。
- Feishu 文档里的 promotion/pay/admin-config/xxl-job 内部服务接口只作为后端/管理后台联调参考，小程序只走 `/api/bff/**`。
- 当前发现 Feishu BFF 转换稿中 `promotion lock/confirm/release` 的请求体遗漏；已按 BFF uat 源码 `@RequestBody Map` 和内部 promotion 接口示例落 service，请后端后续同步修正文档。

## HANDOFF 给 hk-api

| 批次 | 事项 | 已改文件 | 待合并/待确认 | 验证状态 | 演进候选 |
| --- | --- | --- | --- | --- | --- |
| `BE-2026-05-19-feishu-bff-base` | Feishu 主文档 13 个 BFF 对外入口已落小程序 service/request 层，高风险写接口签名已接入 | `src/core/request/index.ts`、`src/core/store/member-store.ts`、`src/core/utils/crypto.ts`、`src/core/services/bff-api.ts`、`src/core/services/auth.ts`、`src/core/config/env.ts` | 根总表同步“小程序已完成 service 层接入，交易链路待页面级接入”；管理后台继续按自身联调文档处理后台配置接口 | `yarn typecheck` 已通过；真实登录/签名写接口需微信开发工具和真实 token 验证 | 后续如果出现第二个端需要签名，抽一个端内签名验收小脚本或示例用例 |
| `BE-2026-05-28-purchase-cms` | 小程序购票列表和购票页 CMS 资源位已按 uat 后续变更记录端内接入公开 BFF GET | `src/pkg-ticket/services/purchase-api.ts`、`src/pkg-ticket/services/ticket-booking.ts` | 剩余微信开发工具网络面板确认公开 GET 不带 `Authorization` 也能返回 | `yarn typecheck`、购票列表 `curl`、CMS 资源位 `curl` 已通过；待微信开发工具确认 | 公开展示 GET 由 service 显式 `auth: 'none'`，后续同类展示接口优先采用此口径 |
| `BE-2026-05-28-crm-uat` | CRM/P1 小程序接口已落 service 层，会员首页/资料/地址/会员码/领券/兑换已做兜底接入 | `src/core/services/bff-crm-api.ts`、`src/pkg-member/services/index.ts`、`src/pkg-member/services/profile.ts`、`src/pkg-member/services/member-code.ts`、`src/pkg-member/services/coupon-center.ts`、`src/pkg-member/services/exchange.ts`、`src/pkg-order/services/address.ts` | 根总表同步“小程序 CRM service 已接入，写接口待真实签名验证”；后台 CRM 配置由管理后台文档跟进 | `yarn typecheck` 已通过；待微信开发工具真实登录态验证 | CRM/P1 字段映射已出现复用模式，后续第二批页面接入时可评估沉淀端内 adapter |
| `BE-2026-05-30-order-checkout-uat` | 订单提交/详情/列表 BFF service 已落地，页面交易链路暂不强切 | `src/core/services/bff-order-api.ts` | 后续按票务下单、商城下单、订单中心拆页面工作包接入 | `yarn typecheck` 已通过；待真实订单链路验证 | 订单 service 先保持通用类型，不在本批次扩写页面状态映射 |

## 文档瘦身规则

- 本文件只保留小程序侧字段映射和联调进度，不复制完整后端接口示例。
- 字段映射只记录 service/adapter 需要的关键字段族，完整 DTO 以 Feishu 主文档、OpenAPI 或 `backend-server/` 后续变更记录为准；commit 只作为批次和差异辅助。
- 页面设计文档只引用本文件的“页面/能力”和接口名，不重复维护字段表。
- `docs/codex/current-mini-program.md` 只保留当前有效接口摘要，不复制本文件进度表。
- 本文件按检查点更新，不记录探索过程；当前 active 批次和最近 1 个 completed 批次优先保留，稳定接口可压缩为摘要。

## 验证清单

- `yarn typecheck`
- `yarn check:package-boundary`
- 按触达页面决定是否运行 `yarn check:page-convention`
- 微信开发工具网络面板确认登录、签名写接口、公开 GET 的 header 和响应
- 微信开发工具确认页面失败兜底不出现内部文案
