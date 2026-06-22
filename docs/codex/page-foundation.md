# 小程序页面基础设施

## 目标

本文件是 `$mpcode-page` 的当前项目事实源。页面任务先读这里，再进入具体页面实现，避免每次重复推导通用组件和方法。

## 页面默认骨架

- 新建页面默认使用 `PageShell`。
- `PageShell` 外层必须包一层 `<View className="_pg">`，作为页面级样式作用域根节点。
- 新建页面默认使用 `usePageRuntime()`，首屏依赖接口、登录拦截或页面 loading 时传 `initPage`。
- `usePageRuntime` 默认只在首次进入时执行 `initPage`；页面再次 `useDidShow` 不自动刷新，确需自动刷新时才显式传 `refreshOnShow: true`。
- `usePageRuntime({ loginRequired: true })` 页面在用户取消登录后，默认进入业务化登录阻断态，并提供“立即登录”重试入口。
- 新建页面默认使用 `observer(function PageName() {})` 包裹，减少后续接入 MobX 状态时的返工。
- 页面只负责渲染、交互和状态组合；接口、默认值和异常态/空态转译放到 service。
- 用户明确说明数据由接口返回、后端配置或富文本承载时，页面只能做最小容器、字段透传和 `RichText` / 图片承载，不要按截图拆成前端自定义 UI、硬编码列表、卡片、时间轴、营销排版或复杂结构；会员权益、券面、规则图、活动海报这类复杂视觉优先按接口图片或富文本承载，除非用户明确要求前端实现这些结构。
- 真实接口接入必须控制请求扇出：同一页面初始化内，同一业务资源、URL 或稳定 key 只能请求一次；商品列表后续拉日历、库存、详情、权益、可用券等 N+1 链路时，先按 `productCode/id/skuId/dateRange` 去重并合并并发请求；短 TTL 缓存只能淘汰已完成结果，进行中的同 key 请求必须一直复用；已知草稿、待审核、下线或其它不可售资源不要继续请求可售日历或报价接口。门票预订页一次进入或一次日期切换内，同一 `productCode + startDate + endDate` 只能触发一次 `/calendar` 请求；如果网络面板出现同一快速通日历被重复打多次，必须先修 service/request 去重再验收。
- 订单状态、核销状态等后台静默轮询只能作为变更探针：必须无 loading、无 toast、单飞请求、防页面隐藏后继续跑、无变化不 `setState`；探针响应不得直接渲染，发现变化后再调用页面正常详情刷新入口更新页面。
- Swiper、横滑列表、图片组和卡片列表必须兼容接口返回空数据：先过滤有效项，只渲染真实存在的数据；没有数据时不要生成 `SwiperItem`、空卡片、空图片节点或额外占位，除非用户明确要求保留占位。
- 列表跳详情时，路由参数必须使用接口返回数据里的 `id` 字段拼接；不要在前端额外造 `projectId`、`detailId` 等平行 id 字段，除非真实接口字段就叫这个名字。
- 运行态页面和 service 禁止新增 mock / fallback 业务数据；真实接口缺 endpoint、缺字段或缺配置时进入空态、异常态、阻断态，并同步 BFF 闭环文档。
- 用户可见文案禁止出现 `mock`、组件库、技术栈、开发态或测试态字眼。
- 用户可见文案必须按真实 C 端业务语境表达，不得暴露实现层、调试层或产品内部分类词；输入提示、空态、按钮和列表标题都要让普通游客能直接理解。
- 用户可见文案禁止出现实现过程描述，例如“按票种生成”“实名槽位”“接口返回”“草稿”等；页面上应表达为“请补充出游人信息”“返回重新选择”“订单信息已保存”等游客可理解话术。
- 商用级补完页面必须在代码、service 状态、接口文档或必要的 current 文档里体现交互、状态和验收口径；不再维护页面级 UI 设计说明文档。

## 多页面流开发

- 只有用户明确说一次开发多个页面、多页面流程、多张截图分别对应多个页面、或从 A 到 B 到 C 一起做时，才进入多页面流开发。
- 同一个页面的首屏/中屏/底部/滚动态、多状态截图、补充参考图，不触发多页面流开发。
- 触发后先建立页面清单：`pageKey`、标题、主包/分包、路由、navbar、登录要求、截图归属、入口和下一跳。
- 截图归属不明确时只问一个最关键问题；能合理判断时直接继续。
- 先批量生成或定位页面骨架、route 和 app.config，再逐页实现 UI 和业务。
- 只有 2 个以上页面明确复用同一 UI 或逻辑时，才抽公共组件或 util；否则保持页面内最小实现，避免过度抽象。
- 每个页面都必须遵守 `PageShell`、`usePageRuntime`、`observer`、`_pg-*` BEM 和 `AppImage` 等页面基础约束。
- 小程序 UI 维护文档体系已下线；不要创建、读取或维护 `docs/ui/pages/{page}.md`、`docs/ui/page-registry.yaml`、页面设计变更记录或 UI contract。基础 UI 约束继续以本文件、代码组件和检查脚本为准。

## 导航规则

- 使用 `PageShell` 默认 navbar 的页面，必须在页面 `config.ts` 声明 `navigationStyle: 'custom'`。
- 使用系统导航栏的页面，传 `navbar={false}`，且 `config.ts` 只保留系统标题。
- `navbar={false}` 且自定义顶部栏的页面，顶部内容必须放入 `PageHeader`，由 `PageShell` 统一注入微信状态栏高度和右侧胶囊避让；不要把搜索栏、返回栏直接放进滚动内容顶部。
- 使用 `PageHeader` 声明固定顶部内容时，页面不得传手写固定高度、不得自行写 spacer 或 JS 估算 header 高度；顶部高度由 `PageLayout` 真实 selector 测量，并且只在当前 header/footer/tabbar 存在状态、底部安全区和设备 chrome 指纹一致时复用路由缓存值，避免进入页面或从子页面返回时滚动区等待测量造成跳动。若仍有跳动，优先修 `PageShell/PageLayout` 的测量和缓存机制，不在页面层硬编码高度。
- `PageLayout` 只要渲染 header 插槽，固定 header 容器默认必须有白色背景；页面如需透明沉浸式顶部，必须作为明确的页面级视觉方案单独覆盖。header/footer 测量过程中只有插槽不存在才允许直接归零；插槽存在但拿到空 rect 或 0 高度时必须视为不稳定采样，优先保留上一次有效高度并重测，且不得把 0 写入路由缓存。若连续重测仍为 0 且没有历史有效高度，可释放首次测量遮罩，但该 0 仍不可缓存。
- `navbar={false}` 的非全屏业务页必须在 `PageHeader` 内保留显式返回入口，并统一调用 `navigateBackOrHome()`；搜索、筛选、分类等自定义顶部栏不能只保留输入框或取消按钮。
- `PageShell` 默认 navbar 如果存在 `navbarRight`，标题必须左对齐，右侧操作按钮必须在微信胶囊内容高度内垂直居中；没有右侧操作时标题保持居中。
- `PageShell` 默认 navbar 且存在标题时，下拉刷新或 `usePageRuntime` 刷新 loading 期间，标题区域统一切换为 NutUI `Loading` + “刷新中”，刷新完成后恢复原标题；自定义 navbar、`navbar={false}` 或无标题页面不受影响。
- 页面顶部 tabs、筛选栏、分段控制器等属于页面头部导航/切换能力时，默认放入 `PageHeader`，跟随 `PageShell/PageLayout` 固定在 navbar 下方；不要把它们当普通内容放进滚动列表，除非页面设计明确要求随内容滚走。
- 主包 tab 页面不展示返回按钮；页面内底部 tabbar 只由首页和“我的”页显式开启。
- `PageShell` 默认不展示底部 `AppTabBar`；只有首页和“我的”页显式传 `reserveTabBarSpace` 开启页面内 tabbar。
- 会员资产和账号资产类受保护业务能力必须做登录双保险：入口点击先拦截，登录成功后再跳转；目标页面仍要保留 `usePageRuntime({ loginRequired: true })` 作为第二道兜底。公开浏览页不拦截登录，例如商品详情、商品列表、门票预订、酒店首页/房型详情和餐饮商户详情。
- 跳转会员码、会员中心、优惠券、购物车、收藏、赠品选择、订单列表、订单详情、地址、售后、评价创建等受保护路由时，优先使用 `src/core/utils/navigation.ts` 的 `navigateToMiniRoute()`；不要在各页面散写 `Taro.navigateTo` 后漏掉入口拦截。票务/酒店/商城交易确认页属于可选登录路由，允许用户在登录弹窗选择暂不登录后继续跳转；本次订单结果页只允许创建订单成功入口显式传 `loginMode: 'none'` 放行，订单详情默认仍按订单资产做登录保护。
- 所有广告资源位点击必须统一调用 `src/core/utils/ad-click.ts` 的 `adClick()`；页面只传后台广告对象，不再散写 `jumpType`、H5 复制、其他小程序、地图、电话、富文本详情分支或本地兜底路径。
- 非 tab 自定义 navbar 页面默认使用 `navigateBackOrHome()` 返回。
- 页面栈判断和“有上一页则返回、无上一页则回首页”的按钮事件必须封装在 `src/core/utils/navigation.ts`，页面或状态组件不要直接散写 `Taro.getCurrentPages()`。
- 首页错误态不展示返回入口；通用错误组件需要临时隐藏返回时使用 `hideBack`，不要在页面里重复写路由判断。
- 首页这类特殊页面可关闭 `PageShell` navbar 并自己实现固定导航。

## 布局规则

- `PageLayout` 的 footer 只有存在真实 footer/bottom 内容时才渲染固定区域，并默认给整个 footer 区域白色背景，确保底部操作栏和安全区占位视觉连续。
- `PageLayout` 首次测量 header/footer 高度前会用白色测量遮罩盖住主内容区，测量完成后淡出，避免 header spacer 首次落位时页面内容裸眼跳动；页面层不要再自己写首屏遮罩处理这个问题。
- `PageShell` 默认使用 `ScrollView` 承接页面主内容；页面在 `usePageRuntime({ initPage })` 下渲染时，默认下拉刷新会调用同一个 `initPage`，不要再用每次 `useDidShow` 自动请求代替用户手动刷新。
- `PageLayout` 滚动模式下 header spacer 必须放在 `ScrollView` 上方同级，并从 `ScrollView` 高度中扣除；不要把 header spacer 放进 `ScrollView` 内容里，否则微信下拉刷新顶部会多出一段空白。
- 页面涉及底部固定栏、footer、弹层底部操作区时，不要再在页面或业务组件里追加 `env(safe-area-inset-bottom)`；固定 footer 安全区由 `PageLayout / layout` 统一承接，从底部打开的 `AppPopup` 默认由组件内部追加底部安全距离，页面只写业务需要的常规 padding。
- 页面级弹层、浮层和遮罩默认放入 `PageShell` 的直接子节点 `PageShare` / `PageRoot`，不要放在滚动内容里；日期、优惠券、规则说明、SKU、筛选、支付确认类弹层都必须高于 `PageLayout` 的 header/footer/tabbar。
- 页面首屏完成后的非下拉刷新请求必须走 `pageRuntime.withLoading()` 或同等页面级 loading 封装锁住页面，例如切换日期、筛选、tab 条件导致当前商品区重载时；只有用户手动下拉刷新才使用系统下拉刷新态，避免用户在旧数据刷新期间继续点击旧按钮。
- 全局 loading、popup、runtime host、toast bridge、页面级 overlay 等全局状态组件，最外层 host 节点必须常驻渲染；显示隐藏只控制下一层真实节点或 class，避免 `PageLayout` / `ScrollView` 周边节点增删导致滚动回到顶部。
- `ScrollView` 本体只负责滚动能力、高度和横纵向参数，不要在 `scroll-view` class 上写业务 padding；页面需要内边距时，在 `ScrollView` 内嵌一层 `View` 承接 padding，避免微信 webview 渲染告警和端内差异。
- 商城分类、餐饮点单等左右双栏页面不要复用 `PageShell` 外层主滚动；应显式传 `scrollView={false}`，由页面内部左右两个 `ScrollView` 分别承接分类和商品/菜品列表滚动；右侧优先连续渲染所有分类分区并联动左侧高亮，不要只渲染当前分类导致滚动到底断层。
- 横向 tabs / 分类栏使用 `ScrollView scrollX` 时，外层只负责横向滚动，内层用 `white-space: nowrap` 或 `inline-flex` 撑开内容宽度；每个 tab item 必须按 750px 设计稿尺寸显式写 `width`、`flex: none`、`flex-shrink: 0`，不要把设计稿尺寸折半，也不要只依赖 `flex-basis`，避免微信端把所有 tab 压缩到一屏。
- 分包默认不要开启 `independent: true`；独立分包不会继承主包 `app.scss -> app.wxss/app-origin.wxss` 的全局样式，只有明确需要独立启动能力时才单独评估开启。

## 页面样式规则

- 页面根容器固定使用 `_pg`，用于覆盖当前页面内的 `PageShell`、`PageLayout` 等局部样式。
- 页面业务 class 统一以 `_pg-` 开头，避免和全局组件、NutUI 或其他页面样式冲突。
- 页面 class 遵循 BEM，元素连接符使用单下划线，例如 `_pg-banner_container`、`_pg-banner_item`；状态使用双横线，例如 `_pg-banner_item--active`。
- 页面 SCSS 尽量使用嵌套写法，例如 `._pg-banner { &_container {} &_item { &--active {} } }`。
- 已有页面只要本次修改触达 render 或 SCSS，就必须把触达区域迁到 `_pg-*`；如果本次是页面级重写、首页整体调整或重构样式文件，则整页统一迁到 `_pg-*`，不要保留页面名前缀逃逸。
- 页面级 SCSS 禁止裸写全局组件、NutUI 或项目组件选择器影响全局，例如 `.nut-*`、`.app-popup`、`.login-popup`、`.page-*`；除非用户明确要求页面级覆盖，否则页面只能在当前 `._pg` 作用域下做局部覆盖。组件自身问题必须改对应组件文件，并用该组件自己的外层 class 收口。
- 基于 `AppPopup` 的业务弹层必须通过 `className` 提供可收口的外层 class：复用组件用组件自有 class，例如 `login-popup`、`sku-popup`；页面内直接声明的弹层用 `_pg-xxx-popup-shell` 这类页面级 class。二次定制必须收口到对应组件或当前页面作用域，不得为了某个业务弹层直接改全局 `AppPopup`、`.nut-popup`、`.nut-overlay`。
- 标题固定、右侧关闭、中间滚动、底部确认按钮可选的底部业务弹层优先使用 `AppBottomSheet`；页面只传业务内容，不要重复手写弹层 header、关闭按钮、滚动容器和确认 footer；中间滚动区默认最小高度为 `300px`，未超过最大高度前随内容自适应，特殊业务只通过 `bodyMinHeight/bodyMaxHeight` 覆盖。
- 后续新增或触达页面布局时优先用 `flex` 实现；不要在新写区域主动新增 `grid` / `gap`，历史已经存在的 `grid` / `gap` 不为此单独追改。
- 小程序页面 SCSS 尺寸默认按 750px 设计稿原值书写，不要按 375 逻辑手动折半；只有明确在写 JS canvas 实际像素、NutUI 内部变量适配或某个组件文档要求时，才单独说明换算依据。
- 颜色、间距、圆角和安全区 token 以 `src/styles/tokens.scss` 为唯一代码准源；新增 token 必须先确认复用价值，不再新增或同步 `docs/ui/tokens.md` 这类设计记录表。
- 页面级默认内容左右留白统一使用 `30px`；新页面模板和商用页主体区块不要继续默认写 `32px`，组件内部、卡片内部或弹层内部的局部 padding 按组件视觉单独决定。
- 页面背景以浅灰白和白色承载面为主，品牌粉只用于主按钮、选中态、重点氛围和少量品牌识别；圆角、阴影和粉色面积要克制，避免整页变成单一粉色主题。
- 字体层级服务页面扫描效率，卡片、列表、侧栏、弹层和紧凑工具区不得使用 hero 级大字；模块标题、金额、主按钮等明确重点再做尺寸和字重强调。
- 列表、卡片和模块内部常规间距优先复用 `12px / 16px / 24px / 30px / 32px` 这组既有尺度，模块之间至少保留 `24px` 呼吸感；特殊业务视觉按局部组件收口，不另开全局节奏。
- 小程序交互控件边框（按钮、操作按钮、筛选项、可选项、checkbox、可点击/可选择胶囊 tag 等）如果需要 1px 视觉发丝线，统一写 `1Px`，例如 `border: 1Px solid ...`；不要把这类控件边框写成 `1px`，否则按 750px 设计稿转换成 rpx 后真机显示不稳定。`Px` / `PX` 大写是刻意规避转换的项目约定，不要改回 `px`。分割线、下划线、结构性 `border-top/bottom/right: 1px` 以及纯展示型卡片/标签边框可继续保留 `1px`。
- 页面可见文本 `font-size` 最小为 `22px`；新增或触达页面样式时不得写低于 `22px` 的字号，第三方组件内部样式或特殊视觉资产需要例外时必须在对应组件代码注释或通用事实源中说明原因。
- 字体默认不声明 `font-weight`，让宿主默认粗度生效；正文、说明、链接、普通行文、tab 普通项和卡片普通信息不要为了“看起来重点”特意写 `font-weight: 500`。只有页面标题、模块标题、金额、主按钮等明确强调文本，且确实需要时才显式使用 `500`。
- 项目源码内 `font-weight` 数值不得超过 `500`；新增或触达样式优先使用 `normal` / `500`，不要写 `550/600/700/800/900`。

## 图片与图标规则

- 页面内真实图片区域统一使用项目封装 `AppImage`，不用 CSS 渐变、色块或组合图形模拟图片内容，也不要在页面里直接散用 Taro `Image`。
- 图片地址在 render 内显式声明变量，默认空字符串，例如 `const bannerImageSrc = '';`，后续再替换为接口字段或固定 CDN。
- 图片尺寸优先通过 `AppImage` 的 `width`、`height`、`style` 或业务 class 控制；需要改内部 `Image` 样式时再用 `imageStyle`。
- 图片未接入真实地址时，由 `AppImage` 灰色背景占位；如果页面需要把空地址显式暴露为失败/catch 态，传 `emptyState="error"`。
- `src` 显式置空的 `AppImage` 灰底可能是等待接口/素材替换的设计占位；`$mp-verify` 视觉走查不得自动替换成 `AppIcon`、文字标题或手写图形，除非用户明确要求调整占位策略。
- 图片加载中和加载失败都保留灰底，loading 居中且默认按传入宽度自适配大小，加载完成后去除灰底并淡入真实图片，不展示技术占位文案。
- 图标先查项目内封装；NutUI 有匹配项时先封装为项目组件，例如 `AppIcon`，再在页面使用；找不到合适图标时使用图片组件并将 `src` 默认置空，等待补链接。
- `AppIcon` 默认尺寸按 `14-16` 书写，优先从 `16` 开始；只有主视觉、悬浮主按钮、空态插图辅助等明确需要放大的场景，才额外写到 `18+`，不要默认给 `20+`。
- 功能性图标必须走 `AppIcon` / NutUI icon / 项目封装，不允许用 CSS `::before` / `::after` 绘制；伪类仅可用于装饰线、骨架光效和背景氛围。
- 页面和通用组件禁止用文本符号充当图标，例如 `♡`、`✨`、`✦`、`▱`、`›`、`→`、`×` 等；右箭头、关闭、收藏、星标、定位、电话等必须使用 `AppIcon` / NutUI icon / 项目封装，避免微信端字体兼容和渲染差异。

## 微信能力规则

- 当前只按微信小程序 `weapp` 实现和验收，不为 H5 或其它端写兼容分支。
- 向后端、微信能力、支付、上传或授权链路传当前小程序 `appId/appid` 时，必须统一使用微信官方 `getAccountInfoSync().miniProgram.appId` 获取当前运行 AppID；获取不到才兜底 `wx72b9e08ce45d3e79`。页面、service、request、支付或上传代码禁止直接把配置 AppID 当首选值传参。
- 项目分享只允许微信好友分享：页面使用 `useShareAppMessage` 配置分享内容，可见分享按钮统一优先使用 `AppShareButton` / `openType="share"`；分享属于公开传播能力，不校验登录态，不要把分享按钮包进 `AuthAction`、`requireLogin` 或受保护路由判断；禁止 `useShareTimeline`、`onShareTimeline`、`shareTimeline`、朋友圈分享入口，以及用 `showShareMenu` 做二级分享引导。
- 图片预览、扫码、地图、电话、复制、确认弹窗和 toast 默认优先使用 `src/core/utils/wechat-actions.ts` 封装；确认类弹窗统一走 `showAppModal()` / `showWechatConfirm()`，不要在页面直接散写 `Taro.showModal`，确认按钮颜色默认使用项目主色。
- 微信支付默认优先使用 `src/core/utils/wechat-actions.ts` 的 `requestWechatPayment()`；无真实支付参数时必须按失败/待支付阻断处理，不允许用本地弹窗模拟支付成功或冒充交易闭环。页面不要直接散写 `Taro.requestPayment` 或临时支付 modal。
- 新增或使用 `chooseLocation` 等微信隐私 API 时，必须同步检查 `src/app.config.ts` 的 `requiredPrivateInfos` 和 `permission` 声明，避免开发工具内接口直接 fail 后被业务 toast 误判为用户取消。
- 搜索、筛选、表单、交易确认等页面的业务细节默认沉淀到 service/types、接口联调文档或必要 current 文档；不再维护页面级 UI 设计说明。本文件只保留微信 API、文案边界、状态组件、布局安全区等跨页面通用约束。
- 页面可见点击必须落到跳转、弹层、微信 API、本地状态变化、登录拦截或提交结果，不允许用“即将开放”作为非暂缓页面兜底。
- 微信 canvas 生成图片时必须区分 750 设计稿 `rpx` 展示尺寸和 canvas 真实像素绘制尺寸；不要直接把 SCSS 中会被 Taro 转换的 `px` 常量复用为 JS 绘制 / 导出尺寸，避免只导出左上角局部。

## 微信开发工具验证规则

- Codex 不在普通开发收尾时自动进入微信开发者工具走查；只有用户明确触发 `$mp-verify`、`$mp-weapp-verify` 或说明“你自己进开发工具验证”时才执行。
- 同一个 Codex 对话内多次发起微信开发工具验收时，按“本对话是否已经打开或接管过当前 hkitty 小程序项目”判断，只能复用本对话已有的当前项目微信开发工具窗口；不得一次验证开一次新的当前项目窗口。这不是全机只允许一个 DevTools 进程的约束，不得关闭、接管或收敛其它对话正在使用的其它项目 DevTools 窗口。
- `$mp-verify` 默认验证后自动修复确定性问题；用户明确说“只出清单 / 不要修”时才只报告不改代码。
- `$mp-verify` 发现空图片、灰底图片、待素材位、截图还原差异等视觉资产问题时，默认列入待确认；不得把素材占位自动改成图标、文本或新视觉方案。
- `$mp-verify` 自动修复前必须判断影响半径和通用性：先查同类页面、共享组件、调用方和样式作用域，能确定是通用基础设施问题才修通用层，能确定是单页问题才修页面局部，不允许为了修 A 破坏 B。
- 设计取舍、多方案交互、大范围重构、新依赖、真实账号/支付/上传权限等高风险问题，必须列入待确认清单，不自动改。
- 用户明确说明为本地手动调试、已验收或刻意保留的视觉参数时，后续 review / `$mp-verify` 不再按通用约束反复报同一类问题；只在它造成编译失败、功能不可用、跨页面或全局组件污染、微信端兼容风险，或用户重新要求按约束收敛时才重新提出。
- 微信开发工具验证优先使用 DevTools MCP / `miniprogram-automator` / `weapp-ide-cli` 等可重复工具；Computer Use 只作为没有自动化工具时的降级截图和低风险点击辅助。
- 使用 Computer Use 降级验收时，结论必须基于模拟器当前可见页面、页面路径和交互结果；不要根据 Wxml 面板里的隐藏页面栈误判页面显示状态。
- 验证报告按 `已修 / 待确认 / 通过 / 未能确认` 输出，问题必须包含页面、复现步骤、实际表现、预期和疑似代码位置；微信系统 warning 可记录但不作为业务问题优先处理。

## 组件决策顺序

- 先查项目内封装和事实源：`src/core/components`、当前分包组件、已有同类页面、`docs/codex/nutui-component-registry.md`。
- 交易类通用 UI 优先查 `src/core/components/commerce`，当前包含商品卡、订单卡、优惠券卡、地址卡、提交栏、数量选择、筛选 Tab、SKU 弹层和日期选择。
- 商城多层级 SKU 必须复用 `src/core/utils/sku.ts` 的选择引擎和 `SkuPopup`：页面不得散写规格联动、库存禁用和层级联动逻辑；SKU 遵循“上层决定下层”，下层选择不得反向改动上层，当前上层下不可售的下层项直接置灰禁点；有组合但无库存显示“售罄”，没有对应组合才显示“暂不可选”；真实接口接入时先在 service/adapter 转成 `HkpSkuGroup` + `HkpSkuVariantBase` 兼容结构。
- 商城首页、商品列表、商城分类右侧商品列表的快捷加购必须先判断是否需要 SKU 弹层：无可售规格提示无货，只有 1 个可售组合时直接加车，存在多个可售组合时才在当前页通过 `PageShare` 弹 `SkuPopup`；其它加购入口默认跳商品详情，由详情页承接完整规格和商品信息，不要直接写购物车。
- 通用底部弹层优先查 `src/core/components/AppBottomSheet`，适用于酒店人数、筛选、规则选择等“标题 + 滚动内容 + 可选底部按钮”的底部弹层。
- 日期选择优先使用项目封装 `DateSelectionPopup`，底层使用 NutUI `Calendar`；门票使用单日，酒店使用范围。
- 票务分包底部提交 / 支付固定栏优先使用 `src/pkg-ticket/components/TicketSubmitFooter`，不要在门票预定页和确认订单页分别覆写提交栏形态。
- NutUI 样式依赖 `designWidth=375` 和 `deviceRatio[375]=2`，缺失时会把 NutUI CSS fallback 编译成 `NaNrpx`。
- 再查已安装 UI 库：当前优先 NutUI Taro；命中后也先封装一层项目组件，再给页面或业务代码使用。
- 命中基础状态能力时优先使用项目封装：`BaseSkeleton`、`BaseEmpty`、`BaseException`、`src/core/components/loading`。
- 空态、异常态、加载态等基础状态必须优先使用 NutUI 能力或项目统一封装，不允许页面或通用组件临时自造“空/!”这类文字图形、emoji、伪图标或粗糙占位；如需定制插图，必须以组件封装和真实设计资产方式接入。
- 会被多个页面复用的能力再沉淀到 `src/core/components` 或分包 components。
- 只有项目组件和 NutUI 都不合适，或截图高度定制、微信小程序兼容需要时，才在页面内手写。

## 固定位置

- 主包 tab 页面：`src/pages/{page}/index.*`
- 业务分包页面：`src/pkg-{package}/pages/{page}/index.*`
- 主包 service：`src/core/services/{page}.ts`
- 分包 service：`src/pkg-{package}/services/{page}.ts`
- 真实接口页禁止新增分包运行态 `services/mock-data.ts` 或 `src/core/services/mock.ts`；后端缺口必须进入 BFF 闭环文档。
- HKP 通用 DTO：`src/core/types/hkp.ts`
- 项目级图片组件：`src/core/components/AppImage`
- 项目级图标组件：`src/core/components/AppIcon`
- 路由常量：`src/core/constants/routes.ts`
- 分包页面注册：`src/app.config.ts`

## 默认校验

- 默认按影响范围运行最小门禁，不要每次无差别全跑。
- 只改 SCSS / 页面视觉：运行 `yarn check:page-convention` 和 `git diff --check`；不运行 `typecheck`、`package-boundary`。
- 改 TS/TSX 页面或组件逻辑：运行 `yarn typecheck`、`yarn check:page-convention` 和 `git diff --check`；未动 import / 路由 / 分包时不运行 `package-boundary`。
- 改 service / store / utils / hooks：运行 `yarn typecheck` 和 `git diff --check`；未触达页面 render / SCSS 时不运行 `page-convention`。
- 改路由、`app.config.ts`、分包结构、主包和分包 import 边界：运行 `yarn typecheck`、`yarn check:package-boundary` 和 `git diff --check`。
- 只改 skill / `docs/codex` / 说明性文档：通常只运行 `git diff --check`，必要时用 `grep` 确认规则落点。
- `yarn check:page-convention` 会拦截缺少 `_pg` 根节点、页面名前缀 class、双下划线元素写法、非 `_pg-*` 页面 selector，以及用 `♡/✨/›/×` 等文本符号冒充图标。
- 默认不运行完整 `yarn build:weapp`，除非用户要求或需要排查完整产物。
