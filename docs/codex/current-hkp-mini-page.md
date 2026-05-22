# HKP 小程序全页面工程恢复检查点

## 当前状态

- 更新时间：`2026-05-21`
- 当前阶段：`Phase Mall Commercial - 商城链路商用级优化`
- 当前分支：`feature/hkp-mini-mall-commercial-flow`
- 基线提交：`a3e7b21 feat: polish mini program commercial flows`
- 最近阶段提交：`a3e7b21 feat: polish mini program commercial flows`
- 总控 Skill：`/Users/kite/.codex/skills/hkp-mini-build/SKILL.md`
- 主执行 Skill：`$mpcode-page`

## 已完成

- 已提交 `mini-program` 当前开发基线。
- 已从基线创建 `feature/hkp-mini-phase-0-prd-assets` 分支。
- 已新增 `$hkp-mini-build` 总控恢复 skill。
- 已把 `/Users/kite/Desktop/hkp/mini-page` 的 70 张 750px PNG 复制到 `docs/ui/source/hkp-mini-page/`。
- 已按业务语义重命名 UI 图，并生成 `docs/ui/source/hkp-mini-page/manifest.json`。
- 已新增 `docs/ui/pages/hkp-mini-prd.md` 作为全页面工程 PRD。
- 已更新 `docs/ui/page-registry.yaml` 顶层 HKP 工程元信息。
- Phase 0 门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- 已进入 `feature/hkp-mini-phase-1-routes-shells` 分支。
- 已补齐 HKP 全页面工程的主包入口、分包首页和业务子页面骨架。
- 已更新 `src/app.config.ts` 分包页面注册和 `src/core/constants/routes.ts` 路由常量。
- 已将早期主包入口和分包 `index` 占位页迁到 `PageShell`、`usePageRuntime`、`observer` 和 `_pg-*` 页面规范。
- 已登记页面说明文档和 `docs/ui/page-registry.yaml` 页面索引。
- Phase 1 轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- `yarn build:weapp` 已尝试执行，Taro 构建在本地长时间无新增输出并出现 `system-configuration` 运行时 panic 日志，已手动终止，后续需单独复验完整产物。
- 已进入 `feature/hkp-mini-phase-2-shared-components` 分支。
- 已新增 `src/core/types/hkp.ts` 作为商品、订单、优惠券、地址、SKU、日期等基础 DTO。
- 已新增 `src/core/services/mock.ts` 作为本地数据返回和失败兜底工具。
- 已新增 `src/core/components/commerce` 交易通用组件，包含商品卡、订单卡、优惠券卡、地址卡、固定提交栏、数量选择、筛选 Tab、SKU 弹层和日期选择。
- 已为商城、票务、酒店、餐饮、订单、会员分包补齐 `services/mock-data.ts` 和基础页面 service 返回值。
- Phase 2 门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- 已进入 `feature/hkp-mini-phase-3-mall-flow` 分支。
- 已完成商城首页、商品列表、商品详情、购物车四个核心页面的首版 UI、mock 数据和跳转闭环。
- 已补齐商城首页 service、商城页面所需 NutUI 图标外层封装，并保持 `AppImage` 空地址失败态占位策略。
- 已完成商城搜索、分类、收藏、赠品、推荐等辅助页面首版，商城分包页面流已完整可串。
- Phase 3 当前轮轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- 已进入 `feature/hkp-mini-phase-4-booking-flows` 分支，开始推进票务与酒店闭环；餐饮继续保留基础框架。
- 已完成票务链路首版补齐：乐园详情、门票预定、门票确认订单已形成可跳转闭环。
- 已完成酒店链路首版补齐：酒店首页、房间详情、酒店确认订单已形成可跳转闭环。
- Phase 4 票务/酒店闭环已收口，餐饮继续只保留基础框架与 service/mock 入口。
- 已完成订单主链路首版补齐：订单首页、订单详情、确认订单地址态已形成可跳转闭环。
- 已完成地址管理、物流详情、创建评价、评价列表四个订单扩展页面首版，并已从订单首页串到查看物流和去评价。
- 已移除各分包 `independent: true` 配置，恢复 `app.scss` 全局样式对分包页面的继承。
- 已回补门票预定页的日期选择、门票分区和交易组件复用，并新增 NutUI 组件选型清单，后续页面默认先查项目封装与清单。
- 已完成取消订单、售后类型、售后申请、售后列表、售后进度五个页面首版，并把订单列表/详情动作串到售后链路。
- 已完成会员中心首页首版，补齐会员资料卡、卡券概览、快捷入口和权益服务区。
- 已完成优惠券页首版，补齐可用 / 已使用 / 已过期筛选、卡券列表和空态反馈。
- 已将 `LoginPopup` 调整为关闭后销毁节点，减少微信开发工具辅助树里残留弹窗节点对会员页验收的干扰。
- 已将 `loginRequired` 页面默认未登录阻断态收口为业务化登录提示，并把主动作改为“立即登录”。
- Phase 6 当前轮轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- Phase 6 已提交：`5820ae9 feat: 完成会员基础页和登录阻断收口`。
- 已切入 `feature/hkp-mini-phase-7-polish-verify` 分支。
- 已将 `PageShell` 的页面内 tabbar 默认改为不展示，仅首页和“我的”页显式开启，并为该规则补充页面约束检查。
- 已完成票务首页聚合入口，串联乐园详情、门票预定和乐园导览。
- 已完成乐园导览页首版，补齐地图占位、服务分区索引和到园提示。
- 已按暂缓策略为餐饮页面和会员分享/提现页面补齐业务化暂缓状态页，避免空白骨架直接展示给用户。
- 已确认主包乐园、会员、我的三个聚合入口状态并同步为 implemented；首页仍保留独立首页设计流的 implementing 状态。
- 已修复“我的”tab 页面过空问题，补齐账户卡、快捷入口、常用服务和账户设置区；“我的”主包路径已从 `src/pages/profile` 合并到 `src/pages/member`。
- Phase 7 当前轮轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`。
- `yarn build:weapp` 已尝试执行，Taro 构建再次出现历史 `system-configuration` panic，并在约 50 秒无新增输出后手动停止；按既有本地环境风险记录。
- 已进入商用级补完样板阶段，目标不再以页面骨架或首版 UI 为完成标准，而以 `commercial-ready` 为完成标准。
- 已为门票预定和门票确认订单建立样板闭环：微信动作封装、`DateSelectionPopup` 日期弹层、本地订单草稿、本地订单写入、订单详情读取、交互矩阵、状态矩阵和微信开发工具验收清单。
- 已确认页面级弹层必须挂到 `PageShare` / `PageRoot`，门票预定和确认订单的日期、须知弹层已按该规则迁移；优惠券弹层作为预留能力，后续有券业务时仍必须沿用该层级规则。
- 已新增 `commercial-ready` 页面检查规则：页面文档必须有交互矩阵、状态矩阵和微信开发工具验收清单；页面源码不得残留占位兜底文案；页面 SCSS 不得使用伪类绘制功能性元素。
- 已完成 Phase D 第一批核心入口交互补完：首页扫码、搜索、banner、快捷入口、榜单、推荐、玩转乐园；我的页常用游客、客服、退出登录；会员 tab、会员中心、优惠券点击均补齐可执行结果。
- 已将首页、我的、会员、会员中心、优惠券从 `implemented/implementing` 调整为 `interaction-ready`，避免把首版 UI 误判为商用最终完成。
- 本批轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`；`git diff --check` 通过。
- 已修复本地门票草稿 / 本地订单缓存兼容问题，避免历史缓存不是数组时触发 `.filter is not a function`。
- 已统一顶部安全区约束：`navbar={false}` 的自定义顶部栏必须走 `PageHeader`，由 `PageShell` 注入微信状态栏高度和右侧胶囊避让；默认 navbar 存在 `navbarRight` 时标题左对齐，右侧操作垂直居中。
- 已完成商城交互补完批次：商城首页、搜索、分类、分类商品、商品列表、推荐、商品详情、购物车、收藏、赠品选择均推进到 `interaction-ready`；商品加购写入购物车，商品详情补图片预览、客服拨号、分享、优惠券、参数和 `PageShare` SKU 层级。
- 商城批次轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`；商城页面扫描未发现直接 `Taro.showToast`、非暂缓占位文案或功能 icon 尺寸漂移。
- 已完成票务 + 酒店剩余交互补完批次：乐园详情、乐园导览、酒店首页、房间详情、酒店确认订单推进到 `interaction-ready`。
- 票务详情客服热线、园区地址、节目单分别接入微信拨号、地图和 modal；导览地图支持图片预览，服务分区点击有业务反馈。
- 酒店首页补分享、图片预览、地图、介绍 modal、入住日期范围弹层、入住人数切换和筛选联动；日期弹层挂载在 `PageShare`。
- 酒店房间详情补主图预览和底部立即预订；酒店确认订单补房间数调整、入住人动态字段、手机号校验、优惠/折扣 modal、模拟微信支付、本地订单生成和订单详情跳转。
- 已新增页面约束：`navbar={false}` 的非全屏业务页必须在 `PageHeader` 内保留显式返回入口并统一调用 `navigateBackOrHome()`；搜索页源码和当前 `dist` 均已确认包含左侧返回。
- 本批轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`；`git diff --check` 通过；酒店/票务扫描未发现非暂缓占位文案或直接 `Taro.showToast`。
- 已完成订单 + 售后 + 地址 + 评价交互补完批次：订单首页、订单详情、确认订单、地址管理、取消订单、售后类型/申请/列表/进度、物流详情、创建评价、评价列表均推进到 `interaction-ready`。
- 订单确认页补商品图预览、优惠/折扣 modal、模拟微信支付、本地订单写入和订单详情跳转；订单首页合流展示本地订单。
- 地址管理补默认地址、新增、编辑、删除本地状态闭环；取消订单补原因校验和微信 modal 二次确认。
- 物流详情补商品图预览、快递单号复制、官方电话拨号和确认收货状态反馈。
- 售后申请补微信图片上传、预览、删除和提交反馈；创建评价补图片上传/预览/删除、内容校验、匿名切换和提交确认；评价列表补图片预览。
- 本批轻量门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`；`git diff --check` 通过；订单分包扫描未发现非暂缓占位文案、直接页面 `Taro.showToast` 或功能 icon 尺寸漂移。
- 已将非暂缓入口页会员码、乐园聚合页、票务首页推进到 `interaction-ready`；registry 中剩余 `implemented` 均为约定最后处理的餐饮和分销/提现暂缓页。
- 已按用户微信开发工具反馈修复会员码页：恢复 `PageShell` 默认自定义导航栏，页面顶部重新展示“会员码”和返回入口；二维码改为隐藏 canvas 生成后转成本地临时图片，再通过 `AppImage` 在白卡中展示，避免可见 canvas 被裁切。
- 会员码页文档已更新到 v0.6，补齐交互矩阵、状态矩阵和微信开发工具验收清单；本次门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`、`git diff --check`。
- 已继续补齐商城搜索页交互：新增项目组件 `AppSearchBar`，底层使用 NutUI `SearchBar`；搜索页输入、清除、键盘搜索和空关键词 toast 已形成闭环，修复原清除按钮误触发搜索的问题；页面文档和 NutUI 组件选型清单已同步。
- 已继续清理业务页面功能性伪类状态指示：商城分类、分类商品、酒店首页和订单首页的 active 指示条已从 `::before/::after` 改为真实 `View` 节点；剩余伪类仅保留在骨架装饰、会员码背景氛围和全局 button reset。
- 已二次修复会员码页：隐藏 canvas 的生成尺寸和展示尺寸已拆开，JS 绘制 / 导出使用微信真实像素，页面展示使用 750 设计稿 `rpx`，避免二维码只显示左上角 1/4；同时移除会员码主区域自身 `100vh / calc(100vh - header)` 硬编码高度，避免和 `PageLayout` 的 header spacer 叠加产生无意义滚动条。
- 已按腾讯地图 POI 搜索结果修正乐园默认地图坐标：`安吉Hello Kitty乐园`、`浙江省湖州市安吉县天使大道1号`、`lng=119.740987`、`lat=30.621754`；源码中的历史偏移坐标已清空，首页导航、门票预定页地址和乐园详情地址统一引用 `src/core/constants/park-location.ts`。
- 已清理源码中用文本符号冒充图标的问题：首页 `♡/✦/▱` 分区图标、页面 `›` 右箭头、弹层 `×` 关闭按钮均已改为 `AppIcon` / NutUI icon；`$mpcode-page` skill、`docs/codex/page-foundation.md` 和 `yarn check:page-convention` 已新增文本图标禁止规则。
- 已从干净工作区切入 `feature/hkp-mini-phase-9-ticket-checkout` 分支，基点为 `8c32509 feat: 完善商城搜索与分享链路`。
- 门票确认订单进入商用闭环复核：补草稿缺失态、加购数量持久化、联系人持久化、动态金额明细、18 位身份证校验、支付后受保护路由跳订单详情。
- 门票预定页补齐客服电话入口，走微信拨号封装；优惠券能力降为低优先级预留，当前无券业务时不展示入口。
- 商城确认订单、酒店确认订单和门票确认订单已同步结算页基础修正：页面主体左右留白改为 30px、数量文案统一小写 `x`、当前无券业务时隐藏优惠券/折扣入口，订单详情不写入空优惠信息，支付后订单详情跳转改为受保护路由封装。
- 门票确认订单结算逻辑升级为票种规则驱动：成人票、儿童票、优惠票、亲子票、成人/儿童/家庭年卡按当前产品结构生成实名出游人/持卡人，联系人和出游人分离，提交前校验证件、年卡手机、重复证件和儿童/优惠资格确认。
- 门票确认订单出游人信息已从长表单改为平台式横向 tab 切换：tab 数量由票种生成的 `travelers` 动态决定，游客/持卡人独立填写、独立完成态、切换不丢数据，并补入口园方式说明和“同联系人”快捷同步。
- 门票交易默认态已收口：预定页门票、年卡和套餐数量默认全部为 0；普通提交不携带套餐加购，确认订单页纯门票态不展示套餐加购卡，只有用户从套餐入口确认提交时才携带 1 份可选套餐。
- 门票确认订单日期逻辑已收口：确认页不再直接改日期；点击日期提示返回重选，确认后优先页面栈回退到门票预定页，避免票种、价格、库存和入园人信息不随日期刷新。
- 门票确认订单可见文案已去实现层表达：页面不再展示“按票种生成 / 实名槽位”这类系统话术，并已在页面规范检查中加入拦截。
- 酒店首页已按最终稿 `hotel-home-online.png` 重做：标题改为 `畅‘住’HelloKittyPark`，banner 支持滑动、图片数量和微信大图预览，地址、介绍、日期范围、入住人数、筛选和产品预订均补齐可执行交互。
- 酒店链路已改为订单上下文驱动：首页/详情页创建 `draftId`，确认订单页通过 `draftId` 恢复产品、日期、晚数、房间数、价规、金额和政策，不再只靠静态 `roomId` 拼结算数据。
- 酒店房型/套餐详情已承接首页日期和入住人数，补图集预览、价规卡、满房拦截、预订须知和受保护预订入口。
- 酒店确认订单已升级为房间 tab 式入住人填写，房间数通过 `QuantityStepper` 调整并联动金额；联系人、手机号、入住人校验后写入本地酒店订单并跳订单详情。
- 已提交上一阶段改动：`a3e7b21 feat: polish mini program commercial flows`，并从干净状态切入 `feature/hkp-mini-mall-commercial-flow`。
- 商城商用级优化第一批已落地：商城首页搜索移入 `PageHeader` 固定区；订单首页 tab 移入 `PageHeader` 固定区；`category-list` 旧路由改为兼容跳转，分类页统一为左侧分类 + 右侧联动内容。
- 商城 mock 数据已补可展示图片，商品详情接入接口富文本；商品详情 SKU 改为多级可售组合联动，价格、图片、赠品、配送规则跟随当前 SKU。
- 新增商城结算草稿 `src/core/services/mall-checkout-draft.ts`：商品详情立即购买和购物车结算均生成 `draftId`，确认订单按草稿恢复商品、规格、数量、赠品和配送规则。
- 确认订单新增地址选择模式和配送范围校验：选择地址后刷新订单信息；商品不支持配送或地址不在范围时禁用支付。
- 微信支付已封装为 `requestWechatPayment()`；商城订单支持“暂不支付”生成待付款订单，订单详情可继续支付，支付成功后更新为待发货。
- 商城商用级优化第二批已继续收口：商品列表筛选升级为底部弹层，支持价格区间和商品标签组合筛选；商品列表和推荐页价格排序不再使用文本符号图标。
- 订单中心待付款闭环已修复：预置待付款订单进入详情后可继续支付，支付成功后写入本地已付款订单，并在订单首页隐藏同 id 静态待付款项。
- 商城订单详情字段已按业务分区：商品信息、配送方式、收货信息、金额和订单信息各自归位；详情页标题可按订单字段显示取票信息、入住信息或收货信息。
- 商品详情 SKU 选中后主价格跟随当前可售规格变化，立即购买和购物车结算继续通过 `draftId` 串联确认订单。
- 商城第三批已开始补边界态：购物车删除全部商品后展示统一空态，隐藏右上角编辑入口和底部结算栏，保留猜你喜欢继续承接商品详情。
- 购物车持久化已从“只保存加购项”升级为当前购物车分组快照：删除默认商品、删空、改数量后再次进入页面不会被静态 mock 重新灌回；商品详情继续加购会合并进快照。
- 商品详情富文本已按小程序 `rpx` 尺寸更新，并修正详情图横向溢出风险；订单详情待支付金额文案和受保护跳转已收口。
- 商品详情评论数量已从页面硬编码改为 service 字段，继续保持推荐商品公开浏览和评价列表入口可点击。
- 商城订单售后按钮策略已细化：订单首页 item 支持多操作按钮，商城待发货可同时展示查看物流/查看详情和申请售后；售后类型页、申请页和进度页会按 `orderId` 恢复当前订单并生成对应售后类型、退款金额、原因列表和售后进度，静态待发货订单也已显式绑定 `order-mall-001`。
- 商城 SKU 已抽出通用选择引擎：支持多层级规格、不可售项禁用、严格上层向下联动、库存数量上限和提交提示；低层级选择不得反向改动上方层级，未选中规格视觉统一不使用红色冲突边框，后续真实接口只在 service/adapter 转成 `HkpSkuGroup` + `HkpSkuVariantBase`。
- 当前执行优先级已调整：先侧重视觉还原、可见交互、功能点位和交易基础组件健壮性；真实接口未给出前，mock 数据结构只做到当前体验闭环，不提前重设计未知后端字段。
- 商城快捷加购入口已收口：商城首页和商品列表先判断 SKU，可售组合为 0 时提示无货，只有 1 个可售组合时直接加车，多个可售组合时在当前页通过 `PageShare` 弹 `SkuPopup`；收藏等其它加购入口默认跳商品详情，由详情页承接完整规格和商品信息。
- 商城分类页已改为左右双栏独立滚动：`PageShell` 关闭外层主滚动，页面内部左侧分类和右侧商品列表各自使用 `ScrollView`；右侧连续渲染所有分类商品分区，点击左侧分类滚到对应分区，手动滚动右侧进入下一分区时联动左侧高亮；右侧商品卡进入详情，右侧加购按钮复用同一套 SKU 快捷加购判断。
- 本轮商城第三批门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:package-boundary`、`yarn check:ui-contract`、`git diff --check`。
- 本轮商城 SKU 入口补充门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:ui-contract`、`git diff --check`。
- 本轮商城分类双栏、连续分区联动与 SKU 补充门禁已通过：`yarn typecheck`、`yarn check:page-convention`、`yarn check:ui-contract`、`git diff --check`。

## 当前约束

- `pkg-dining` 餐饮板块当前只补业务化暂缓状态页，不进入完整餐饮 UI 实现。
- `pkg-member` 下分销链路 `share-rule/share/share-income/share-invite/withdraw/withdraw-records` 当前只补业务化暂缓状态页，不进入完整分销 UI 实现。
- 只有用户明确点名后，才允许继续完善以上两个板块的 UI。
- `PageShell` 默认不展示页面内 `AppTabBar`；只有首页和“我的”页允许显式开启。
- `AppIcon` 默认尺寸保持 `14-16`，功能性图标必须优先走 NutUI / `AppIcon` / 项目封装，不能用 CSS 伪类绘制。
- 页面和通用组件禁止用 `♡`、`✨`、`✦`、`▱`、`›`、`→`、`×` 等文本符号充当图标；箭头、关闭、收藏、星标、定位、电话等必须走 `AppIcon` / NutUI icon / 项目封装，并由 `yarn check:page-convention` 拦截。
- 当前只按微信小程序 `weapp` 实现和验收，图片预览、扫码、地图、电话、复制、modal、toast 优先走微信 API 封装。
- 用户中途发来的问题、提醒、补充条件默认只更新约束，不中断当前主线阶段；只有明确说“停”或改主任务时才切线。
- 后续商城优先看视觉、交互和功能点位；mock 接口字段不作为当前优先级，除非为了页面闭环、SKU/订单/支付等基础交易能力必须补最小结构。

## 下一步

1. 在微信开发工具重点验收：商品详情多级 SKU 联动、立即购买到确认订单、购物车勾选结算到确认订单、删除默认商品后重新进入购物车、地址选择后配送校验、暂不支付后订单详情继续支付、待发货订单申请售后是否带入当前订单。
2. 额外验收商城首页和商品列表快捷加购：单一可售规格应直接加车，多规格应在当前页弹 SKU；收藏等其它加购入口应进入商品详情，不直接写购物车。
3. 额外验收商城分类页：页面不应整页滚动，左侧分类和右侧商品列表应各自滚动；右侧应连续渲染所有分类商品分区，点击左侧分类能跳到对应分区，手动滚动右侧进入下一分区时左侧高亮跟随变化；右侧商品卡点击进详情，右侧加购按钮按 SKU 规则直加或弹层。
4. 用户反馈不符合预期的点后，Codex 进入本批修复循环。
5. 如商城链路验收通过，下一步再进入商城订单售后进度闭环细化或下一个非暂缓板块；餐饮和分销/提现继续最后处理。

## 恢复方式

换账号或新会话后直接说：

```text
[$hkp-mini-build] 继续
```

Codex 应读取本文件、`docs/ui/pages/hkp-mini-prd.md`、`docs/ui/page-registry.yaml`、路由配置和 Git 状态后继续。

## 阶段分支

- `feature/hkp-mini-phase-0-prd-assets`：PRD、截图资产、registry 元信息、checkpoint。
- `feature/hkp-mini-phase-1-routes-shells`：路由和页面骨架。
- `feature/hkp-mini-phase-2-shared-components`：通用组件和基础 mock service。
- `feature/hkp-mini-phase-3-mall-flow`：商城闭环。
- `feature/hkp-mini-phase-4-booking-flows`：票务、酒店闭环；餐饮保持骨架。
- `feature/hkp-mini-phase-5-order-aftersale`：订单、售后、地址、评价、物流。
- `feature/hkp-mini-phase-6-member-growth`：会员基础页与优惠券；分销链路保持骨架。
- `feature/hkp-mini-phase-7-polish-verify`：状态补齐和整体验收。
- `feature/hkp-mini-phase-9-ticket-checkout`：门票确认订单商用闭环复核。
