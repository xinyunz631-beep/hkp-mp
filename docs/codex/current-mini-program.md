# 当前小程序状态

## 2026-07-01 恢复基线

- 更新时间：`2026-07-02 20:04 CST`
- 当前工作分支：`master`，跟踪 `origin/master@e37a537 fix(member): 领券中心只保留一键领取`。原本停留的 `feature/hkp-mini-mall-commercial-flow` 没有领先 `origin/master` 的唯一提交，后续小程序承接从 `master` 开始。
- 分支判断：`origin/feature/free-claim-activity-center-20260629` 已完全合入 `origin/master`；`origin/feature/hkp-mini-coupon-chain-20260616` 和 `origin/feature/mp-coupon-closure` 都大幅落后 master，仅保留为历史参考，不整支合并。
- 已实现只验证：订单支付取消后旧订单复用已由 `8a1fa2f fix(order): 修复支付取消后旧订单复用` 修复，BFF `a3b68f3 fix(order): 修复支付取消后重复拉起失败` 已配合；恢复时先跑 `node scripts/check-payment-cancel-flow.mjs` 和真实链路验证，不重复重写。
- 已实现只验证：会员绑定、优惠券状态筛选、领券中心入口和会员权益资料授权已由 `d29df8d`、`3392391`、`5b4790e` 覆盖，并对应 BFF `099904d`、`cc2d816`、`06189ed`；后续只按真实账号验证。
- 已实现只验证：商城收藏回显和券样式已由 `071df79` 覆盖，并对应 BFF `4f42737`；后续验证商品收藏状态回显、收藏切换和券样式，不回滚到旧商城分支。
- 当前 BFF `origin/uat@47e4ca1` 新增/调整的前端可见点包括新人注册礼五张券校验、商品收藏状态、老会员绑定服务端解手机号、老会员同手机号提示、会员档案/订单工作台显示名、订单风险自动入库、枚举展示/缓存时效、支付取消重复拉起和全等级会员权益；小程序 `c4f96d1/8de29b4/e37a537` 已继续合入老会员授权 code、订单地址缓存时效和领券中心一键领取收口，后续按真实账号和商城/订单运行态验证。
- 2026-07-01 客服与电话口径已收口：全局客服入口统一走网易七鱼插件封装，`appKey` 未配置时提示 `请先完成网易七鱼配置`；酒店链路固定拨打 `4009778899`，门票链路固定拨打 `400-668-2026`，广告明确电话和物流官方电话保留拨号；用户取消微信拨号时不再 toast 或复制电话。
- 2026-07-01 活动详情图收口：`pkg-ticket` 活动详情页只按接口字段取图，顺序为 `materialImage`（后台详情图语义）-> `backgroundImage` -> `detailImageUrl`；已移除 `src/assets/activity-banners` 本地分类图和分类识别兜底，避免活动页静态 JPG 进入主包。
- 2026-07-01 首页八宫格 icon 收口：首页快捷入口只消费 `index_nav_grid` 广告位图片字段，不再按标题匹配 `src/assets/home-shortcut-icons` 本地 PNG 兜底；运营需在广告位配置对应 icon 图。
- 2026-07-01 优惠券详情页布局收口：`pkg-member/pages/coupon-detail` 底部操作条改走 `PageShell.footer`，由 `PageLayout` 统一测量固定底部和内容占位；券面改为白底轻粉边框，品牌粉只保留在金额、状态和左侧点缀。
- 2026-07-02 领券中心好券推荐交互收口：免费领券活动卡保留活动级“一键领取”，领取成功后停留当前页刷新，活动按钮已领取态跳“我的优惠券”；活动下方单券改为更大的券条展示，已领取单券有券号时直接进入对应券详情，不再跳转前请求会员券列表，未领取单券不单独发券。小程序继续使用现有 `/api/bff/activity-center/free-claim-activities/**`，不新增接口。
- 2026-07-02 免费领券已领子券券号回传适配：后端 `origin/uat@47a04f4 fix(promotion): 回传免费领券子券券号` 已在活动列表/详情 `giftItems[]` 已领子项返回 `couponNo/couponNos[]/couponInstances[]`；小程序现有 `resolveGiftCouponNo()` 已兼容这些字段，已领取子券点击直接跳 `/pkg-member/pages/coupon-detail/index?id=<couponNo>`，无需新增跳转前请求或券详情接口。
- 2026-07-02 会员码页按品牌稿调整视觉：导航标题改为 `Hello Kitty Park`，主视图背景固定使用 `https://image.hellokittypark.cn/10000_kitty_theme_2ab24dff-c907-45bb-a3e3-7902b1227530.png` 并纵向平铺，Logo 固定使用 `https://ty.hellokittypark.cn/admin/static/03_ALL_IP__PNG_GROUP_LOGO__MX_TP_GR_3.62d4b9d1.png`，页面仅调整 Logo 叠放、白卡比例和二维码留白，会员码接口与 30 秒刷新逻辑不变。
- 2026-07-02 券码兑换主线复核：后端 `origin/uat@f4d99b3 fix(admin-config): 同步券码到小程序兑换表` 已把管理后台生成/导入的 `couponNo` 同步为小程序 `/api/bff/promotion/coupons/exchange` 的 `exchangeCode`，小程序页面无需新增接口；本轮只把会员中心入口文案统一为“兑换券码”，并给 `scripts/probe-coupon-closure.mjs` 增加 `COUPON_PROBE_COUPON_CODE_EXCHANGE=1 + COUPON_PROBE_EXCHANGE_CODE=<后台导出 couponNo>` 的直接券码兑换探针，便于拿 UAT 登录态验证“后台生成/导出 -> 小程序兑换 -> 我的券/可用券同券号出现”。
- 2026-07-02 会员权益页视觉微调：会员等级胶囊抽到 `MemberLevelBadge` 并复用于首页、我的页、会员中心、会员权益和成长值明细；会员头像抽到 `MemberAvatar` 并统一头部/资料头像默认 80px；权益页和成长值明细页头像区在成长值入口用 `成长值(当前值)` 展示真实成长值，成长值明细页浅粉底色撑满页面，权益 swiper 降低高度且保持 item 100% 宽，左右和更大的底部阴影留白放到每个 swiper item 内，权益明细 `highlightText` 红色高亮展示，等级进度轴从 layout footer 移到 swiper 下方并增加两侧留白；个人信息页昵称输入已对 `confirm/blur` 双触发加防重；我的页开发票改为微信系统弹窗确认后拨打 `4009-778899`；页面接口、等级切换和成长值进度逻辑不变。

## 更新时间
- 更新时间：`2026-07-02 20:04 CST`
- 当前基础状态：登录、请求、会员状态、页面初始化闸门、页面显式 runtime hook、页面单例 loading、统一 loading 组件入口和白色渐变淡出蒙层、全局登录态弹窗、webpack5 prebundle/cache 关闭、NutUI 按需样式、`@tarojs/plugin-html` 和 `@nutui/icons-react-taro` 显式依赖、BaseSkeleton/BaseEmpty/BaseException、中性页面底色+粉色品牌点缀、自定义 tabbar、独立 PageNavbar 和页面级 header/layout 已完成代码收口并通过本地校验；系统 custom-tab-bar 已压成 0 高度占位，可见 tabbar 已下沉到页面内 fixed 底部容器，`AppTabBar` 已从 `AppIcon` 切为直接 `Image` 小图并在组件顶部集中维护图片链接。
- 当前会员/酒店/订单状态：会员授权登录已按后端真实接口重接，启动默认 `login -> member/status` 并把头像、昵称、手机号、等级统一维护到 MobX `rootStore.memberInfo`；登录弹窗只保留手机号授权和关闭；会员资料、头像上传、会员码和会员中心首页不再失败回旧会员 mock。酒店首页、房型详情、酒店确认单、酒店下单支付、订单中心列表和订单详情已切后端真实 BFF，酒店分包运行时 mock 数据文件已删除，订单中心核心列表/详情不再读取本地订单。
- 当前票务状态：门票预定页已切 `/api/bff/tickets/**`，支持快速通、草稿/待审核待上线展示、已发布库存加购、票种规则弹窗、0 元票和按 SKU 实名字段提交、无可订票种空态；小程序创建订单已把首位实名游客证件同步放入 `context.certificateNo`。后端 `origin/uat@26fbc2b/2f57b7b` 已发布批量日历接口，小程序首屏已切 `POST /api/bff/tickets/products/calendar-batch` 并按 20 个商品分批；`mp-run-check` 复用当前微信开发者工具验证 `calendar-batch` 真实请求 2 次、旧 `/calendar?startDate` 0 次。2026-06-21 16:20 显式创建探针订单 `TKT20260621162008C0110611`，`/pay` 返回 `PAYING/prepayPayNo=PAY2026062116200860c2b87e530f/hasPaymentParams=true/paymentParamsAppId=wx72b9e08ce45d3e79`，付款前详情仍无 `ticketVouchers[]` 且探针单已取消；当前待补不再是 `/pay` 预下单或日历扇出，而是真实微信支付成功后出票、订单详情券码/核销码、真实退款、后台票码实例和核销流水同单一致性。
- 最新票务补充：小程序端登录、旧预支付和统一订单 `/pay` 均统一用 `Taro.getAccountInfoSync().miniProgram.appId`，失败才兜底 `wx72b9e08ce45d3e79`；图片上传当前无 AppID 契约字段，不新增无契约参数。订单详情已补 `ticketVouchers[].qrCodePayload`、`FULFILLED/COMPLETED/SUCCESS` 票码状态、订单列表 `PART_USED` 文案、出票判断状态集、`PAYING/WAIT_USE/FULFILLING/PART_USED` 3 秒静默探针；本轮继续把 `REFUNDING/REFUND_PENDING/REFUND_PROCESSING` 纳入静默轮询，并把 `REFUNDED` 主状态文案归为“已退款”。
- 最新票务阻塞：历史旧直出票样本已证明 `WAIT_USE + ticketVouchers[]`、退款终态保护和标准回调后 `USED/FULFILLED/usedNum=1` 可被 BFF 详情回读；但当前真实微信支付后快速通本地出票、核销码展示、真实退款样本、商米/后台核销后刷新，以及 admin-config 票码实例/核销流水/订单履约视图同单一致性仍没有当前小程序用户样本。自动化验收继续跳过手机真实支付，不把支付前探针当最终闭环。
- 当前券/商城状态：优惠券链路已新增 `src/core/services/bff-coupon-api.ts`，我的券、领券中心领取、K 币余额/兑换、门票、酒店和商城确认单可用券已切真实 BFF；2026-06-18 00:36 按后端 `origin/uat@4047a42` 复核，K 币兑换、后台发券和券包赠送已从源码层同步同一 `couponNo` 到 `promotion_member_coupon`，我的券已适配分页、来源和返还状态字段，门票、酒店和商城可用券已适配 `available/unavailableReason/discountAmount` 以及 `itemIds/skuIds/visitDate/checkInDate/checkOutDate`；商城确认单已用 `selectedCouponNos` 重新确认订单并在创建订单时带同一券号；2026-06-20 已补我的优惠券详情页，列表点击券面统一进入详情，详情页展示优惠内容、状态记录和去使用入口，我的券页回到前台时会自动回源刷新并把最新快照复用给详情页，避免同一轮重复请求；小程序优惠券 BFF 后端必补文档维护在 `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/`，旧 `docs/codex/apimust/` 只保留迁移指针；券/商城仍不能宣称完整闭环，因为缺目标 `couponNo` 严格探针、管理端券模板 `target_ids` 同步、真实已核销券退款返还样本，以及后台真实商城商品后的写链路验收。
- 2026-06-23 结算核心重构 checkpoint：已在 `feature/hkp-checkout-core-refactor` 完成阶段 1-5，新增公共结算契约与 `useCheckoutController`，商城、酒店、门票确认单均收口到统一 `confirm/create/pay`、后端选券重算和支付后跳转流程；三业态仍保留各自页面、表单校验和 adapter，不合并成单一万能页面。本阶段 `yarn typecheck` 已通过，后续只在大阶段继续更新本文档。
- 2026-06-21 00:44 订单详情券事实回查链继续收口：`pkg-order/pages/detail` 不再只把订单级优惠信息渲染成纯文本。当前已把 `selectedCouponNos/appliedCouponNos/lockedCouponNos/releasedCouponNos/refundReturnedCouponNos/rejectedCoupons` 结构化成可点击的 `couponNo` 列表，订单详情现在可以直接跳到同一张优惠券详情页核对状态、来源和返还记录。后端一旦把 `GET /api/bff/orders/{orderNo}` 的订单级券号事实补齐到 UAT，这条“订单 -> 券详情”的核验链就能直接承接同券号验收；在后端未补订单详情券字段前，这一改动仍属于前向兼容，不等价于完整闭环。
- 2026-06-21 01:00 券闭环严格探针继续收口：`scripts/probe-coupon-closure.mjs` 已补 `COUPON_PROBE_ORDER_NO` 能力。现在严格探针除了校验“我的券 + 下单可用券”是否同时出现目标 `couponNo`，还可以继续拉 `GET /api/bff/orders/{orderNo}`，把 `selectedCouponNos/appliedCouponNos/lockedCouponNos/releasedCouponNos/refundReturnedCouponNos/rejectedCoupons[].couponNo` 一并纳入同券号验收。后端后续只要补齐统一订单详情券事实，就能直接用同一条探针证明“后台发券/领券/兑换 -> 下单采用 -> 订单详情回读”的三段同源；当前如果传了 `COUPON_PROBE_ORDER_NO` 但订单详情里仍看不到目标 `couponNo`，就按后端读模型未闭环处理，不允许前端宣称完成。
- 2026-06-21 01:08 券闭环严格探针继续扩到确认和返还：`scripts/probe-coupon-closure.mjs` 现在额外支持 `COUPON_PROBE_CONFIRM=1 + COUPON_PROBE_CONFIRM_PAYLOAD_FILE` 和 `COUPON_PROBE_REFUND_RETURN=1`。严格探针除了“我的券 / 下单可用券 / 订单详情”外，还能把 `POST /api/bff/orders/confirm` 的同券号采用事实，以及 `POST /api/bff/promotion/coupons/refund-return` 的返还结果拉进同一次输出；如果后端 confirm 仍只回金额不回券号、或 refund-return 回了成功却没返回同一 `couponNo`，现在都会被探针直接判成未闭环，而不是再靠人工读日志解释。
- 2026-06-21 01:36 售后到订单券详情回查链继续收口：`pkg-order/pages/aftersale-list` 和 `pkg-order/pages/aftersale-progress` 现在都补了“查看订单”入口，用户可以从售后记录或售后进度直接回到订单详情，继续查看同一笔订单里的 `selectedCouponNos/appliedCouponNos/refundReturnedCouponNos` 和对应券详情。这样退款返还链不再断在售后页本身，后端一旦补齐订单详情券事实，就能让“售后 -> 订单 -> 券详情”直接承接返还券核验。
- 2026-06-21 01:45 券详情到订单券事实回查链继续收口：`pkg-member/pages/coupon-detail` 现在会按真实 `orderNo` 补齐“查看订单”入口，使用记录区里的关联订单也已变成可点击的回查按钮。用户可以从我的券详情直接跳到对应订单详情，继续核对 `selectedCouponNos/appliedCouponNos/refundReturnedCouponNos` 和同一张券的交易状态；这条“我的券/券详情 -> 订单详情 -> 券事实”链已经前向打通，后端补齐订单详情券字段后即可直接承接严格同券号验收。
- 2026-06-21 01:51 券详情到售后返还进度继续收口：当券详情已经出现真实 `refundReturnStatus` 和 `orderNo` 时，底部现在会补齐“查看售后”入口，用户可以从我的券详情直接跳到同订单的售后进度，再回看处理状态、退款结果和订单券事实。这样“我的券/券详情 -> 售后进度 -> 订单详情 -> 券事实”这段也已经前向串起来，后端只要补齐同券号订单详情读模型和真实返还样本，就能直接承接退款返还严格验收。
- 2026-06-21 02:02 订单详情到售后记录回查链继续收口：`pkg-order/pages/detail` 现在会在已进入退款/返还阶段、或订单已经读到真实 `refundReturnedCouponNos` 时补齐“查看售后”入口，并把 `orderAftersaleList` 支持按 `orderId` 预过滤。用户现在可以从订单详情直接回到当前订单的售后记录，再继续沿“售后进度 -> 订单详情 -> 券事实”核对返还结果；这样交易侧这条链已经形成 `订单详情 <-> 售后记录/进度 <-> 券详情` 的双向承接。
- 2026-06-21 02:18 售后进度券事实回查链继续收口：`pkg-order/pages/aftersale-progress` 现在会并行读取当前订单详情里的真实券事实，把 `selectedCouponNos/appliedCouponNos/lockedCouponNos/releasedCouponNos/refundReturnedCouponNos/rejectedCoupons` 直接展示在售后进度页，并支持点券号回查到同一张优惠券详情；底部“查看售后”也改为保留当前订单过滤。这样退款返还链不再必须绕回订单详情才能看同券号，已经形成 `券详情 <-> 售后进度 <-> 订单详情 <-> 券事实` 的更紧凑核查闭环。
- 最新商城图片补充：`2026-06-20 14:41 CST` 已继续按 `$mpcode-page` 等价规范收口商城图片失败态。商品详情页 `gallery` 为空时会显式渲染 `AppImage emptyState="error"`，不再留空白 Swiper；`detailImages` 现已合并富文本里的 `img src`，详情区不再 `slice(1)` 丢掉首张图，纯图片详情、错图详情或只有一张详情图时都会看到可见失败态；当富文本和详情图都为空时，详情区会展示统一图片失败占位。商城搜索、商城确认单、订单列表和订单详情票码二维码也都补齐了 `emptyState="error"`，避免真实图片缺失时出现白屏。当前本轮轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`git diff --check`。
- 最新券/商城复核：2026-06-19 后端已复拉到 `origin/uat@f56a059 docs(frontend-api): 回填多业态券场景 UAT验证结果`；`212a323/839f4a5` 把 K 币兑换商品限定为 `item_type='EXCHANGE'` 并回填 UAT 文档，防止误把领券中心 COUPON 域入口当作 K 币兑换商品消费，和小程序已把 K 币 tab 改读 `GET /api/bff/crm/entries/exchanges` 的口径一致；`e3b4d3c` 只优化后台会员查询性能；`54fcd24/6e3623a` 已把后台折扣券模板同源字段同步到 promotion 的 `discountPercent/maxDiscountCent`，小程序已承接我的券、领券中心和下单可用券折扣券券面展示；`248198f/f56a059` 已把多业态/多场景券同源放宽为 promotion `sceneType=ALL`，小程序不复制票种规则或本地造跨业态过滤。`a0341e2` 已补 promotion 读取/可用券/退款返还前自动回填历史 CRM 会员券到 `promotion_member_coupon`，`3cdc8b4/7eb18be` 已关闭发券任务 READY 假闭环，但 22:18 再次复拉后端仍无新提交，严格探针 `coupon-goal-readiness-f56a059-20260619-01..04` 仍是四个接口 200 且当前会员无券、无券包、K 币 0，目标券 `CP1781194544162039A54BA` 不在我的券和下单可用券。管理端必补文档已推到 `feature/admin-business-platform@83774ec`，记录了管理端会员资产 `latestCouponNo=CP1781194544162039A54BA` 与小程序 BFF 读 0 的事实断裂。小程序当前无需强行改生产代码，`yarn typecheck`、`yarn check:package-boundary`、`yarn check:page-convention` 和 `git diff --check` 已通过；完整闭环仍等待后端补 UAT CRM 动作字段配置或数据迁移、成功领取/兑换样本、目标 `couponNo` 严格探针、管理端券模板 `target_ids`、真实已核销券退款返还样本，以及后台真实商城商品后的详情、加购、购物车写入、统一订单与用券验收。
- 恢复优先级：下一步优先完成优惠券链路微信开发工具验收，并用目标会员、目标 `couponNo` 或可发券 K 币兑换 `itemNo` 跑严格探针；没有目标样本前，只能证明 BFF 可达，不能证明“后台发券或 K 币兑换后小程序可见可用”。微信开发工具仍需验证真实 BFF 授权响应、`member/status` 登录态判断、手机号授权 `code`、资料保存签名、退出登录、首页广告聚合、门票预定页加减号和提交出票、酒店首页/房型/确认单/下单支付、订单中心列表/详情、我的券、领券中心领取、K 币兑换、门票/酒店用券、页面内自定义 tabbar 跳转/选中态、弹层覆盖关系和自定义 navbar 安全区表现。
- 恢复时先看：根目录 `codex/current/current-task-list.md`、`codex/current/current-mini-program.md`、本文件，以及 `mini-program/AGENTS.md`、`mini-program/CONSTRAINTS.md`。
## 技术与端约束
- 基础依赖：Taro `4.2.0`、React `18.3.1`、MobX `6.15.0`、mobx-react `9.2.1`。
- 全局 UI 主题：Taro `mini.sassLoaderOption.additionalData` + `src/styles/tokens.scss`，主题色粉色 `#ec6d9c` 只用于品牌按钮、选中态和重点氛围；页面、layout、骨架屏和基础状态组件默认使用中性浅灰/白色底；NutUI 样式通过 `babel-plugin-import` 按需引入，并依赖 `@tarojs/plugin-html@4.2.0`；图标优先使用 `@nutui/icons-react-taro@1.0.5`。
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
- 门票创建订单接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/orders`，需小程序登录态 Bearer，不需要 HMAC 签名；`sceneType=TICKET` 创建成功后返回待支付订单和应付金额，不再直接生成 `BYPASS_` 免支付流水或立即调用智游宝出票；当前小程序会在 `context.certificateNo` 同步首位实名游客证件，并在创建成功后继续调用 `/pay`。2026-06-19 21:22 运行态已验证创建待支付订单成功：订单 `TKT20260619212212B6FB3624`、payableAmountCent=6120；但 `/pay` 仍返回 `/api/pay/prepay failed`。支付成功后应由 pay-service MQ 推动 order-service 确认优惠/库存并调用智游宝出票。内部 `GET /api/order/thirdparty/zhiyoubao/orders/{orderCode}/check-status` 主动查询后仍会同步 order-service 履约。当前剩余缺口是后端恢复预支付、微信开发工具真实支付后出票复验、真实支付退款样本、后台票码实例和核销流水同步，以及后端是否把主动查询同步接入定时任务或 BFF/后台触发链路。
- 门票订单详情轮询：票务订单详情只要处于 `TICKET` 场景且订单仍为 `PAID/WAIT_USE/FULFILLING/PART_USED/PARTIALLY_USED` 等未终态，每 3 秒后台静默重读 `GET /api/bff/orders/{orderNo}`；轮询不以已有入园凭证为前提，失败不弹窗、不展示 loading，状态指纹不变不触发页面重渲染；探针响应只用于比较订单状态、主操作或票码状态/次数/二维码是否变化，发现变化后必须再调用正常订单详情刷新入口更新页面，不允许直接用探针响应渲染；必须同时覆盖异步出票前无券码、停留券码页被扫码核销不会触发 `onShow`、部分核销后继续刷新这三类场景。2026-06-18 15:18 同单标准化智游宝回调后，`GET /api/bff/orders/{orderNo}` 已回读 `USED/FULFILLED/usedNum=1`，证明轮询数据源能承接核销后状态。
- 门票支付接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/orders/{orderNo}/pay`，需小程序登录态 Bearer，不需要 HMAC 签名；`PENDING_PAYMENT/PAYING` 门票订单必须返回 `prepay.payNo` 和 `prepay.paymentParams/payParams`，非待支付状态重复调用返回 `ORDER_PAYMENT_NOT_ALLOWED`。历史 UAT 曾返回预支付参数，但 2026-06-19 21:22 最新探针订单 `TKT20260619212212B6FB3624` 的 `/pay` traceId=`ticket-after-f56a059-20260619212212-06` 仍为 `/api/pay/prepay failed`；Node 探针不会完成微信支付，完整闭环必须等 `/pay` 稳定返回参数后，用微信开发工具真实支付并刷新订单详情读取 `ticketVouchers[]`。
- 我的优惠券接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/member/coupons`，需小程序登录态；必须返回分页、状态、`couponNo`、券面、适用业态、退款返还状态，并与领券、K 币兑换和券包发券同源。
- 我的券包接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/member/coupon-packages`，需小程序登录态；券包内券必须能按同一 `couponNo` 出现在我的券和下单可用券。
- 领券接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/promotion/coupons/claim`，需小程序登录态 + HMAC 签名；当前后端真实入参为 `templateNo`，小程序不提交会员身份字段。
- 下单可用券接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/promotion/coupons/available`，需小程序登录态；后端最新 `origin/uat@2e44302` 已复核且无券接口变化，其中 `27c68ed` 补齐 `itemIds/skuIds/visitDate/checkInDate/checkOutDate`，`ad09fb4` 已补订单 confirm / promotion quote 候选目标校验；必须读取与我的券同源的 `couponNo`，门票/酒店/商城确认单选择后通过统一订单 `selectedCouponNos` 重新确认金额。
- K 币余额接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/member/kcoin/balance`，需小程序登录态。
- K 币流水接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/member/kcoin/ledgers`，需小程序登录态。
- K 币兑换接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/member/kcoin/exchanges`，需小程序登录态 + HMAC 签名；请求只传 `itemNo/quantity/idempotencyKey`。当前后端源码已在写 `crm_member_coupon_instance` 后同步同一 `couponNo` 到 `promotion_member_coupon`，但本地登录会员 K 币余额为 0 且无目标兑换样本，未跑写入严格探针前不能宣称“兑换券可下单使用”。
- 优惠券退款返还接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/promotion/coupons/refund-return`，需小程序登录态 + HMAC 签名；后端 `63e88b5` 已补 `userId + idempotencyKey` 幂等冲突处理，仍需真实已核销券验证返还后我的券和下单可用券状态一致。
- 商城展示接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/mall/home/products/categories/recommendations/gifts/available`，需小程序登录态；`beb169c/c379081` 已修复空态 500，当前 UAT `mall-after-e3138d9-01..05` 均 200 空数组/空分页，页面只允许真实接口空态或异常态，不回退本地商城数据。
- 商城购物车接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/mall/cart`、`GET https://hellokitty-uat.yoursite.xin/api/bff/mall/cart/count`、`POST/PATCH/DELETE https://hellokitty-uat.yoursite.xin/api/bff/mall/cart/items`，GET 登录态、写接口登录态 + HMAC 签名；当前 `mall-after-e3138d9-06..07` 均 200，`cart` 返回 `groups/items/summary/totalQuantity/recommendProducts` 空结构，写入链路仍待后台真实商品样本验收。
- 业务成功码：`200`
- 普通业务接口 header 只默认带 `Authorization: Bearer <token>`。
- 授权登录/刷新不带业务访问令牌；高风险 BFF 写接口通过 `sign: true` 自动携带 HMAC 签名头；开发版/体验版统一接口日志保留 request/response、URL、状态和耗时，并脱敏鉴权签名字段。
- 统一 request 层已接入 accessToken 过期自动刷新：业务接口返回 `AUTH_TOKEN_EXPIRED`、`AUTH_TOKEN_INVALID`、HTTP `401` 或旧 `10008` 时，优先调用 `/api/bff/auth/refresh` 换新 `accessToken/refreshToken/signSecret`，然后自动重放原请求一次；多个接口同时过期时共用同一个刷新 Promise。
- Feishu 主文档 13 个 BFF 对外入口已落到 `src/core/services/bff-api.ts` 和请求/登录层；截至后端 `936aa38/00486d4`，除登录和刷新外所有小程序 BFF 业务接口均需登录态，GET 只校验 `Authorization`，不需要签名；购票列表、购票页资源位、首页广告聚合、资源位广告列表、单广告详情、酒店目录和订单中心均走默认 request 先拿 token；已进入真实接口联调的页面、资源位或业务链路，接口失败、字段缺失或配置缺失时必须进入异常态、空态或阻断态，不回退旧本地业务数据；字段和鉴权以 Feishu 主文档、OpenAPI、uat 后续变更记录和 BFF 最新安全配置为准。
- 后端 `c06ca8f` 已移除 `/api/bff/cms/**` 公开白名单；小程序购票页资源位已改走 `/api/bff/purchase/resources`，单个 CMS 资源位查询默认带登录态，不再按免登录接口调用。
- 后端 `v0.1.9`/`v0.1.10` 已将小程序登录请求体、`Content-Type`、JWT 签发和 Redis 登录态存储异常转为明确错误码；小程序统一 request 已为 JSON 写请求默认补 `content-type: application/json`，仍需微信开发工具用真实 code 复测登录和刷新响应。
- CRM 已新增 `src/core/services/bff-crm-api.ts`；会员状态、会员资料、会员码、会员中心首页、头像上传和老会员绑定已按真实接口重接，会员资料链路不再失败回本地会员 mock；CRM 入口路径已从 `/api/bff/crm/p1/**` 改为 `/api/bff/crm/entries/**`；资料保存、地址写操作和老会员绑定走 request `sign: true`，待微信开发工具真实登录态验证。
- 订单已新增 `src/core/services/bff-order-api.ts`，覆盖旧提交兼容、统一订单确认、统一订单创建、支付、取消、退款、列表和详情 BFF 入口；酒店确认单、酒店下单支付、订单中心列表和订单详情已切真实接口；票务确认单、创建订单、真实微信支付、支付后 `ticketVouchers` 展示已按后端真实链路接入，且创建请求已补 `context.certificateNo` 兼容当前后端证件读取；商城确认单已接统一订单 `confirm/create/pay`，并接入商城可用券选择和 `selectedCouponNos` 传参；订单详情已补票务未终态 3 秒后台静默轮询。后端 `origin/uat@d92be1e` 已解除履约表约束阻塞，把智游宝 `img` 映射到 `codeImage/qrImage`，返回可渲染 data URI，避免退款后迟到核销回调覆盖退款终态，并在内部主动查询智游宝核销状态后同步 order-service 本地履约；同时撤回门票创建后免支付出票，要求小程序通过 `/pay` 拉起真实微信支付。2026-06-19 `origin/uat@2e44302` 后 UAT `/pay` 曾返回微信预支付参数，16:44 探针证明支付参数 AppID 正确；21:22 `origin/uat@f56a059` 复跑证明票务 `products/calendar/quote/confirm/create` 均为 200，但最新订单 `TKT20260619212212B6FB3624` 的 `/pay` traceId=`ticket-after-f56a059-20260619212212-06` 仍返回 `/api/pay/prepay failed`。小程序继续按缺支付参数阻断且不模拟支付成功；下一步先等后端恢复 pay-service 预下单稳定，再在微信开发工具完成真实支付后复验出票和订单详情券码。小程序无需新增 `rawFields.img` 页面依赖，也不能直接调用内部 order-service 同步入口；商城仍需后台真实商品和目标券样本后复验详情、加购、购物车写入、统一订单创建支付和用券。
- 小程序优惠券 BFF service 已新增 `src/core/services/bff-coupon-api.ts`，我的券、券包、领券、可用券、K 币余额、K 币流水和 K 币兑换统一收口；会员券页、领券中心、兑换详情、门票确认单、酒店确认单和商城确认单已接入真实 BFF。后端必补接口文档维护在 `admin-frontend/docs/codex/admin-api-requirements/mp-bff-requirements/README.md`、`mp-bff-interface-design-guidelines.md`、`mp-bff-all-interface-inventory-2026-06-19.md`、`mp-bff-module-interface-audit-2026-06-19.md`、`coupon-bff-required-interfaces-2026-06-16.md`、`coupon-bff-required-interfaces-2026-06-17.md`、`coupon-bff-required-interfaces-2026-06-18.md`、`coupon-bff-required-interfaces-2026-06-19.md`、`coupon-full-chain-acceptance-runbook-2026-06-17.md`、`ticket-booking-bff-required-interfaces-2026-06-19.md` 和 `route-api-map.md`；后续新增页面或接口必须同步更新 admin 目录下的小程序路由映射。小程序 `docs/codex/apimust/` 只保留迁移指针；管理后台券服务缺口仍只维护在 `admin-frontend/docs/codex/admin-api-requirements/coupon-service.md`；小程序侧券闭环复验命令为 `yarn probe:coupon-closure`，严格验收需传 `COUPON_PROBE_EXPECT_COUPON_NO` 或显式打开领券/K 币兑换写入开关。
- 小程序广告已新增 `src/core/services/mini-program-ad.ts` 和 `src/core/types/mini-program-ad.ts`，首页 `src/pages/home/index.tsx` 已读取 `/api/bff/content/mini-program/ads?pagecode=index`，按 `slotCode` 覆盖顶部轮播、八大导航、节目单、热门项目和吃喝玩乐；顶部轮播优先使用 `index_top_banner`，无数据才兼容旧 `index_banner`。广告聚合和详情请求均先完成小程序授权并携带 `Authorization`，接口失败、核心资源位缺失或详情无数据时进入异常态，不再回退旧本地内容。
- 2026-06-07 已完成首页顶部 banner 真实闭环：使用后台账号真实登录，调用 `/api/admin-config/files/images` 上传 `Desktop/HKP/banner` 下 5 张 JPG，再调用 `/api/content/mini-program/ads` 保存到 `index_top_banner` 资源位；后端已恢复小程序广告 BFF 鉴权，后续验收必须在微信开发工具网络面板确认广告聚合请求携带小程序访问令牌。
- 2026-06-16 23:00 微信开发工具复核：当前 hkitty 小程序窗口 AppID 为 `wx72b9e08ce45d3e79`，项目路径为 `mini-program/dist`，进入 `pkg-ticket/pages/ticket-booking/index` 后 `login`、`member/status`、首页广告、购票资源位和票务商品接口均返回 200；日历接口本次只按已发布商品唯一请求 5 次，`MENU_TICKET_CHILD_1DAY`、`TICKET_FAST_PASS_SIGHTSEEING_TRAIN`、`MENU_TICKET_ADULT_1DAY`、`TICKET_FAST_PASS_WATER_RIDE`、`MENU_TICKET_FAMILY_2P1C` 各 1 次，未再出现同一 `TICKET_FAST_PASS_SIGHTSEEING_TRAIN/calendar` 连打 10 次。页面可见状态为水上项目快速通 2026-06-16 `余票 20` 且加号视觉可用，观光小火车快速通和常规门票因当天库存 0 显示已售罄并禁用加号，草稿/待审核快速通显示待上线；受 Computer Use 坐标和 DevTools 可访问性限制，本次未自动确认点击水上项目快速通加号后的数量递增，也未提交订单。遗留告警包括购票资源位图片 `https://hellokitty-uat.yoursite.xin/ng/2f87c96....jpg` 返回 404、Taro/微信生成层 `scroll-view padding property is not yet supported`、DevTools 内部偶发 `clickCheckTask`、`undefined is not iterable` 和 `webviewScriptError`，暂未定位到票务接口失败。
- 2026-06-17 01:25-09:58 复用本对话已打开的 hkitty 微信开发者工具登录态复核 UAT：`/api/bff/tickets/products?size=100` 返回 10 个小程序渠道商品，当前代码只对 5 个已发布商品各请求 1 次日历，草稿快速通不请求日历，未再出现同一 `TICKET_FAST_PASS_SIGHTSEEING_TRAIN/calendar` 连打 10 次；同日已补强 ticket-booking 请求缓存，短 TTL 只淘汰已完成结果，进行中的同 `productCode+dateRange` 日历请求一直复用，避免慢接口或页面初始化补偿触发同一 calendar 连打；最初今天至未来 30 天 `availableStock>0` 均为 0 条，当前门票页加号禁用归因为后台库存未配置。随后用后台单日库存编辑能力把 `TICKET_FAST_PASS_WATER_RIDE~TICKET_FAST_PASS_WATER_RIDE_standard~2026-06-17~default` upsert 为 `publishStatus=published`、`saleStatus=onSale`、`totalStock=20`、`availableStock=20`，小程序日历回读同日库存为 20，`POST /api/bff/tickets/quote` 返回 `availableStock=20/payableAmountCent=6800`。票务统一订单请求已固定带 `channel=MINI_PROGRAM` 和未选券时 `selectedCouponNos=[]`；继续走统一订单确认时，`POST /api/bff/orders/confirm` 和直连 `POST http://47.99.149.184:8081/api/order/orders/confirm` 均返回 `INTERNAL_ERROR /api/order/orders/confirm failed`；后续同一 session 经 `/api/bff/auth/refresh` 换新 token 后重放同 payload 仍失败；根探针现已为每步携带并输出 `X-Trace-Id`，本次可按 BFF `ticket-closure-mqheimzs-03`、order ticket/mall/hotel 对照 `ticket-closure-mqhf580u-04`/`ticket-closure-mqhf580u-14`/`ticket-closure-mqhf580u-15` 查日志；`TICKET_PROBE_ORDER_DIAGNOSTICS=1` 直连验证缺日期/零数量仍能返回 400，ticket/mall/hotel 三类 catalog mapper 对照均 500，直连 promotion quote 成功返回早鸟九折 `payableAmountCent=6120`；只读 JDBC 复核 UAT DB 已确认 catalog SQL 均因 `park_order_inventory_lock` 不存在报 `42P01`，后端需补齐 order-service `V3__extend_order_lifecycle.sql` 表、索引和权限后再复验，这不是小程序字段、BFF 签名、票务日历、登录态或促销 quote 能力缺失。
- 2026-06-17 23:50 只读执行 `yarn probe:coupon-closure`：复用 `/tmp/hkitty-ticket-closure/mini-session.json`，`member/coupons`、`promotion/coupons/available?sceneType=TICKET&orderAmountCent=6800`、`member/coupon-packages`、`member/kcoin/balance` 均返回 200，traceId=`coupon-closure-mqi8yfp8-01..04`；当前会员 `couponCount=0`、`available couponCount=0`、`packageCount=0`、`availablePoints=0`，只能证明券 BFF 可达，不能证明后台发券或 K 币兑换券同源闭环。严格验收必须用 `COUPON_PROBE_EXPECT_COUPON_NO=目标券号 COUPON_PROBE_STRICT=1 yarn probe:coupon-closure` 证明同一券号同时出现在我的券和下单可用券；如要验证 K 币兑换，还需目标 `itemNo` 和足够 K 币余额后显式打开写入开关。
- 历史探针压缩：2026-06-18 至 2026-06-19 多次后端复拉和只读探针已证明券/商城基础 BFF 可达，但当前会员长期无目标券、无券包、K 币为 0；券闭环仍需目标 `couponNo`、订单详情券事实、退款返还样本和真实商城商品写链路，旧逐次 trace 明细只作为历史排障索引，不再放在 current。
- 历史票务压缩：2026-06-18 后端撤回免支付出票，门票恢复真实微信支付；小程序已移除 `paymentSkipped` 并以支付后订单详情 `ticketVouchers[]` 为准。2026-06-19 曾验证 `/pay` 可返回真实预支付参数，但完整闭环必须复用当前 hkitty 微信开发者工具完成真实支付，确认订单详情进入 `WAIT_USE/FULFILLING` 并返回可用券码/核销码。
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
- 门票确认单、创建订单和订单详情已切统一订单真实接口；确认单首屏确认接口失败时展示“门票订单确认暂不可用”业务阻断态，不再被通用网络异常文案吞掉，也不回退本地金额；门票创建订单成功后调用 `/pay` 拉起真实微信支付，缺支付参数直接阻断，不跳过支付也不模拟支付成功；`pkg-ticket` 交易类静态票种、日期、优惠、确认单、本地订单保存和模拟支付已清理，只保留非交易导览说明。
- 登录体系已收口到 `member-store`、`app-store`、`identity.ts`、`usePageRuntime()`、`PageRuntimeHost`、`LoginPopup` 和统一 loading；旧 `session-store/ui-store/pageKey` 已清理。
- NutUI、`@tarojs/plugin-html`、按需样式、`PageLayout`、`PageNavbar`、`AppTabBar`、底部安全区和页面分包基础已完成，主包体积检测走隔离构建。
- 首页已切后端广告聚合：`index_top_banner/index_nav_grid/index_schedule/index_hot_project/index_activity/index_recommend/index_member_benefit/index_play_life` 覆盖对应楼层，广告点击统一走 `src/core/utils/ad-click.ts`。
- 首页楼层“查看全部”按 `slotCode/title` 请求 `/api/bff/content/mini-program/slots/{slotCode}/ads`；活动、项目、节目单详情按广告 `id` 回查详情，正文只原样传 `richTextHtml/richText` 给 `RichText`。
- 2026-06-08 已通过后台真实接口补齐 `pagecode=index` 首页资源位：顶部 Banner 5、八大导航 8、节目单 1、热门项目 2、精选活动 1、精彩推荐 2、会员福利 1、吃喝玩乐 9。
- 2026-06-09 已重接会员授权接口：`login` 只换 BFF token，`member/status` 统一判断会员登录态；手机号授权、资料、头像、会员码、会员中心、领券中心和 K 币兑换均只读真实 CRM 入口。
- 2026-06-09 已重接酒店与统一订单 BFF：酒店首页、房型详情、确认单、下单支付、订单列表、订单详情、取消和退款切真实接口；接口失败、缺支付参数或缺配置进入异常态或阻断态。
- 2026-06-16 已按后端 `origin/uat@abbe80b` 建立小程序优惠券 BFF 必须接口清单；2026-06-18 00:36 复核最新 `origin/uat@4047a42`，源码已补 CRM 会员券实例与 promotion 会员券资产同源同步，并补 `available` 商品/SKU/日期过滤；最新三个提交未补促销 quote 目标过滤。当前阻塞从“源码同源未补/available 缺入参”转为“缺目标券号严格探针、订单试算/确认目标规则校验确认和退款返还精确幂等口径”。
- 2026-06-18 12:36 复核最新 `origin/uat@e3138d9`，本次新提交不改券或商城 BFF；订单试算/确认目标规则、退款返还幂等源码和商城空态 200 已补，当前阻塞收敛为目标券号严格探针、管理端 `target_ids` 同步、真实已核销券退款返还样本，以及真实商城商品后的详情、加购、购物车写入、统一订单和用券验收。
- 2026-06-19 13:49 已补商城确认单用券：`src/pkg-order/services/checkout.ts` 通过 `GET /api/bff/promotion/coupons/available?sceneType=MALL` 读取商城可用券，选券后用 `selectedCouponNos` 重新调用统一订单确认，`POST /api/bff/orders` 创建时带同一券号；`src/pkg-order/pages/checkout/index.tsx` 复用 `CouponSelectionPopup`，不再只展示自动匹配说明。本轮 `yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`git diff --check` 通过；Computer Use 两次返回 `codex app-server exited before returning a response`，微信开发工具页面验收未能确认。
- 近期校验：本轮票务闭环恢复已通过 `yarn typecheck`、`yarn check:package-boundary`、`yarn check:page-convention` 和 `git diff --check`；`project.config.json`/`dist/project.config.json` AppID 均为 `wx72b9e08ce45d3e79`；小程序阶段性验收按 `$mp-verify` 复用本对话已打开的 hkitty 微信开发者工具和当前 dev 编译，不再用 `build:weapp` 作为本轮收尾门禁，也不为同一对话反复打开新的当前项目 DevTools 窗口。根目录 `node scripts/check-codex-context.mjs` 当前仍被管理后台既有 `current-admin-frontend.md` 行数超限阻断；`yarn check:main-package:build` 曾因本地 Taro/Rust `system-configuration` panic 停止，需环境恢复后复验。
## 当前待验证
- 在微信开发工具中确认 BFF 授权、`member/status`、手机号授权、登出、资料保存、签名写接口、token 过期 refresh 和请求重放；网络面板确认购票、广告、酒店、订单和优惠券接口携带 `Authorization`。
- 真实登录态验证门票加购、0 元票/免实名快速通提交、`/pay`、真实微信支付、支付成功后 `ticketVouchers` 展示、核销后 3 秒静默刷新，以及首页、会员、酒店、订单、优惠券、tabBar、navbar 和弹层覆盖。

## 恢复命令
```bash
cd /Users/kite/Desktop/vibe-coding/codex/hkitty-fe/mini-program
nvm use
yarn dev:weapp
yarn typecheck
yarn check:package-boundary
yarn check:main-package:build
```

## 不要忘记
- 用户已经在微信开发工具里打开了项目；本对话内验证必须复用该 hkitty DevTools 窗口，不重复打开新的当前项目窗口，不跑 `build:weapp`。
- 登录弹窗不得当作 H5 全局 DOM 使用，loading 不进全局计数或 pageKey 注册表；界面不得出现本地 mock 地址、示例地址或 `mock`、`CSESSION`、`V2`、`Taro`、技术栈名、开发态等内部字眼。
