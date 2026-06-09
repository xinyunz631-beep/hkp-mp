# 当前小程序状态
## 更新时间

- 更新时间：`2026-06-09 00:20 CST`
- 当前状态：登录、请求、会员状态、页面初始化闸门、页面显式 runtime hook、页面单例 loading、统一 loading 组件入口和白色渐变淡出蒙层、全局登录态弹窗、webpack5 prebundle/cache 关闭、NutUI 按需样式、`@tarojs/plugin-html` 和 `@nutui/icons-react-taro` 显式依赖、BaseSkeleton/BaseEmpty/BaseException、中性页面底色+粉色品牌点缀、自定义 tabbar、独立 PageNavbar 和页面级 header/layout 已完成代码收口并通过本地校验；系统 custom-tab-bar 已压成 0 高度占位，可见 tabbar 已下沉到页面内 fixed 底部容器，`AppTabBar` 已从 `AppIcon` 切为直接 `Image` 小图并在组件顶部集中维护图片链接；会员授权登录已按后端真实接口重接，启动默认 `login -> member/status` 并把头像、昵称、手机号、等级统一维护到 MobX `rootStore.memberInfo`，页面可直接读 `rootStore.isLoggedIn`；登录弹窗只保留手机号授权和关闭；个人信息页新增退出登录；会员资料、头像上传、会员码和会员中心首页不再失败回旧会员 mock。
- 恢复优先级：下一步优先在微信开发工具中验证真实 BFF 授权响应、`member/status` 登录态判断、手机号授权 `code`、资料保存签名、退出登录、首页广告聚合、首页新视觉还原、页面内自定义 tabbar 跳转/选中态、弹层覆盖关系和自定义 navbar 安全区表现。

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
- 门票预定列表接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/purchase/menus?sceneType=TICKET`
- 购票页资源位接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/purchase/resources?sceneType=TICKET&pageCode=PURCHASE_HOME`，需小程序登录态。
- 首页广告聚合接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/content/mini-program/ads?pagecode=index`，需小程序登录态。
- 单广告详情接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/content/mini-program/ads/{id}`，需小程序登录态。
- 资源位广告列表接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/content/mini-program/slots/{slotCode}/ads`，需小程序登录态，用于首页楼层“查看全部”列表页。
- 会员状态接口：`GET https://hellokitty-uat.yoursite.xin/api/bff/auth/member/status`，需小程序登录态；`memberLoggedIn=true` 且 `memberInfo.phone` 有值才视为会员已登录。
- 手机号授权接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/auth/mini-program/phone/authorize`，需小程序登录态 + HMAC 签名；微信只提交 `getPhoneNumber` 返回的 `code`。
- 会员资料接口：`GET/POST https://hellokitty-uat.yoursite.xin/api/bff/crm/profile`；资料保存为登录态 + HMAC 签名，BFF 不暴露 `memberNo/openId/userId`。
- 头像上传接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/files/images`，登录态 multipart，返回 `imageUrl`。
- 退出登录接口：`POST https://hellokitty-uat.yoursite.xin/api/bff/auth/logout`，登录态 + HMAC 签名。
- 业务成功码：`200`
- 普通业务接口 header 只默认带 `Authorization: Bearer <token>`。
- 授权登录/刷新不带业务访问令牌；高风险 BFF 写接口通过 `sign: true` 自动携带 HMAC 签名头。
- 统一 request 层已接入 accessToken 过期自动刷新：业务接口返回 `AUTH_TOKEN_EXPIRED`、`AUTH_TOKEN_INVALID`、HTTP `401` 或旧 `10008` 时，优先调用 `/api/bff/auth/refresh` 换新 `accessToken/refreshToken/signSecret`，然后自动重放原请求一次；多个接口同时过期时共用同一个刷新 Promise。
- Feishu 主文档 13 个 BFF 对外入口已落到 `src/core/services/bff-api.ts` 和请求/登录层；截至后端 `936aa38/00486d4`，除登录和刷新外所有小程序 BFF 业务接口均需登录态，GET 只校验 `Authorization`，不需要签名；购票列表、购票页资源位、首页广告聚合、资源位广告列表和单广告详情均走默认 request 先拿 token；已进入广告真实接口链路的页面失败时不回退旧本地数据；字段和鉴权以 Feishu 主文档、OpenAPI、uat 后续变更记录和 BFF 最新安全配置为准。
- 后端 `c06ca8f` 已移除 `/api/bff/cms/**` 公开白名单；小程序购票页资源位已改走 `/api/bff/purchase/resources`，单个 CMS 资源位查询默认带登录态，不再按免登录接口调用。
- 2026-06-06 复测 `/api/bff/purchase/resources?sceneType=TICKET&pageCode=PURCHASE_HOME` 无 token 返回 500，traceId `65ab9abb2e764e02bca0cf30ae1ad14a`；小程序已让资源位失败只回退图片，不阻断购票列表真实数据，后端仍需排查公开资源位聚合入口。
- 后端 `v0.1.9`/`v0.1.10` 已将小程序登录请求体、`Content-Type`、JWT 签发和 Redis 登录态存储异常转为明确错误码；小程序统一 request 已为 JSON 写请求默认补 `content-type: application/json`，仍需微信开发工具用真实 code 复测登录和刷新响应。
- CRM 已新增 `src/core/services/bff-crm-api.ts`；会员状态、会员资料、会员码、会员中心首页、头像上传和老会员绑定已按真实接口重接，会员资料链路不再失败回本地会员 mock；CRM 入口路径已从 `/api/bff/crm/p1/**` 改为 `/api/bff/crm/entries/**`；资料保存、地址写操作和老会员绑定走 request `sign: true`，待微信开发工具真实登录态验证。
- 订单已新增 `src/core/services/bff-order-api.ts`，覆盖订单提交、详情、列表 BFF 入口；页面交易链路暂未强切，后续按票务/商城/订单中心工作包逐步替换。
- 小程序广告已新增 `src/core/services/mini-program-ad.ts` 和 `src/core/types/mini-program-ad.ts`，首页 `src/pages/home/index.tsx` 已读取 `/api/bff/content/mini-program/ads?pagecode=index`，按 `slotCode` 覆盖顶部轮播、八大导航、节目单、热门项目和吃喝玩乐；顶部轮播优先使用 `index_top_banner`，无数据才兼容旧 `index_banner`。广告聚合和详情请求均先完成小程序授权并携带 `Authorization`，接口失败、核心资源位缺失或详情无数据时进入异常态，不再回退旧本地内容。
- 2026-06-07 已完成首页顶部 banner 真实闭环：使用后台账号真实登录，调用 `/api/admin-config/files/images` 上传 `Desktop/HKP/banner` 下 5 张 JPG，再调用 `/api/content/mini-program/ads` 保存到 `index_top_banner` 资源位；后端已恢复小程序广告 BFF 鉴权，后续验收必须在微信开发工具网络面板确认广告聚合请求携带小程序访问令牌。

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

目标文件职责：

- `src/core/store/member-store.ts`：会员状态、后端访问令牌、手机号、昵称、头像、等级、积分、是否登录。
- `src/core/store/app-store.ts`：登录弹窗可见态、登录原因、登录后续执行。
- `src/core/auth/identity.ts`：唯一登录身份判断来源。
- `src/core/services/auth.ts`：`isLoggedIn`、`ensureLogin`、`runAfterLogin`、`requireLogin`、`withLoginGuard`、`logout`。
- `src/core/runtime/use-page-runtime.tsx`：页面显式接入的运行时 hook，提供 `initPage` 首屏闸门、`renderPage`、页面单例 loading、初始化登录拦截和登录控制。
- `src/core/components/PageRuntimeHost`：页面 runtime 展示节点，不包裹布局，不注册 pageKey。
- `src/core/components/LoginPopup`：登录弹窗，显示关闭跟随全局登录态。
- `src/core/components/loading`：统一维护页面级单例 loading、通用初始化 loading 和首页初始化 loading；新增或调整页面 loading 先改这里。
- `src/core/components/AuthAction`：组件式点击登录拦截。

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

- 根目录已新增 `ROOT-013`、`ROOT-014` 和 `codex/rules/rules-context-maintenance.md`，约束进行中任务高频更新和文档体积治理。
- `src/core/config/env.ts` 已设置 UAT host、BFF 授权路径和微信 AppID fallback，已删除本地 mock API 文件。
- request 已实现 BFF 授权 Promise 队列、业务请求等待授权、提取访问令牌、持久化 `refreshToken/signSecret`、accessToken 过期后 refreshToken 自动刷新并重放原请求、高风险写接口 HMAC 签名，且不再自动维护页面 loading。
- 已新增 `src/core/services/bff-api.ts` 覆盖 Feishu 主文档 13 个 BFF 对外入口；已有交易链路未成熟的接口先以 service 入口落地，页面级接入跟随订单/支付/促销功能推进。
- 已新增 `src/pkg-ticket/services/purchase-api.ts`，并让门票预定页优先读取后端购票列表和 CMS 资源位，失败兜底本地数据。
- NutUI 小程序组件依赖 HTML 模板运行时；新增 NutUI 组件时必须确认 `babel-plugin-import`、`@tarojs/plugin-html`、prebundle/cache 和 NutUI `designWidth=375` 配置链路完整；新增图标相关 UI 默认优先使用 `@nutui/icons-react-taro`。
- 已新增 `member-store`、`app-store` 和 `identity.ts` 登录身份判断。
- 已新增 `usePageRuntime()`、`PageRuntimeHost` 和统一 `src/core/components/loading`，页面显式接入 runtime 并维护本页单例 loading。
- `usePageRuntime` 已支持 `initPage`、`initialLoading`、`refreshLoading`、`errorFallback`、`loginRequired`、`reload` 和 `renderPage`；首页新 UI 把优惠券数量放在首屏 `initPage` 中直接 `await fetchCouponUsedCount()`；该服务在方法内部解析数量，catch 时返回 0，不进入首页失败页。
- `usePageRuntime({ loginRequired: true })` 在用户取消登录后，默认进入业务化登录阻断态，并提供“立即登录”动作重新拉起登录流程。
- 已删除 `runtime/page-loading.ts` 和 `utils/page.ts`，不再使用 pageKey 注册表。
- 已把 `App` 中的可见登录弹窗和 loading 挪出。
- 已将 `src/core/components/LoginPopup` 调整为关闭后销毁节点，减少微信开发工具辅助树里残留弹窗节点对验收判断的干扰。
- 首页已按 Pencil 750px 可开发稿重做：顶部动态 banner 为灰色占位，去除截图稿顶部标题和外侧边距；会员卡、快捷入口、营业时间、交通/导览按钮、榜单、精选活动、玩乐攻略、会员福利和园区动态已落入 `src/pages/home`；登录能力由签到、会员相关快捷入口和福利入口触发；优惠券数量接口通过 `src/core/services/home.ts` 安全服务补充徽章。
- 旧 `session-store`、旧 `ui-store` 以及 `rootStore.session` / `rootStore.ui` 旧引用已清理。
- `yarn typecheck`、`yarn build:weapp`、`yarn check:package-boundary`、`yarn check:main-package:build` 已通过；包体检测输出到 `.dist-check/main-package`，不覆盖 `dist/`，`dist` 未出现 prebundle wxss JS require。`yarn check:main-package` 会读取当前 `dist/`，如旧产物带 sourcemap 可能误报，需要以隔离构建命令为准。
- 已通过 Taro `mini.sassLoaderOption.additionalData` 全局注入 `src/styles/tokens.scss`，维护 hkitty 粉色 Sass 变量和 `$color-primary` 等 NutUI 变量，并将旧绿色品牌色改为 Sass 主题 token。
- 已新增 `src/custom-tab-bar`，按 Taro 自定义 tabbar 约定保留 0 高度系统占位。
- 已新增 `src/core/components/AppTabBar`，在页面内 fixed 底部容器实现图片、文本、选中态和 `switchTab` 跳转；2026-06-08 已把原 `AppIcon` 图标改为直接 `Image` 小图，组件顶部集中维护每个入口选中/未选中链接，普通图 36px、选中图 44px、中间会员码 100px，解决系统 custom-tab-bar 层级过高问题。
- 已新增 `src/core/components/PageNavbar`，并由 `PageShell` 作为 `PageLayout` 的 header 传入。
- 已将 `PageNavbar` 默认左侧 icon 改为 NutUI `ArrowLeft`，并移除票务页单独的首页图标入口，当前非 tab 页面统一走同一套返回 icon 和居中标题。
- 已新增 `src/core/components/PageLayout`，支持 fixed header/footer、可配置 ScrollView / 普通 View 两种中间布局、页面级覆盖层插槽和页面内 fixed tabbar；滚动内容上下会根据 header/footer 高度自动插入占位节点，末尾还会预留 tabbar 空间。
- 已将票务首页补齐为票务服务聚合入口，串联乐园详情、门票预定和乐园导览；乐园导览页已补地图占位、服务分区和到园提示。
- 已按暂缓策略为餐饮页和会员分销/提现页补齐业务化准备中状态页，避免空白骨架直接展示给用户。
- 已新增 `src/core/utils/style.ts`，集中封装设备信息、navbar 胶囊尺寸、selector rect 高度和底部安全区判断。
- 已将主包 tab 页面导航栏切到 `navigationStyle: 'custom'`，由 `PageLayout` 统一处理状态栏和微信胶囊避让。
- 已新增 `yarn check:main-package:build`，通过 `HKITTY_MP_OUTPUT_ROOT=.dist-check/main-package` 隔离构建并检测主包体积，不覆盖 `dist/`。
- 已新增 `pkg-member/pages/member-code` 会员码页面，使用 `weapp-qrcode` 生成二维码，服务层读取 `/api/bff/crm/member-code` 的 `qrContent`，页面按 30 秒自动刷新；页面内底部 tabbar 中间会员码按钮已跳转到该分包页。
- 已新增 `pkg-member/pages/coupon-center` 领券中心页面，首页第二个快捷入口登录后进入该页；页面顶部“好券推荐 / K币兑换”放入 `PageHeader`，当前 mock 返回空券列表并展示无可领取或可兑换优惠券空态。
- `pkg-member/pages/coupons` 已改为“我的优惠券”页，顶部“已领取 / 已使用 / 已过期”放入 `PageHeader`，券面按接口字段渲染，底部固定“获取更多好券”跳领券中心，mock id 已改为数字字符串，券使用类型使用数字枚举 `useType`。线上券点击进入 `mallProducts?couponId=...`，商品列表通过 `fetchCouponApplicableProductsData(couponId)` mock 独立“券适用商品”接口，线下或未知类型兜底进入会员码。
- 已新增 `pkg-member/pages/member-growth` 和 `pkg-member/pages/member-growth-detail` 会员权益 / 成长值独立页面；首页、我的页、会员中心和权益/成长值页统一读取会员资料中的 `levelId / levelNo / levelName / growthValue / avatarUrl`，头像通过 `resolveMemberAvatar()` 统一兜底，主包“我的”页会员卡、会员等级标签和“会员权益”服务行，首页会员 banner / 会员福利卡，以及会员分包首页“会员权益”分区项均进入会员权益页，会员权益按等级数据渲染 swiper 权益图，权益页成长值按钮进入独立明细页，成长值页展示 mock 记录或统一空态，两个页面分别承载对应规则弹层，复杂视觉图用 `AppImage` 空图占位等待接口或素材替换。
- 首页广告已切到后端聚合数据：`index_top_banner/index_nav_grid/index_schedule/index_hot_project/index_activity/index_recommend/index_member_benefit/index_play_life` 覆盖对应楼层，八大导航现在渲染后台标题和图标，点击统一走 `src/core/utils/ad-click.ts`；首页广告点击到活动/项目/节目单详情页时必须把后端广告 `id` 写入路由，详情页再调用 `/api/bff/content/mini-program/ads/{id}`，正文只把后端 `richTextHtml/richText` 原文传给小程序 `RichText`。
- 首页楼层“查看全部”已改为路由参数携带 `slotCode/title`，热玩项目列表和活动/推荐列表直接调用 `/api/bff/content/mini-program/slots/{slotCode}/ads`；`src/pkg-ticket/services/activity.ts` 和 `src/pkg-ticket/services/park-list.ts` 已删除旧本地列表 mock，空数组进入页面空态，接口失败进入异常态。
- 2026-06-08 已通过后台真实接口补齐 `pagecode=index` 首页资源位：顶部 Banner 5、八大导航 8、节目单 1、热门项目 2、精选活动 1、精彩推荐 2、会员福利 1、吃喝玩乐 9；小程序 `yarn typecheck` 已通过，BFF 无小程序登录态直接回读为空，最终需在微信开发工具确认授权后接口返回、首页渲染和广告详情页回查。
- 2026-06-09 已按后端 `uat` 最新会员授权接口重接小程序会员链路：`login` 只换 BFF token，`member/status` 统一判断并缓存会员登录态；受保护入口只读 `rootStore.isLoggedIn` 拦截，未登录缓存态不再重复调用 login/memberStatus；微信手机号授权调用 `/api/bff/auth/mini-program/phone/authorize`；登录弹窗删除微信资料登录和本地会员登录；个人信息页新增退出登录；会员资料、头像上传、会员码和会员中心首页删除本地会员 mock 兜底；CRM 入口路径改为 `/api/bff/crm/entries/**`。

## 当前待验证

- 在微信开发工具中确认 BFF 授权响应结构，尤其是访问令牌、`refreshToken` 和 `signSecret` 实际位置，并复测登录/刷新异常是否返回 `400/415/AUTH_TOKEN_*` 等明确错误码；重点验证 `AUTH_TOKEN_EXPIRED` 场景会自动 refresh、重放原请求并刷新 `member/status`。
- 在微信开发工具中验证启动默认 `login -> member/status`，以及 `rootStore.memberInfo` 驱动首页/我的/会员中心/会员权益/个人信息页头像昵称手机号自动刷新。
- 在微信开发工具中验证受保护入口：启动已缓存未登录态时，点击会员码/订单/地址/购物车等入口应直接弹登录弹窗，不再重复触发 login/memberStatus；手机号授权 `getPhoneNumber` 返回 `code` 后调用 `/api/bff/auth/mini-program/phone/authorize`，成功后用当前 token 刷新 `member/status`；旧 `encryptedData/iv` 不作为登录凭证。
- 在微信开发工具中用真实登录态验证登出、支付预下单、促销试算等签名写接口 header 和后端响应。
- 在微信开发工具网络面板确认购票列表、购票资源位、单 CMS 资源位、首页广告聚合和资源位广告列表均携带小程序 `Authorization`，并目视确认购票页失败兜底、首页资源位渲染和列表空态。
- 验证首页优惠券数量、签到/会员入口登录弹窗续执行、会员码二维码 canvas 和 30 秒刷新。
- 验证 `withLoading` 只显示当前页面唯一 loading，不跨页面残留或重叠。
- 目视确认首页新视觉、会员入口、登录弹窗、页面 loading、tabBar 选中态、自定义 navbar 胶囊避让和弹层覆盖；验收以模拟器可见画面为准。

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
- 不要让本地 mock 地址、示例地址或 `mock`、`CSESSION`、`V2`、`Taro`、技术栈名、开发态等内部字眼出现在界面里。
