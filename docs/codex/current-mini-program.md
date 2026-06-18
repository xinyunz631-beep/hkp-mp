# 当前小程序状态
## 更新时间
- 更新时间：`2026-06-18 03:35 CST`
- 当前状态：登录、请求、会员状态、页面初始化闸门、页面显式 runtime hook、页面单例 loading、统一 loading 组件入口和白色渐变淡出蒙层、全局登录态弹窗、webpack5 prebundle/cache 关闭、NutUI 按需样式、`@tarojs/plugin-html` 和 `@nutui/icons-react-taro` 显式依赖、BaseSkeleton/BaseEmpty/BaseException、中性页面底色+粉色品牌点缀、自定义 tabbar、独立 PageNavbar 和页面级 header/layout 已完成代码收口并通过本地校验；系统 custom-tab-bar 已压成 0 高度占位，可见 tabbar 已下沉到页面内 fixed 底部容器，`AppTabBar` 已从 `AppIcon` 切为直接 `Image` 小图并在组件顶部集中维护图片链接；会员授权登录已按后端真实接口重接，启动默认 `login -> member/status` 并把头像、昵称、手机号、等级统一维护到 MobX `rootStore.memberInfo`，页面可直接读 `rootStore.isLoggedIn`；登录弹窗只保留手机号授权和关闭；个人信息页新增退出登录；会员资料、头像上传、会员码和会员中心首页不再失败回旧会员 mock；酒店首页、房型详情、酒店确认单、酒店下单支付、订单中心列表和订单详情已切后端真实 BFF，酒店分包运行时 mock 数据文件已删除，订单中心核心列表/详情不再读取本地订单；门票预定页已切 `/api/bff/tickets/**`，支持快速通、草稿/待审核待上线展示、已发布库存加购、票种规则弹窗、0 元票和按 SKU 实名字段提交、无可订票种空态；门票确认单当前已通，创建订单当前被后端前置拦截为 `ORDER_TICKET_ZHIYOUBAO_GOODS_CODE_MISSING`，最新 traceId=`ticket-closure-mqi8st60-05`，需要管理后台为水上项目快速通 SKU 配置真实智游宝 `goodsCode` 后再复验 `WAIT_USE + ticketVouchers[]`；订单详情已对票务待使用凭证增加 15 秒静默轮询，覆盖用户停留在券码页被扫码核销不会触发 `onShow` 的场景，后端 `origin/uat@a81410c` 已确认该轮询复用既有订单详情接口并透出核销后的 `ticketStatus/usedNum/totalNum`；优惠券链路已新增 `src/core/services/bff-coupon-api.ts`，我的券、领券中心领取、K 币余额/兑换、门票和酒店确认单可用券已切真实 BFF；2026-06-18 00:36 按后端 `origin/uat@4047a42` 复核，K 币兑换、后台发券和券包赠送已从源码层同步同一 `couponNo` 到 `promotion_member_coupon`，我的券已适配分页、来源和返还状态字段，门票和酒店可用券已适配 `available/unavailableReason/discountAmount` 以及 `itemIds/skuIds/visitDate/checkInDate/checkOutDate`；`4047a42` 新增提交仅涉及深大零售上报字段和 UAT 文档回填，未改变促销 quote 候选券目标过滤缺口；小程序优惠券 BFF 后端必补文档维护在 `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/`，旧 `docs/codex/apimust/` 只保留迁移指针；当前仍不能宣称完整闭环，因为缺目标 `couponNo` 严格探针、订单试算/确认阶段同目标规则校验确认，以及退款返还精确幂等或订单服务触发口径确认。
- 最新券/商城复核：2026-06-18 03:35 已按后端 `origin/uat@ee74bd6` 核验，`ad09fb4` 已补订单 confirm / promotion quote 候选目标校验，`63e88b5` 已补退款返还幂等，`1b3ae92/ee74bd6` 已补商城购物车 BFF 源码和 release；小程序商城 service 与购物车已切真实 BFF，不回本地购物车缓存。当前仍不能宣称完整闭环，因为缺目标 `couponNo` 严格探针、管理端券模板 `target_ids` 同步、真实已核销券退款返还样本验收；商城展示 BFF `mall-after-ee74bd6-01..05` 仍 500，购物车 `cart/count` 200 但 `cart` 详情 `mall-after-ee74bd6-07` 仍 500。
- 恢复优先级：下一步优先完成优惠券链路微信开发工具验收，并用目标会员、目标 `couponNo` 或可发券 K 币兑换 `itemNo` 跑严格探针；没有目标样本前，只能证明 BFF 可达，不能证明“后台发券或 K 币兑换后小程序可见可用”。微信开发工具仍需验证真实 BFF 授权响应、`member/status` 登录态判断、手机号授权 `code`、资料保存签名、退出登录、首页广告聚合、门票预定页加减号和提交出票、酒店首页/房型/确认单/下单支付、订单中心列表/详情、我的券、领券中心领取、K 币兑换、门票/酒店用券、页面内自定义 tabbar 跳转/选中态、弹层覆盖关系和自定义 navbar 安全区表现。
## 恢复时先看
1. 根目录 `codex/current/current-task-list.md`、`codex/current/current-mini-program.md` 和本文件。
2. `mini-program/AGENTS.md`、`mini-program/CONSTRAINTS.md`。

## 技术与端约束

- Taro：`4.2.0`
- React：`18.3.1`
- MobX：`6.15.0`
- mobx-react：`9.2.1`
- 全局 UI 主题：Taro `mini.sassLoaderOption.additionalData` + `src/styles/tokens.scss`，主题色粉色 `#db2777` 只用于品牌按钮、选中态和重点氛围；页面、layout、骨架屏和基础状态组件默认使用中性浅灰/白色底；NutUI 样式通过 `babel-plugin-import` 按需引入，并依赖 `@tarojs/plugin-html@4.2.0`；图标优先使用 `@nutui/icons-react-taro@1.0.5`。
- Codex 主包体积检测命令：`yarn check:main-package:build`，输出目录 `.dist-check/main-package`，不覆盖微信开发工具使用的 `dist/`。
- 当前只按微信小程序 `weapp` 目标实现和验收，暂不考虑 H5 和其他端。
- 主包页面和 `tabBar` 页面固定放在 `src/pages`。
- 分包目录固定为 `src/pkg-*`。

## 真实接口

- AppID fallback：`wx72b9e08ce45d3e79`
- UAT host：`https://hellokitty-uat.yoursite.xin`
- BFF 授权地址：`https://hellokitty-uat.yoursite.xin/api/bff/auth/mini-program/login`
- 门票商品列表接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/tickets/products?size=100`，需小程序登录态；返回 `publishStatus=draft/pendingReview/published` 且 `channels` 包含 `miniProgram` 的商品，`productType/categorySection=fastPass` 表示快速通。
- 门票库存日历接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/tickets/products/{productCode}/calendar?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`，需小程序登录态；草稿/待审核商品返回空分页，已发布商品只返回可售日历行。
- 购票页资源位接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/purchase/resources?sceneType=TICKET&pageCode=PURCHASE_HOME`，需小程序登录态。
- 首页广告聚合接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/content/mini-program/ads?pagecode=index`，需小程序登录态。
- 单广告详情接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/content/mini-program/ads/{id}`，需小程序登录态。
- 资源位广告列表接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/content/mini-program/slots/{slotCode}/ads`，需小程序登录态，用于首页楼层“查看全部”列表页。
- 会员状态接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/auth/member/status`，需小程序登录态；`memberLoggedIn=true` 且 `memberInfo.phone` 有值才视为会员已登录。
- 手机号授权接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/auth/mini-program/phone/authorize`，需小程序登录态 + HMAC 签名；微信只提交 `getPhoneNumber` 返回的 `code`。
- 会员资料接口：`GET/POST https://hellokitty-uat.yoursite.xin/api/bff/crm/profile`；资料保存为登录态 + HMAC 签名，BFF 不暴露 `memberNo/openId/userId`。
- 头像上传接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/files/images`，登录态 multipart，返回 `imageUrl`。
- 退出登录接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/auth/logout`，登录态 + HMAC 签名。
- 酒店列表接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/hotels`，需小程序登录态。
- 酒店详情接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/hotels/{hotelId}`，需小程序登录态。
- 酒店房型接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/hotels/{hotelId}/rooms?checkInDate=YYYY-MM-DD&checkOutDate=YYYY-MM-DD`，需小程序登录态。
- 酒店房态价量接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/hotels/{hotelId}/inventory?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`，需小程序登录态；前端按入住日至离店前一日查询夜间库存。
- 统一订单确认接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/orders/confirm`，需小程序登录态 Bearer，不需要 HMAC 签名。
- 统一订单创建接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/orders`，需小程序登录态 Bearer，不需要 HMAC 签名；酒店链路使用 `sceneType=HOTEL`。
- 统一订单支付接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/orders/{orderNo}/pay`，需小程序登录态 Bearer，不需要 HMAC 签名。
- 订单列表接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/orders?sceneType=TICKET|MALL|HOTEL`，需小程序登录态。
- 订单详情接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/orders/{orderNo}`，需小程序登录态。
- 门票确认单接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/orders/confirm`，需小程序登录态 Bearer，不需要 HMAC 签名；门票链路使用 `sceneType=TICKET`、`itemId=票务商品 productCode`、`skuId=${productCode}_standard` 和 `context.visitDate`。
- 门票创建订单接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/orders`，需小程序登录态 Bearer，不需要 HMAC 签名；`sceneType=TICKET` 创建成功后后端直接生成内部免支付流水并调用智游宝出票，响应 `order.orderStatus=WAIT_USE` 和 `order.ticketVouchers[]` 时前端直接进入订单详情；当前 UAT 返回 `ORDER_TICKET_ZHIYOUBAO_GOODS_CODE_MISSING`，需管理后台配置真实智游宝 `goodsCode` 后复验，未返回可用票码/二维码前不能算闭环。
- 门票订单详情轮询：票务订单详情只要处于 `TICKET` 场景且订单仍为 `PAID/WAIT_USE/FULFILLING/PART_USED/PARTIALLY_USED` 等未终态，每 15 秒静默重读 `GET /api/bff/orders/{orderNo}`；轮询不以已有入园凭证为前提，必须同时覆盖异步出票前无券码、停留券码页被扫码核销不会触发 `onShow`、部分核销后继续刷新这三类场景。
- 门票支付兼容接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/orders/{orderNo}/pay`，需小程序登录态 Bearer，不需要 HMAC 签名；旧链路调用时若返回 `prepay.paymentSkipped=true` 不调用微信支付。
- 我的优惠券接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/member/coupons`，需小程序登录态；必须返回分页、状态、`couponNo`、券面、适用业态、退款返还状态，并与领券、K 币兑换和券包发券同源。
- 我的券包接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/member/coupon-packages`，需小程序登录态；券包内券必须能按同一 `couponNo` 出现在我的券和下单可用券。
- 领券接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/promotion/coupons/claim`，需小程序登录态 + HMAC 签名；当前后端真实入参为 `templateNo`，小程序不提交会员身份字段。
- 下单可用券接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/promotion/coupons/available`，需小程序登录态；后端 `origin/uat@ee74bd6` 已核验，其中 `27c68ed` 补齐 `itemIds/skuIds/visitDate/checkInDate/checkOutDate`，`ad09fb4` 已补订单 confirm / promotion quote 候选目标校验；必须读取与我的券同源的 `couponNo`，门票/酒店确认单选择后通过统一订单 `selectedCouponNos` 重新确认金额。
- K 币余额接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/member/kcoin/balance`，需小程序登录态。
- K 币流水接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/member/kcoin/ledgers`，需小程序登录态。
- K 币兑换接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/member/kcoin/exchanges`，需小程序登录态 + HMAC 签名；请求只传 `itemNo/quantity/idempotencyKey`。当前后端源码已在写 `crm_member_coupon_instance` 后同步同一 `couponNo` 到 `promotion_member_coupon`，但本地登录会员 K 币余额为 0 且无目标兑换样本，未跑写入严格探针前不能宣称“兑换券可下单使用”。
- 优惠券退款返还接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/promotion/coupons/refund-return`，需小程序登录态 + HMAC 签名；后端 `63e88b5` 已补 `userId + idempotencyKey` 幂等冲突处理，仍需真实已核销券验证返还后我的券和下单可用券状态一致。
- 商城展示接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/mall/home/products/categories/recommendations/gifts/available`，需小程序登录态；当前 UAT `mall-after-ee74bd6-01..05` 仍 500，页面只允许异常态或空态，不回退本地商城数据。
- 商城购物车接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/mall/cart`、`GET https://hellokitty-uat.yoursite.xin/api/bff/mall/cart/count`、`POST/PATCH/DELETE https://hellokitty-uat.yoursite.xin/api/bff/mall/cart/items`，GET 登录态、写接口登录态 + HMAC 签名；当前 `cart/count` 200，`cart` 详情 500，写入链路待详情 200 后验收。
- 业务成功码：`200`
- 普通业务接口 header 只默认带 `Authorization: Bearer <token>`。
- 授权登录/刷新不带业务访问令牌；高风险 BFF 写接口通过 `sign: true` 自动携带 HMAC 签名头；开发版/体验版统一接口日志保留 request/response、URL、状态和耗时，并脱敏鉴权签名字段。
- 统一 request 层已接入 accessToken 过期自动刷新：业务接口返回 `AUTH_TOKEN_EXPIRED`、`AUTH_TOKEN_INVALID`、HTTP `401` 或旧 `10008` 时，优先调用 `/api/bff/auth/refresh` 换新 `accessToken/refreshToken/signSecret`，然后自动重放原请求一次；多个接口同时过期时共用同一个刷新 Promise。
- Feishu 主文档 13 个 BFF 对外入口已落到 `src/core/services/bff-api.ts` 和请求/登录层；截至后端 `936aa38/00486d4`，除登录和刷新外所有小程序 BFF 业务接口均需登录态，GET 只校验 `Authorization`，不需要签名；购票列表、购票页资源位、首页广告聚合、资源位广告列表、单广告详情、酒店目录和订单中心均走默认 request 先拿 token；已进入真实接口联调的页面、资源位或业务链路，接口失败、字段缺失或配置缺失时必须进入异常态、空态或阻断态，不回退旧本地业务数据；字段和鉴权以 Feishu 主文档、OpenAPI、uat 后续变更记录和 BFF 最新安全配置为准。
- 后端 `c06ca8f` 已移除 `/api/bff/cms/**` 公开白名单；小程序购票页资源位已改走 `/api/bff/purchase/resources`，单个 CMS 资源位查询默认带登录态，不再按免登录接口调用。
- 后端 `v0.1.9`/`v0.1.10` 已将小程序登录请求体、`Content-Type`、JWT 签发和 Redis 登录态存储异常转为明确错误码；小程序统一 request 已为 JSON 写请求默认补 `content-type: application/json`，仍需微信开发工具用真实 code 复测登录和刷新响应。
- CRM 已新增 `src/core/services/bff-crm-api.ts`；会员状态、会员资料、会员码、会员中心首页、头像上传和老会员绑定已按真实接口重接，会员资料链路不再失败回本地会员 mock；CRM 入口路径已从 `/api/bff/crm/p1/**` 改为 `/api/bff/crm/entries/**`；资料保存、地址写操作和老会员绑定走 request `sign: true`，待微信开发工具真实登录态验证。
- 订单已新增 `src/core/services/bff-order-api.ts`，覆盖旧提交兼容、统一订单确认、统一订单创建、支付、取消、退款、列表和详情 BFF 入口；酒店确认单、酒店下单支付、订单中心列表和订单详情已切真实接口；票务确认单、创建订单、创建即出票、`ticketVouchers` 展示已按后端 `3290517` 口径接入；订单详情已补票务未终态 15 秒静默轮询，等待后端补核销后订单状态同步；商城交易链路待后续按自身工作包切换。
- 小程序优惠券 BFF service 已新增 `src/core/services/bff-coupon-api.ts`，我的券、券包、领券、可用券、K 币余额、K 币流水和 K 币兑换统一收口；会员券页、领券中心、兑换详情、门票确认单和酒店确认单已接入真实 BFF。后端必补接口文档维护在 `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/README.md`、`coupon-bff-required-interfaces-2026-06-16.md`、`coupon-bff-required-interfaces-2026-06-17.md`、`coupon-full-chain-acceptance-runbook-2026-06-17.md` 和 `route-api-map.md`；后续新增页面或接口必须同步更新 admin 目录下的小程序路由映射。小程序 `docs/codex/apimust/` 只保留迁移指针；管理后台券服务缺口仍只维护在 `admin-frontend/docs/codex/admin-api-requirements/coupon-service.md`；小程序侧券闭环复验命令为 `yarn probe:coupon-closure`，严格验收需传 `COUPON_PROBE_EXPECT_COUPON_NO` 或显式打开领券/K 币兑换写入开关。
- 小程序广告已新增 `src/core/services/mini-program-ad.ts` 和 `src/core/types/mini-program-ad.ts`，首页 `src/pages/home/index.tsx` 已读取 `/api/bff/content/mini-program/ads?pagecode=index`，按 `slotCode` 覆盖顶部轮播、八大导航、节目单、热门项目和吃喝玩乐；顶部轮播优先使用 `index_top_banner`，无数据才兼容旧 `index_banner`。广告聚合和详情请求均先完成小程序授权并携带 `Authorization`，接口失败、核心资源位缺失或详情无数据时进入异常态，不再回退旧本地内容。
- 2026-06-07 已完成首页顶部 banner 真实闭环：使用后台账号真实登录，调用 `/api/admin-config/files/images` 上传 `Desktop/HKP/banner` 下 5 张 JPG，再调用 `/api/content/mini-program/ads` 保存到 `index_top_banner` 资源位；后端已恢复小程序广告 BFF 鉴权，后续验收必须在微信开发工具网络面板确认广告聚合请求携带小程序访问令牌。
- 2026-06-16 23:00 微信开发工具复核：当前 hkitty 小程序窗口 AppID 为 `wx72b9e08ce45d3e79`，项目路径为 `mini-program/dist`，进入 `pkg-ticket/pages/ticket-booking/index` 后 `login`、`member/status`、首页广告、购票资源位和票务商品接口均返回 200；日历接口本次只按已发布商品唯一请求 5 次，`MENU_TICKET_CHILD_1DAY`、`TICKET_FAST_PASS_SIGHTSEEING_TRAIN`、`MENU_TICKET_ADULT_1DAY`、`TICKET_FAST_PASS_WATER_RIDE`、`MENU_TICKET_FAMILY_2P1C` 各 1 次，未再出现同一 `TICKET_FAST_PASS_SIGHTSEEING_TRAIN/calendar` 连打 10 次。页面可见状态为水上项目快速通 2026-06-16 `余票 20` 且加号视觉可用，观光小火车快速通和常规门票因当天库存 0 显示已售罄并禁用加号，草稿/待审核快速通显示待上线；受 Computer Use 坐标和 DevTools 可访问性限制，本次未自动确认点击水上项目快速通加号后的数量递增，也未提交订单。遗留告警包括购票资源位图片 `https://hellokitty-uat.yoursite.xin/ng/2f87c96....jpg` 返回 404、Taro/微信生成层 `scroll-view padding property is not yet supported`、DevTools 内部偶发 `clickCheckTask`、`undefined is not iterable` 和 `webviewScriptError`，暂未定位到票务接口失败。
- 2026-06-17 01:25-09:58 复用本对话已打开的 hkitty 微信开发者工具登录态复核 UAT：`/api/bff/tickets/products?size=100` 返回 10 个小程序渠道商品，当前代码只对 5 个已发布商品各请求 1 次日历，草稿快速通不请求日历，未再出现同一 `TICKET_FAST_PASS_SIGHTSEEING_TRAIN/calendar` 连打 10 次；同日已补强 ticket-booking 请求缓存，短 TTL 只淘汰已完成结果，进行中的同 `productCode+dateRange` 日历请求一直复用，避免慢接口或页面初始化补偿触发同一 calendar 连打；最初今天至未来 30 天 `availableStock>0` 均为 0 条，当前门票页加号禁用归因为后台库存未配置。随后用后台单日库存编辑能力把 `TICKET_FAST_PASS_WATER_RIDE~TICKET_FAST_PASS_WATER_RIDE_standard~2026-06-17~default` upsert 为 `publishStatus=published`、`saleStatus=onSale`、`totalStock=20`、`availableStock=20`，小程序日历回读同日库存为 20，`POST /api/bff/tickets/quote` 返回 `availableStock=20/payableAmountCent=6800`。票务统一订单请求已固定带 `channel=MINI_PROGRAM` 和未选券时 `selectedCouponNos=[]`；继续走统一订单确认时，`POST /api/bff/orders/confirm` 和直连 `POST http://47.99.149.184:8081/api/order/orders/confirm` 均返回 `INTERNAL_ERROR /api/order/orders/confirm failed`；后续同一 session 经 `/api/bff/auth/refresh` 换新 token 后重放同 payload 仍失败；根探针现已为每步携带并输出 `X-Trace-Id`，本次可按 BFF `ticket-closure-mqheimzs-03`、order ticket/mall/hotel 对照 `ticket-closure-mqhf580u-04`/`ticket-closure-mqhf580u-14`/`ticket-closure-mqhf580u-15` 查日志；`TICKET_PROBE_ORDER_DIAGNOSTICS=1` 直连验证缺日期/零数量仍能返回 400，ticket/mall/hotel 三类 catalog mapper 对照均 500，直连 promotion quote 成功返回早鸟九折 `payableAmountCent=6120`；只读 JDBC 复核 UAT DB 已确认 catalog SQL 均因 `park_order_inventory_lock` 不存在报 `42P01`，后端需补齐 order-service `V3__extend_order_lifecycle.sql` 表、索引和权限后再复验，这不是小程序字段、BFF 签名、票务日历、登录态或促销 quote 能力缺失。
- 2026-06-17 23:50 只读执行 `yarn probe:coupon-closure`：复用 `/tmp/hkitty-ticket-closure/mini-session.json`，`member/coupons`、`promotion/coupons/available?sceneType=TICKET&orderAmountCent=6800`、`member/coupon-packages`、`member/kcoin/balance` 均返回 200，traceId=`coupon-closure-mqi8yfp8-01..04`；当前会员 `couponCount=0`、`available couponCount=0`、`packageCount=0`、`availablePoints=0`，只能证明券 BFF 可达，不能证明后台发券或 K 币兑换券同源闭环。严格验收必须用 `COUPON_PROBE_EXPECT_COUPON_NO=目标券号 COUPON_PROBE_STRICT=1 yarn probe:coupon-closure` 证明同一券号同时出现在我的券和下单可用券；如要验证 K 币兑换，还需目标 `itemNo` 和足够 K 币余额后显式打开写入开关。
- 2026-06-18 00:36 复拉后端 `origin/uat@4047a42 fix(shenda): 适配零售上报验签字段`，本次 `27c68ed..4047a42` 只有深大上报、UAT 文档回填和 order-service 上报字段调整，没有补促销 quote 目标过滤；`27c68ed` 已补 `GET /api/bff/promotion/coupons/available` 的 `itemIds/skuIds/visitDate/checkInDate/checkOutDate` 透传和 promotion 侧 `target_scope=ITEM/SKU` 过滤。小程序 `src/core/services/bff-coupon-api.ts` 和旧 `src/core/services/bff-api.ts` 已支持重复 query 参数，门票确认单传票项/SKU/游玩日期，酒店确认单传酒店 ID、房型 ID、价规和入住离店日期。只读探针 `coupon-closure-mqiavd4g-01..04` 显式带 `itemIds=TICKET_FAST_PASS_WATER_RIDE`、`skuIds=TICKET_FAST_PASS_WATER_RIDE_standard`、`visitDate=2026-06-17`，四个接口仍 200，但当前会员仍无券、无券包、K 币 0；剩余严格验收需要目标 `couponNo`，后端仍需确认 `POST /api/bff/orders/confirm`/促销 quote 对 `selectedCouponNos` 也按同一商品/SKU/日期目标规则校验，并继续明确退款返还幂等/券号口径。
- 2026-06-18 03:35 复拉后端 `origin/uat@ee74bd6 docs(bff): 回填商城购物车UAT验证`，`63e88b5` 已补 `refund-return` 幂等，`ad09fb4` 已补订单确认 / promotion quote 候选目标校验，`1b3ae92` 已补商城购物车 BFF 源码。只读券探针 `coupon-after-ee74bd6-03..06` 仍四个接口 200、当前会员无券；商城展示探针 `mall-after-ee74bd6-01..05` 仍 500，购物车 `mall-after-ee74bd6-06` count 200、`mall-after-ee74bd6-07` cart 500。后端必读缺口已推到 `admin-frontend@4828f81` 的 `admin-api-requirements/mp-bff-requirements/`。

## 登录体系目标

核心原则：

- `App` 不作为可见 UI 全局容器。
- 登录弹窗由页面 runtime 承载；`openLogin` / `requestLogin` 先检查全局登录态，已登录时直接关闭并续执行。
- 登录弹窗不使用 `pageKey` / `ownerKey` 判断登录完成状态。
- 登录成功后，所有页面上已展示的登录弹窗都必须关闭。
- 页面 loading 由页面 hook 本地维护，一个页面同时只展示一个 loading。
- request 不自动维护页面 loading；业务请求需要 loading 时用 `usePageRuntime().withLoading(...)` 包裹。
- 首屏依赖初始化接口、页面级 loading 或初始化登录拦截的页面默认用 `usePageRuntime({ initPage })` + `pageRuntime.renderPage(...)`；静态页不强制。
- 有后端访问令牌只代表后端会话可用，不代表会员已登录。
- 会员是否登录只以 `GET /api/bff/auth/member/status` 的 `memberLoggedIn` 和 `memberInfo.phone` 为准。
- 会员头像、昵称、手机号、等级和积分统一维护在 `rootStore.member.memberInfo`，页面/组件通过 `rootStore.memberInfo` 和 `rootStore.isLoggedIn` 读取，不能散写字段判断或维护第二份全局用户资料。
- 启动默认 `login -> member/status` 缓存会员态；受保护入口只读 `rootStore.isLoggedIn` 做弹窗拦截，不主动重复 login/memberStatus；手机号授权、资料保存和老会员绑定后用当前 token 静默调一次 `member/status` 校准 MobX；request 层 login/refresh token 成功后同样只用当前 token 静默校准会员态。

核心文件职责：

- `member-store.ts`、`app-store.ts`、`identity.ts` 和 `services/auth.ts` 分别维护会员资料、登录弹窗、登录身份判断和登录动作。
- `use-page-runtime.tsx`、`PageRuntimeHost`、`LoginPopup`、`loading` 和 `AuthAction` 分别承载页面初始化、运行时节点、登录弹窗、页面单例 loading 和组件式登录拦截。

## 页面布局与导航

- `src/app.config.ts` 配置 `tabBar.custom = true`，`src/custom-tab-bar` 只渲染 0 高度占位，真实可见 tabbar 由 `src/core/components/AppTabBar` 放在页面内 fixed 底部容器，避免微信系统 tabbar 层级压过弹层。
- 主包 tab 页面配置 `navigationStyle: 'custom'`，不使用微信默认导航栏。
- `src/core/components/PageNavbar` 是独立导航栏组件，读取状态栏和微信右侧胶囊位置，可作为 layout header 内容。
- `PageNavbar` 默认按当前页面栈判断是否为主包 tab 页面：tab 页面只展示标题，不展示左侧 icon；非 tab 自定义 navbar 页面默认展示左侧 icon，返回逻辑统一走 `navigateBackOrHome()`，标题水平居中，默认返回图标统一使用 NutUI `ArrowLeft`。
- `src/core/components/PageLayout` 是页面级布局组件：header/footer 都是 fixed 定位，层级高于中间内容；中间区域根据是否传入 `scrollViewProps` 决定使用 `ScrollView` 还是普通 `View`，并通过 JS 动态计算显式高度或占位节点撑开上下空间；页面内 tabbar 也 fixed 到底部，内容末尾额外预留 tabbar 空间。
- `PageRoot` / `PageShare` 是页面级相对插槽，和 header/footer 同级，默认按普通内容渲染但层级高于它们，适合放不需要 fixed 的补充内容。
- `PageShell` 支持把自定义 `className` 透传到最外层 `PageLayout`，便于页面内覆盖已有 layout 样式。
- `PageShell` 新建页面默认继续配合 `usePageRuntime()` 使用；使用自定义 navbar 的页面必须在页面 `config.ts` 显式声明 `navigationStyle: 'custom'`，系统导航页传 `navbar={false}`。
- `src/core/utils/style.ts` 集中封装 navbar 胶囊尺寸、窗口高度、selector rect 高度和微信设备底部安全区判断。
- `src/core/utils/navigation.ts` 集中封装 `navigateBackOrHome()` 和主包 tab 页面识别逻辑，避免页面分散写返回栈判断。
- `$mpcode-page` 是小程序页面实施的单一入口；页面基础设施事实源在 `docs/codex/page-foundation.md`，新建页面脚本为 `yarn mp:page create ...`，页面约束校验为 `yarn check:page-convention`。
- `src/app.scss` 已统一给 `view`、`text`、`button`、`scroll-view` 等常用宿主元素设置 `box-sizing: border-box`。
- 底部安全区不使用 CSS `env(safe-area-inset-bottom)`；需要底部安全区的设备统一加 20Px 占位元素，避免被 Taro 转成 `rpx`。
- `scroll-view padding="{{...}}"` 若仅来自 Taro 生成模板，不通过本地插件改写构建产物；业务侧 tabbar 预留使用占位节点。
- `PageShell` 已基于 `PageLayout` 改造，默认不渲染页面内 `AppTabBar`；只有首页和“我的”页显式传 `reserveTabBarSpace` 开启。
- `yarn check:page-convention` 已增加 tabbar 约束：除 `home` 和 `member` 外，其它页面不得开启 `reserveTabBarSpace`。
- 页面需要运行时能力时显式调用 `usePageRuntime()`；新页面优先用 `pageRuntime.renderPage(...)` 自动挂载运行时节点，旧 `runtimeNode` 透传仅保留兼容。

## 当前已做

- 根目录已新增 `ROOT-013/014/035/036` 等约束，进行中任务、接口联调、富文本和真实接口无 mock 兜底规则已写入事实源。
- `src/core/config/env.ts` 已设置 UAT host、BFF 授权路径和微信 AppID fallback；本地 mock API 文件已删除。
- request 已实现 BFF 授权队列、业务请求等待授权、token 提取持久化、过期自动 refresh 并重放原请求、高风险写接口 HMAC 签名，且不维护页面 loading。
- `src/core/services/bff-api.ts` 覆盖 Feishu 主文档 13 个 BFF 对外入口；`src/core/services/bff-order-api.ts` 已覆盖统一订单确认、创建、支付、取消、退款、列表和详情。
- 门票预定页已读取真实票务商品、库存日历和购票资源位；接口失败进入异常态、空数组进入空态，不回退旧本地门票数据。草稿/待审核票展示“待上线”，同一商品日历按 `productCode+dateRange` 去重请求，进行中的同 key 请求不会被短 TTL 淘汰，已发布且当日 `onSale`、`availableStock>0` 才允许加购；2026-06-16 微信开发工具已确认水上项目快速通当天 `availableStock=20` 并展示可用加号，2026-06-17 最初复核今天起未来 30 天 5 个已发布商品库存均为 0，随后后台单日库存已把水上项目快速通当天配置为 `availableStock=20`，小程序日历和票务报价均可见；票种“预定须知”和确认单字段优先展示后端商品/SKU 规则，0 元票和免实名快速通按已选数量提交，不再被金额或本地强制实名判断拦截。
- 门票确认单、创建订单和订单详情已切统一订单真实接口；确认单首屏确认接口失败时展示“门票订单确认暂不可用”业务阻断态，不再被通用网络异常文案吞掉，也不回退本地金额；门票创建订单成功后直接出票并跳过微信支付；`pkg-ticket` 交易类静态票种、日期、优惠、确认单、本地订单保存和模拟支付已清理，只保留非交易导览说明。
- 登录体系已收口到 `member-store`、`app-store`、`identity.ts`、`usePageRuntime()`、`PageRuntimeHost`、`LoginPopup` 和统一 loading；旧 `session-store/ui-store/pageKey` 已清理。
- NutUI、`@tarojs/plugin-html`、按需样式、`PageLayout`、`PageNavbar`、`AppTabBar`、底部安全区和页面分包基础已完成，主包体积检测走隔离构建。
- 首页已切后端广告聚合：`index_top_banner/index_nav_grid/index_schedule/index_hot_project/index_activity/index_recommend/index_member_benefit/index_play_life` 覆盖对应楼层，广告点击统一走 `src/core/utils/ad-click.ts`。
- 首页楼层“查看全部”按 `slotCode/title` 请求 `/api/bff/content/mini-program/slots/{slotCode}/ads`；活动、项目、节目单详情按广告 `id` 回查详情，正文只原样传 `richTextHtml/richText` 给 `RichText`。
- 2026-06-08 已通过后台真实接口补齐 `pagecode=index` 首页资源位：顶部 Banner 5、八大导航 8、节目单 1、热门项目 2、精选活动 1、精彩推荐 2、会员福利 1、吃喝玩乐 9。
- 2026-06-09 已重接会员授权接口：`login` 只换 BFF token，`member/status` 统一判断会员登录态；手机号授权、资料、头像、会员码、会员中心、领券中心和 K 币兑换均只读真实 CRM 入口。
- 2026-06-09 已重接酒店与统一订单 BFF：酒店首页、房型详情、确认单、下单支付、订单列表、订单详情、取消和退款切真实接口；接口失败、缺支付参数或缺配置进入异常态或阻断态。
- 2026-06-16 已按后端 `origin/uat@abbe80b` 建立小程序优惠券 BFF 必须接口清单；2026-06-18 00:36 复核最新 `origin/uat@4047a42`，源码已补 CRM 会员券实例与 promotion 会员券资产同源同步，并补 `available` 商品/SKU/日期过滤；最新三个提交未补促销 quote 目标过滤。当前阻塞从“源码同源未补/available 缺入参”转为“缺目标券号严格探针、订单试算/确认目标规则校验确认和退款返还精确幂等口径”。
- 2026-06-18 03:35 复核最新 `origin/uat@ee74bd6`，订单试算/确认目标规则和退款返还幂等源码已补；当前阻塞收敛为目标券号严格探针、管理端 `target_ids` 同步、真实已核销券退款返还样本、商城展示 BFF 500 和购物车详情 500。
- 近期校验：本轮票务闭环恢复已通过 `yarn typecheck`、`yarn check:package-boundary`、`yarn check:page-convention`、`git diff --check` 和根目录 `node scripts/check-codex-context.mjs`；`project.config.json`/`dist/project.config.json` AppID 均为 `wx72b9e08ce45d3e79`；小程序阶段性验收按 `$mp-verify` 复用本对话已打开的 hkitty 微信开发者工具和当前 dev 编译，不再用 `build:weapp` 作为本轮收尾门禁，也不为同一对话反复打开新的当前项目 DevTools 窗口。`yarn check:main-package:build` 曾按隔离输出目录执行，但本地 Taro/Rust `system-configuration` panic 后长时间无新增输出，已停止，需下一次本地环境恢复后再复验主包产物和页面可见状态。

## 当前待验证

- 在微信开发工具中确认 BFF 授权、`member/status`、手机号授权、登出、资料保存和签名写接口，重点验证 token 过期 refresh、请求重放和会员态同步。
- 在微信开发工具网络面板确认购票列表、票务日历、购票资源位、广告、酒店、订单和优惠券接口均携带小程序 `Authorization`，真实链路失败时进入异常态、空态或阻断态。
- 用真实登录态验证门票加购、0 元票/免实名快速通提交、订单创建即出票、`ticketVouchers` 展示，以及酒店首页、房型、确认单、下单支付、订单列表和详情。
- 验证首页优惠券数量、签到/会员入口登录弹窗续执行、会员码二维码 canvas、页面唯一 loading、tabBar、自定义 navbar 和弹层覆盖。

## 恢复命令

```bash
cd /Users/kite/Desktop/vibe-coding/codex/hkitty-fe/mini-program
nvm use
yarn dev:weapp
```

```bash
yarn typecheck
yarn check:package-boundary
yarn check:main-package:build
```

## 不要忘记

- 用户已经在微信开发工具里打开了项目。
- 不要把登录弹窗当作 H5 全局 DOM 使用；不要把 loading 计数放进全局 store 或 pageKey 注册表，页面通过 `usePageRuntime()` 控制本页唯一 loading。
- 不要让本地 mock 地址、示例地址或 `mock`、`CSESSION`、`V2`、`Taro`、技术栈名、开发态等内部字眼出现在界面里；任一真实接口链路不得继续展示旧 mock 或静态业务数据。
