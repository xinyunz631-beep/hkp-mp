# 小程序接口联调进度

## 目标

本文件是小程序对接后端接口的执行表。根目录负责跨项目同步，本文件只记录小程序侧的鉴权模式、字段归一、页面映射、验证进度、剩余风险和 HANDOFF，不复制 Feishu DTO 全量字段。

## 当前批次

| 批次 | 辅助 commit | 来源 | 小程序结论 |
| --- | --- | --- | --- |
| `BE-2026-05-19-feishu-bff-base` | `ff17e45` | Feishu 主文档：`backend-server/docs/hellokitty-park-feishu-api-doc.md`；OpenAPI：`backend-server/docs/swagger/hellokitty-park-bff-service-openapi.json` | Feishu 主文档 13 个 BFF 对外入口已在小程序 service/request 层落地；小程序不直连 promotion/pay/admin-config/xxl-job 内部服务接口 |
| `BE-2026-05-28-purchase-cms` | `ff17e45` | 后续变更：`backend-server/release-records/uploads/2026-05-27-purchase-module/purchase-module-api.md` | 购票列表和 CMS 资源位已接入票务页面数据服务；最新鉴权由 `BE-2026-06-07-mini-program-ads` 覆盖为登录态 GET；失败兜底旧本地数据 |
| `BE-2026-05-28-crm-uat` | `b40c8ed` | uat 后续变更：`backend-server/release-records/uploads/2026-05-28-crm-module/crm-module-api.md`、`backend-server/release-records/uploads/2026-05-29-mini-program-p0-p1/mini-program-p0-p1-api-plan.md` | CRM 会员中心、资料、地址、会员码、老会员绑定和 P1 配置已落小程序 service 层；会员首页、资料、会员码、地址、领券中心、兑换专区已做低风险兜底接入 |
| `BE-2026-05-30-order-checkout-uat` | `b40c8ed` | uat 后续变更：`backend-server/release-records/uploads/2026-05-30-order-checkout/order-checkout-api.md` | 订单提交、订单详情、订单列表已新增 BFF service 入口；页面交易链路仍待后续按票务/商城切片替换本地订单 |
| `BE-2026-06-03-wechat-login-fix-uat` | `b40c8ed` | uat 后续变更：`backend-server/release-records/uploads/2026-06-03-wechat-login-fix/README.md` | 后端修复微信 `jscode2session` text/plain 响应导致的登录 500；小程序沿用现有授权路径，待微信开发工具用真实 code 复测 |
| `BE-2026-06-03-login-content-type-token-uat` | `37383fb` | uat 后续变更：`backend-server/release-records/2026-06-03-login-content-type-fix.md`；commit-log `v0.1.9`/`v0.1.10` | 后端将登录请求体/媒体类型错误转为 `400 REQUEST_BODY_INVALID` / `415 UNSUPPORTED_MEDIA_TYPE`，并将 JWT/Redis 登录态签发异常转为明确业务错误；小程序授权请求已显式传 `content-type: application/json`，本批次无需改代码，待真实 code 复测 |
| `BE-2026-06-06-cms-auth-tighten-uat` | `c06ca8f` | uat 最新提交：`fix(bff): 收紧CMS资源接口鉴权`；安全配置：`hellokitty-park-bff-service/src/main/resources/application.yml` | 后端移除 `/api/bff/cms/**` 公开白名单，CMS 资源位直连 BFF 需要登录 token；`/api/bff/purchase/**` 仍公开，小程序购票页资源位已切到 `/api/bff/purchase/resources`；2026-06-06 复测该公开资源位返回 500，前端已让资源位失败只回退图片，不阻断购票列表 |
| `BE-2026-06-07-mini-program-ads` | `6fbe8f8`、`31cabcb`、`936aa38`、`00486d4` | 后续变更：`backend-server/release-records/frontend-api/changes/2026-06-07-mini-program-ads.md`、`backend-server/release-records/frontend-api/changes/2026-06-07-bff-mini-program-auth-restore.md`、`backend-server/release-records/frontend-api/mini-program-api.md` | 后端新增小程序广告聚合和单广告详情接口，并在 2026-06-07 恢复小程序 BFF 业务接口鉴权；首页广告、购票列表和购票资源位 GET 均需先完成小程序授权并携带 `Authorization`，不需要签名；广告字段补齐 `id/pageId/slotId/fieldConfig/adName/backgroundImage/materialImage/iconImage/jumpPath` 等前端字段；广告真实接口链路不允许失败回旧本地内容 |
| `BE-2026-06-08-mini-program-slot-ads` | `b77d398` | 后续变更：`backend-server/release-records/frontend-api/changes/2026-06-08-mini-program-slot-ads.md` | 后端新增 `/api/bff/content/mini-program/slots/{slotCode}/ads`，首页“查看更多”列表页可按资源位编码直查可见广告；小程序列表页已移除旧本地 mock，空数组进入空态，接口错误进入异常态 |
| `BE-2026-06-08-member-auth-status` | `30d37b1`、`348945c`、`29efdf7`、`5473fe3`、`da1b529` | 后续变更：`backend-server/release-records/frontend-api/changes/2026-06-08-mini-program-phone-authorize.md`、`2026-06-08-bff-member-identity-hardening.md`、`2026-06-08-bff-member-status-upload.md`、`2026-06-08-bff-crm-entry-rename.md`、`mini-program-api.md` | 小程序登录只换 BFF token，会员登录态统一由 `GET /api/bff/auth/member/status` 的 `memberLoggedIn/memberInfo.phone` 判断；启动默认 `login -> member/status` 缓存 MobX `memberInfo`，受保护入口只读 `rootStore.isLoggedIn` 做弹窗拦截，不主动重复 login/memberStatus；手机号授权后和资料更新后用当前 session 刷新 `member/status`；登录弹窗只保留微信手机号授权；会员资料/会员码/会员中心链路不再失败回旧 mock；CRM 入口路径从 `/crm/p1/**` 改为 `/crm/entries/**`；前端不再传/读 `memberNo/openId/userId/channelOpenId/payerId` |
| `BE-2026-06-13-member-coupon-assets` | `0a33cfe`、`2569e74`、`4080957`、`06ef472` | 后续变更：`backend-server/release-records/frontend-api/changes/2026-06-13-bff-member-coupon-assets.md`、`2026-06-13-bff-order-confirm-error-propagation.md`、`2026-06-13-ticket-order-payment-bypass.md`、`mini-program-api.md` | 小程序会员券资产、可领取券包、领券、兑换码、退款退券 service、门票结算候选券和带券统一下单已按真实 BFF 接入；门票下单改走 `POST /api/bff/orders` 并提交 `selectedCouponNos`，创建成功后承接后端 `WAIT_USE/ticketVouchers`，不再本地伪造订单或支付成功；K 币商品兑换、退款退券自动触发、后台券包编排一致性仍需后端补齐或确认 |

## BFF 主接口落地表

| 能力 | 接口 | 鉴权模式 | 小程序落点 | 适配状态 |
| --- | --- | --- | --- | --- |
| 小程序登录 | `POST /api/bff/auth/mini-program/login` | 免认证、免签名 | `src/core/request/index.ts`、`src/core/services/auth.ts` | 已切到 Feishu 路径，存储 `accessToken/refreshToken/signSecret`；授权和 JSON 写请求已显式传 `content-type: application/json`；本接口只代表 BFF token 可用，成功后立即用当前 token 调 `member/status` 刷新 MobX `memberInfo` |
| 刷新令牌 | `POST /api/bff/auth/refresh` | 免认证、免签名 | `src/core/request/index.ts`、`src/core/services/auth.ts`、`src/core/services/bff-api.ts` | service 已接入；统一 request 层已识别 `AUTH_TOKEN_EXPIRED/AUTH_TOKEN_INVALID/AUTH_TOKEN_SESSION_EXPIRED`、`401/10008` 等凭证失效信号，自动用 `refreshToken` 刷新 accessToken/refreshToken/signSecret 后重放原请求一次，并在 token 写入后静默调 `member/status` 校准全局会员态 |
| 会员状态 | `GET /api/bff/auth/member/status` | 登录态 | `src/core/services/auth.ts`、`src/core/services/bff-api.ts`、`src/core/store/member-store.ts` | 已接入；`memberInfo.phone` 是会员是否登录事实源，启动默认拉一次并缓存到 `rootStore.memberInfo`；受保护入口只读缓存态拦截，后续页面和组件统一通过 `rootStore.isLoggedIn`、`rootStore.memberInfo` 渲染头像昵称手机号等级 |
| 手机号授权 | `POST /api/bff/auth/mini-program/phone/authorize` | 登录态 + HMAC 签名 | `src/core/components/LoginPopup`、`src/core/wechat/auth.ts`、`src/core/services/auth.ts`、`src/core/services/bff-api.ts` | 已接入微信 `getPhoneNumber` 新版 `code`；不再使用微信资料登录、本地会员登录或旧 `encryptedData/iv` 作为登录事实；授权成功后用当前 session 刷新 `member/status` |
| 登出 | `POST /api/bff/auth/logout` | 登录态 + HMAC 签名 | `src/core/services/auth.ts`、`src/core/services/bff-api.ts` | 已在退出登录时优先调用后端，失败不阻塞本地退出 |
| 图片上传 | `POST /api/bff/files/images` | 登录态，multipart | `src/core/services/bff-api.ts`、`src/pkg-member/services/profile.ts` | 已接入头像上传；只使用后端返回的 `imageUrl`，不再把本地临时路径作为头像结果 |
| 模块状态 | `GET /api/bff/modules` | 登录态 | `src/core/services/bff-api.ts` | service 已接入，暂无页面直接依赖 |
| 后台默认配置 | `GET /api/bff/admin-config/defaults` | 登录态 | `src/core/services/bff-api.ts` | service 已接入，暂无页面直接依赖 |
| 创建预支付单 | `POST /api/bff/pay/prepay` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待真实订单/微信支付链路替换 mock |
| 查询支付状态 | `GET /api/bff/pay/payments/{payNo}` | 登录态 | `src/core/services/bff-api.ts` | service 已接入，待订单详情/支付回查链路使用 |
| 促销试算 | `POST /api/bff/promotion/quote` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待票务/商城/餐饮结算链路使用 |
| 锁定优惠 | `POST /api/bff/promotion/lock` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待下单链路使用；Feishu BFF 转换稿漏写 body，按 uat 源码和内部 promotion 文档保留请求体 |
| 核销优惠 | `POST /api/bff/promotion/confirm` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待支付成功链路使用；Feishu BFF 转换稿漏写 body，按 uat 源码和内部 promotion 文档保留请求体 |
| 释放优惠 | `POST /api/bff/promotion/release` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，待订单取消/超时链路使用；Feishu BFF 转换稿漏写 body，按 uat 源码和内部 promotion 文档保留请求体 |
| 可用优惠券 | `GET /api/bff/promotion/coupons/available` | 登录态 | `src/core/services/bff-api.ts` | service 已接入；门票结算本阶段先用会员券资产列表筛选候选券，待后端确认该接口是精确试算还是候选券查询 |
| 会员券资产 | `GET /api/bff/member/coupons` | 登录态 | `src/core/services/bff-api.ts`、`src/pkg-member/services/coupons.ts`、`src/pkg-ticket/services/ticket-booking.ts` | 我的优惠券和门票结算候选券已接入；页面不再失败回旧本地券 |
| 会员可领券包 | `GET /api/bff/member/coupon-packages` | 登录态 | `src/core/services/bff-api.ts`、`src/pkg-member/services/coupon-center.ts` | 领券中心已接入；当前后端由 promotion 券模板同源生成券包，后台券包编排一致性见缺口文档 |
| 领取优惠券 | `POST /api/bff/promotion/coupons/claim` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts`、`src/pkg-member/pages/coupon-center/index.tsx` | 已接入真实领取；成功后刷新券包列表 |
| 兑换码兑券 | `POST /api/bff/promotion/coupons/exchange` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts`、`src/pkg-member/pages/coupon-center/index.tsx`、`src/pkg-member/services/exchange.ts` | 已接入兑换码；兑换专区没有真实 `exchangeCode` 时阻断，不做 K 币商品假兑换 |
| 退款退券 | `POST /api/bff/promotion/coupons/refund-return` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已补齐，订单退款触发口径待后端确认 |
| 节假日同步 | `POST /api/bff/xxl-job/holiday/sync` | 登录态 + HMAC 签名 | `src/core/services/bff-api.ts` | service 已接入，仅作受控调试入口，不建议普通页面暴露 |

## 购票/CMS 后续变更落地表

| 页面/能力 | 接口 | 鉴权模式 | 字段归一 | 适配状态 | 验证状态 |
| --- | --- | --- | --- | --- | --- |
| 门票预定列表 | `GET /api/bff/purchase/menus?sceneType=TICKET` | 登录态 GET，不需要签名 | `menuNo -> id`，`menuName -> title`，`subtitle -> description`，`priceCent / 100 -> price`，`badgeText -> tags` | 已接入 `src/pkg-ticket/services/ticket-booking.ts`，由默认 request 先拿 token；接口失败进入页面异常态，空商品展示业务空态，不再回退本地票种 | 待微信开发工具网络面板确认携带 `Authorization` |
| 门票详情 | `GET /api/bff/purchase/menus/{menuNo}` | 登录态 GET，不需要签名 | 详情字段暂按列表项复用，缺失字段由页面已有规则兜底 | `src/pkg-ticket/services/purchase-api.ts` 已接 service；待详情/下单链路接入 | 待验证 |
| 购票页资源位 | `GET /api/bff/purchase/resources?sceneType=TICKET&pageCode=PURCHASE_HOME` | 登录态 GET，不需要签名 | `mobileImageUrl/imageUrl -> heroImages`，缺图沿用本地兜底 | 已接入 `src/pkg-ticket/services/ticket-booking.ts`，由默认 request 先拿 token；资源位失败时只回退图片，不阻断购票列表真实数据 | 待微信开发工具目视验证和网络面板确认携带 `Authorization` |
| CMS 单资源位 | `GET /api/bff/cms/resources/{slotCode}` | 登录态 GET，默认携带 `Authorization` | `slotCode` 作为资源位稳定 key | `src/pkg-ticket/services/purchase-api.ts` 已接 service；暂无页面直接依赖；后端 `c06ca8f` 后不再按公开接口调用 | `curl` 无 token 返回 `401 AUTH_TOKEN_MISSING`；带 token 待验证 |
| 首页广告聚合 | `GET /api/bff/content/mini-program/ads?pagecode=index` | 登录态 GET，不需要签名 | `slots[].slotCode` 作为资源位 key；广告图片按 `backgroundImage/materialImage/iconImage/imageUrl/mobileImageUrl` 归一；跳转按 `jumpType + jumpPath/jumpUrl/jumpCustomValue/jumpAppId` 归一 | 已新增 `src/core/services/mini-program-ad.ts`，首页 `src/pages/home/index.tsx` 读取聚合接口；默认 request 会先完成小程序授权并携带 `Authorization`；`index_top_banner` 优先覆盖顶部轮播，无数据才兼容旧 `index_banner`；`index_nav_grid/index_schedule/index_hot_project/index_activity/index_recommend/index_member_benefit/index_play_life` 覆盖对应首页楼层；接口失败或核心资源位无数据时进入异常态，不再回退本地旧内容 | 2026-06-08 后台真实聚合已回读：首页顶部 Banner 5、八大导航 8、节目单 1、热门项目 2、精选活动 1、精彩推荐 2、会员福利 1、吃喝玩乐 9；无小程序登录态直接请求 BFF 返回空 slots，待微信开发工具网络面板确认携带 `Authorization` 后目视首页渲染 |
| 单广告详情 | `GET /api/bff/content/mini-program/ads/{id}` | 登录态 GET，不需要签名 | `id` 使用后端数字 ID；详情返回 `page/slot` 上下文；详情正文只允许把后端 `richTextHtml/richText` 原文直接传给小程序 `RichText`，不在前端重写 HTML 结构，也不拼装标题、图片或描述作为正文 | 已在 `src/core/services/mini-program-ad.ts` 补齐详情函数；首页广告点击进入活动/项目/节目单详情时必须把后端广告 `id` 写入路由，`activity-detail`、`park-detail` 和 `schedule` 用该 `id` 回查详情；接口失败、无数据或缺少富文本正文进入异常态，不再回退本地旧详情 | `yarn typecheck` 通过；待登录态回归验证 |
| 资源位广告列表 | `GET /api/bff/content/mini-program/slots/{slotCode}/ads` | 登录态 GET，不需要签名 | `slotCode` 使用首页“查看全部”路由参数；广告字段复用 `MiniProgramAdView`，前端按 `sortOrder` 升序展示 | 已新增 `fetchMiniProgramSlotAds(slotCode)`；首页热玩榜单、精选活动、精彩推荐、玩转乐园的“查看全部”会携带 `slotCode/title`；`park-list` 和 `activity-list` 按资源位直查真实接口并删除旧本地 mock 数据 | 待微信开发工具用真实小程序登录态验证 `/slots/index_hot_project/ads`、`/slots/index_activity/ads` 等请求携带 `Authorization` |

## CRM/P1 UAT 变更落地表

| 页面/能力 | 接口 | 鉴权模式 | 字段归一 | 适配状态 | 验证状态 |
| --- | --- | --- | --- | --- | --- |
| 会员中心首页 | `GET /api/bff/crm/center` | 登录态 | `profile.growthValue/couponCount/nextLevel*` 更新首页数值，`benefits` 映射权益区；不读取内部会员标识 | 已接入 `src/core/services/bff-crm-api.ts`、`src/pkg-member/services/index.ts`；接口失败进入页面异常态，不再回本地会员假数据 | `yarn typecheck` 通过；待微信开发工具真实登录态验证 |
| 会员资料查询/保存 | `GET/POST /api/bff/crm/profile` | 查询登录态；保存登录态 + HMAC 签名 | `nickName -> nickname`，`phone -> mobile`，`idCardNo`、`gender UNKNOWN/MALE/FEMALE -> 0/1/2`；BFF 不返回 `memberNo/openId/userId`，前端不再传或读这些字段 | 已接入 `src/pkg-member/services/profile.ts`；资料查询/保存、头像上传和老会员绑定均成功后同步 `rootStore.memberInfo`，保存后用当前 session 刷新 `member/status`；失败不再兜底本地会员资料 | `yarn typecheck` 通过；待真实签名写接口验证 |
| 我的地址 | `GET/POST /api/bff/crm/addresses`、`POST /delete`、`POST /default` | 查询登录态；写接口登录态 + HMAC 签名 | `addressNo -> id`，`contactName -> name`，省市区名称拼 `region`，`detailAddress -> detail` | 已接入 `src/pkg-order/services/address.ts`；列表优先读后端，保存/删除/默认先本地更新再异步同步后端 | `yarn typecheck` 通过；待真实签名写接口验证 |
| 会员码 | `GET /api/bff/crm/member-code` | 登录态 | 只使用 `qrContent`，BFF 不再暴露 `memberNo` | 已接入 `src/pkg-member/services/member-code.ts`；缺 `qrContent` 或接口失败进入异常态，不再生成本地动态码 | `yarn typecheck` 通过；待真实登录态验证 |
| 老会员绑定 | `POST /api/bff/crm/legacy-bind` | 登录态 + HMAC 签名 | `phone` 入参，结果 `bound` 映射老会员绑定状态；不读取 `memberNo/legacyMemberNo` | 已接入 `src/pkg-member/services/profile.ts`，绑定成功后重新拉取资料并刷新 `member/status` | `yarn typecheck` 通过；待真实签名写接口验证 |
| 领券中心入口 | `GET /api/bff/crm/entries/coupons` | 登录态 | 已不作为领券中心主数据源，领券中心改读会员券包接口 | 领券中心已切到 `GET /api/bff/member/coupon-packages` 和领取接口，CRM 入口仅保留历史路径说明 | 待微信开发工具验证 |
| 兑换专区入口 | `GET /api/bff/crm/entries/exchanges`、`GET /api/bff/crm/entries/items/{itemNo}` | 登录态 | `itemNo/itemName/imageUrl/pointsCost/stockAvailable/description/extraPayload.exchangeCode` 映射兑换商品 | 已删除旧本地兑换商品兜底；只有后端配置真实 `exchangeCode` 时才调用兑换码兑券，否则阻断并同步接口缺口 | 待微信开发工具验证；K 币商品兑换接口见 `docs/codex/api-requirements/coupon-service.md` |

## 订单 UAT 变更落地表

| 页面/能力 | 接口 | 鉴权模式 | 字段归一 | 适配状态 | 验证状态 |
| --- | --- | --- | --- | --- | --- |
| 统一创建订单 | `POST /api/bff/orders` | 登录态 | `OrderUnifiedRequest.items/selectedCouponNos/context/contact`；价格、库存和优惠由后端按后台配置计算 | 门票确认订单页已改走统一创建单并提交 `selectedCouponNos`；不再写本地订单假成功 | 待微信开发工具真实 token 创建带券门票订单 |
| 订单支付 | `POST /api/bff/orders/{orderNo}/pay` | 登录态 | `prepay.paymentSkipped` 表示门票已免支付出票 | service 已新增；当前门票创建单若已返回 `WAIT_USE/ticketVouchers` 直接进详情，不重复拉起微信支付 | 待微信开发工具验证旧流程兜底 |
| 订单详情 | `GET /api/bff/orders/{orderNo}` | 登录态 | `orderNo/orderStatus/amount/items/context/ticketVouchers` 按后端 `BffOrderView` 映射 | 真实订单详情已接 BFF；门票详情展示后端智游宝票码或二维码，不在前端自造码 | 待微信开发工具验证真实订单详情 |
| 订单列表 | `GET /api/bff/orders?sceneType=TICKET` | 登录态 | `sceneType` 支持 `TICKET/MALL/HOTEL` | service 已新增，订单中心列表仍待分场景替换；本阶段先保证带券门票下单后可按详情页查看 | 待页面切片接入 |

## 鉴权跟进

- `src/core/request/index.ts` 已支持 `sign: true`，对 `POST/PUT/PATCH/DELETE` 自动追加 `X-Timestamp`、`X-Nonce`、`X-Body-Sha256`、`X-Signature`。
- `src/core/utils/crypto.ts` 纯小程序运行时实现 SHA-256、HMAC-SHA256 Base64URL no padding 和 nonce，不引入 Node crypto。
- `src/core/store/member-store.ts` 已持久化 `refreshToken` 和 `signSecret`；清空会话时一并清掉签名密钥。
- `src/core/store/member-store.ts` 统一维护 `memberInfo`，头像、昵称、手机号、等级和登录态都从 MobX 派生；页面/组件优先读 `rootStore.memberInfo` 和 `rootStore.isLoggedIn`。
- 普通受保护接口默认携带 `Authorization: Bearer <token>`；截至 2026-06-07，除登录和刷新外所有小程序 BFF 业务接口均需登录态，GET 只校验 token，不需要签名。
- BFF token 只代表后端会话可用，不代表会员已登录；`src/core/services/auth.ts` 的 `getMemberStatus({ isNeedLogin })` 明确区分是否需要前置 login。启动走 `refreshMember()`，即先 login 再 `member/status`；受保护入口只读 `rootStore.isLoggedIn`，未登录直接打开弹窗，不主动重复 login/memberStatus；手机号授权、资料保存和老会员绑定后走 `syncMemberStatus()`，只用当前 token 静默调 `member/status`；request 层 login/refresh token 成功后也只用当前 token 静默调 `member/status`，避免反向循环 login。
- 统一 request 层在业务接口返回 `AUTH_TOKEN_EXPIRED`、`AUTH_TOKEN_INVALID`、`AUTH_TOKEN_SESSION_EXPIRED`、`401` 或旧 `10008` 时，会优先调用 `/api/bff/auth/refresh` 换新令牌并重放原请求一次；refreshToken 缺失或失效时清空后端会话和会员态，后续入口再按后端事实刷新。
- 页面或资源位已经进入真实接口联调后，不允许在接口失败、字段缺失或配置缺失时静默回退旧 mock/静态业务数据；必须让页面进入异常态、空态或阻断态，便于前后端定位真实链路问题。
- 登录和刷新接口请求体必须保持 JSON，`src/core/request/index.ts` 已为 JSON 写请求默认带 `content-type: application/json`；后端从 `v0.1.9`/`v0.1.10` 起对错误请求体、错误媒体类型、JWT 签发和 Redis 登录态存储异常返回明确错误码，不再统一落 500。
- Feishu 文档里的 promotion/pay/admin-config/xxl-job 内部服务接口只作为后端/管理后台联调参考，小程序只走 `/api/bff/**`。
- 当前发现 Feishu BFF 转换稿中 `promotion lock/confirm/release` 的请求体遗漏；已按 BFF uat 源码 `@RequestBody Map` 和内部 promotion 接口示例落 service，请后端后续同步修正文档。

## HANDOFF 给 hk-api

| 批次 | 事项 | 已改文件 | 待合并/待确认 | 验证状态 | 演进候选 |
| --- | --- | --- | --- | --- | --- |
| `BE-2026-05-19-feishu-bff-base` | Feishu 主文档 13 个 BFF 对外入口已落小程序 service/request 层，高风险写接口签名已接入 | `src/core/request/index.ts`、`src/core/store/member-store.ts`、`src/core/utils/crypto.ts`、`src/core/services/bff-api.ts`、`src/core/services/auth.ts`、`src/core/config/env.ts` | 根总表同步“小程序已完成 service 层接入，交易链路待页面级接入”；管理后台继续按自身联调文档处理后台配置接口 | `yarn typecheck` 已通过；真实登录/签名写接口需微信开发工具和真实 token 验证 | 后续如果出现第二个端需要签名，抽一个端内签名验收小脚本或示例用例 |
| `BE-2026-05-28-purchase-cms` | 小程序购票列表和购票页资源位已按 uat 后续变更记录端内接入；最新 `936aa38/00486d4` 已恢复登录态 GET | `src/pkg-ticket/services/purchase-api.ts`、`src/pkg-ticket/services/ticket-booking.ts` | 剩余微信开发工具网络面板确认购票列表和购票资源位携带 `Authorization`；购票页资源位失败仍需不阻断核心列表 | 待新鉴权口径回归 | 接口鉴权必须以最新 BFF 安全配置和 release 为准，不能沿用旧公开接口结论；资源位失败不得阻断购票列表 |
| `BE-2026-05-28-crm-uat` | CRM/P1 小程序接口已落 service 层，会员首页/资料/地址/会员码/领券/兑换已做兜底接入 | `src/core/services/bff-crm-api.ts`、`src/pkg-member/services/index.ts`、`src/pkg-member/services/profile.ts`、`src/pkg-member/services/member-code.ts`、`src/pkg-member/services/coupon-center.ts`、`src/pkg-member/services/exchange.ts`、`src/pkg-order/services/address.ts` | 根总表同步“小程序 CRM service 已接入，写接口待真实签名验证”；后台 CRM 配置由管理后台文档跟进 | `yarn typecheck` 已通过；待微信开发工具真实登录态验证 | CRM/P1 字段映射已出现复用模式，后续第二批页面接入时可评估沉淀端内 adapter |
| `BE-2026-05-30-order-checkout-uat` | 订单提交/详情/列表 BFF service 已落地，页面交易链路暂不强切 | `src/core/services/bff-order-api.ts` | 后续按票务下单、商城下单、订单中心拆页面工作包接入 | `yarn typecheck` 已通过；待真实订单链路验证 | 订单 service 先保持通用类型，不在本批次扩写页面状态映射 |
| `BE-2026-06-03-login-content-type-token-uat` | 后端登录 Content-Type、请求体解析、JWT 签发和 Redis 登录态存储异常已返回明确错误码；小程序统一 request 已为 JSON 写请求默认补 `content-type: application/json` | `src/core/request/index.ts`、`docs/codex/interface-integration.md`、`docs/codex/current-mini-program.md` | 需要 `$hk-api` 合并根总表最近辅助 commit `37383fb` 和本批次“前端 request header 已补齐”结论 | 待微信开发工具用真实 code 复测登录和刷新，重点观察 `400/415/AUTH_TOKEN_*` 错误码不再表现为通用 500 | 登录失败 toast 如后续需要更业务化，可在 request 层增加错误码文案映射；当前先不为单批次扩写规则 |
| `BE-2026-06-06-cms-auth-tighten-uat` | 后端移除 `/api/bff/cms/**` 公开白名单，单 CMS 资源位恢复默认登录态；后续 `936aa38/00486d4` 进一步恢复所有小程序 BFF 业务接口鉴权 | `src/pkg-ticket/services/purchase-api.ts`、`src/pkg-ticket/services/ticket-booking.ts`、`docs/codex/interface-integration.md`、`docs/codex/current-mini-program.md` | 需要 `$hk-api` 合并根总表最近辅助 commit `936aa38/00486d4`，并覆盖旧“购票资源位公开 GET”结论 | 待微信开发工具目视购票页和网络面板确认携带 `Authorization` | 稳定规则候选：接口鉴权必须以 BFF 最新安全配置和 release 为准；可选资源位接口失败不得拖垮核心列表数据 |
| `BE-2026-06-07-mini-program-ads` | 小程序首页已接入登录态广告聚合接口，按资源位覆盖首页核心内容区域；广告详情页按后端广告 `id` 回查富文本详情；request 层已补齐 accessToken 过期后的 refresh + 原请求重放 | `src/core/request/index.ts`、`src/core/types/mini-program-ad.ts`、`src/core/services/mini-program-ad.ts`、`src/core/utils/ad-click.ts`、`src/pages/home/index.tsx`、`src/pkg-ticket/services/activity.ts`、`src/pkg-ticket/services/park-detail.ts`、`docs/codex/interface-integration.md`、`docs/codex/current-mini-program.md` | 需要 `$hk-api` 合并根总表最近辅助 commit `936aa38/00486d4`，并登记小程序广告接口不再公开；后台已用真实接口上传并投放 5 张首页顶部 banner | `yarn typecheck` 通过；待微信开发工具网络面板确认广告聚合和单广告详情在 token 过期时表现为“原请求 401 -> refresh -> 原请求重放成功”，并回归首页轮播和详情页 | 首页顶部 banner 先读 `index_top_banner`，无数据才兼容旧 `index_banner`；首页核心资源位缺失、广告详情接口失败或无详情数据均进入异常态，不回退旧本地内容 |
| `BE-2026-06-08-mini-program-slot-ads` | 首页楼层“查看全部”已改为携带资源位编码，列表页按资源位直查真实广告列表 | `src/core/services/mini-program-ad.ts`、`src/pages/home/index.tsx`、`src/pkg-ticket/pages/activity-list/index.tsx`、`src/pkg-ticket/pages/park-list/index.tsx`、`src/pkg-ticket/services/activity.ts`、`src/pkg-ticket/services/park-list.ts`、`docs/codex/interface-integration.md`、`docs/codex/current-mini-program.md` | 需要微信开发工具确认小程序授权后资源位直查 200；资源位不存在或停用按后端业务错误暴露，不回退旧 mock | `yarn typecheck`、`yarn check:package-boundary`、`git diff --check` 通过 | 后续新增首页楼层列表页时统一传 `slotCode`，不要再从首页聚合结果或本地 mock 派生列表 |
| `BE-2026-06-08-member-auth-status` | 小程序会员授权登录和会员资料链路已按真实接口重接：启动默认 `login -> member/status`，受保护入口只读 MobX 登录态拦截，手机号授权走官方 `code`，资料保存/头像上传/老会员绑定后刷新全局 `memberInfo`，个人信息页新增退出登录 | `src/core/request/index.ts`、`src/core/services/auth.ts`、`src/core/services/bff-api.ts`、`src/core/services/bff-crm-api.ts`、`src/core/store/member-store.ts`、`src/core/store/root-store.ts`、`src/core/components/LoginPopup`、`src/core/wechat/auth.ts`、`src/pkg-member/services/profile.ts`、`src/pkg-member/services/member-code.ts`、`src/pkg-member/services/index.ts`、`src/pkg-member/pages/profile/index.tsx` | 需要 `$hk-api` 合并根总表最近辅助 commit `30d37b1/348945c/29efdf7/5473fe3/da1b529`，并覆盖旧“BFF 授权返回 mobile 即登录”和 CRM P1 路径结论；小程序仍待微信开发工具真实手机号授权验证 | `yarn typecheck` 通过；待微信开发工具验证 `login -> member/status`、未登录缓存态点击受保护入口不重复 login/memberStatus、`getPhoneNumber code -> phone/authorize -> member/status`、资料保存签名和退出登录 | 长期规则候选：小程序页面不要散写会员登录判断，统一读 `rootStore.isLoggedIn/rootStore.memberInfo`；后端身份字段由 BFF token 内部转换，前端不传不读内部会员标识 |
| `BE-2026-06-13-member-coupon-assets` | 小程序会员券资产、领券中心、兑换码、兑换专区阻断、门票结算候选券、带券统一下单和订单详情票码承接已接入真实 BFF；票务改动仅作为券消费场景闭环，不扩展票务配置能力 | `src/core/services/bff-api.ts`、`src/core/services/bff-order-api.ts`、`src/pkg-member/services/coupons.ts`、`src/pkg-member/services/coupon-center.ts`、`src/pkg-member/services/exchange.ts`、`src/pkg-member/pages/coupon-center/index.tsx`、`src/pkg-member/pages/exchange-detail/index.tsx`、`src/pkg-ticket/services/ticket-booking.ts`、`src/pkg-ticket/services/order-draft.ts`、`src/pkg-ticket/pages/checkout/index.tsx`、`src/pkg-ticket/pages/ticket-booking/index.tsx`、`src/pkg-order/services/detail.ts`、`src/pkg-order/pages/detail/index.tsx`、`docs/codex/api-requirements/coupon-service.md`、`docs/codex/interface-integration.md`、`docs/codex/current-mini-program.md` | 后端仍需补齐 K 币商品兑换提交、K 币余额事实源、后台券包编排进入小程序券包、退款退券自动触发口径和商城/酒店结算用券回显；详见 `docs/codex/api-requirements/coupon-service.md` | `git diff --check`、`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary` 已通过；待微信开发工具真实 token 验证领券、兑换码、门票带券下单和订单详情票码 | 稳定规则候选：会员券真实接口接入后不得再用 CRM 入口或本地券数据冒充券资产；小程序券消费场景必须提交后端券号并以订单服务优惠结果为准 |

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
- 微信开发工具网络面板确认登录、普通登录态 GET、签名写接口的 header 和响应
- 微信开发工具确认页面失败兜底不出现内部文案
