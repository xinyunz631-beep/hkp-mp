# 当前小程序状态

## 更新时间

- 更新时间：`2026-05-17`
- 当前状态：登录、请求、会员状态、页面初始化闸门、页面显式 runtime hook、页面单例 loading、统一 loading 组件入口和白色渐变淡出蒙层、全局登录态弹窗、webpack5 prebundle/cache 关闭、NutUI 按需样式、`@tarojs/plugin-html` 和 `@nutui/icons-react-taro` 显式依赖、BaseSkeleton/BaseEmpty/BaseException、中性页面底色+粉色品牌点缀、自定义 tabbar、独立 PageNavbar 和页面级 header/layout 已完成代码收口并通过本地校验；系统 custom-tab-bar 已压成 0 高度占位，可见 tabbar 已下沉到页面内 fixed 底部容器；首页已按最新 Pencil 画板重排为透明固定导航、高 banner、会员信息卡、上图下文开园时间卡、横滑热玩榜单、精选活动、精彩推荐、会员专享福利和玩转乐园九宫格，优惠券数量放在首页 `initPage` 中直接 await，服务层 catch 兜底返回 0，异常不进入首页失败态；新增 `docs/ui` 小程序 UI 工程事实源和 `check:ui-contract` 校验，用于 Pencil/Figma 设计、页面 MD、Codex 开发之间保持同步。
- 恢复优先级：下一步优先在微信开发工具中验证真实 V2 响应、首页优惠券数量、首页新视觉还原、登录弹窗交互、页面内自定义 tabbar 跳转/选中态、弹层覆盖关系和自定义 navbar 安全区表现。

## 恢复时先看

1. 根目录 `codex/current/current-task-list.md`
2. 根目录 `codex/current/current-mini-program.md`
3. 本文件
4. `mini-program/AGENTS.md`
5. `mini-program/CONSTRAINTS.md`

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

- AppID：`wx00261f550fdbc7ea`
- UAT host：`https://pre-weapp.hefunoodles.com`
- V2 授权地址：`https://pre-weapp.hefunoodles.com/hll-auth-client/oauth2/login/V2`
- 首页优惠券数量接口：`https://pre-weapp.hefunoodles.com/coupon/applet/used/count`
- 业务成功码：`200`
- 普通业务接口 header 只默认带 `CSESSION`。
- 授权相关接口不带 `CSESSION`。

## 登录体系目标

核心原则：

- `App` 不作为可见 UI 全局容器。
- 登录弹窗由页面 runtime 承载；`openLogin` / `requestLogin` 先检查全局登录态，已登录时直接关闭并续执行。
- 登录弹窗不使用 `pageKey` / `ownerKey` 判断登录完成状态。
- 登录成功后，所有页面上已展示的登录弹窗都必须关闭。
- 页面 loading 由页面 hook 本地维护，一个页面同时只展示一个 loading。
- request 不自动维护页面 loading；业务请求需要 loading 时用 `usePageRuntime().withLoading(...)` 包裹。
- 首屏依赖初始化接口、页面级 loading 或初始化登录拦截的页面默认用 `usePageRuntime({ initPage })` + `pageRuntime.renderPage(...)`；静态页不强制。
- 有 `CSESSION` 只代表后端会话可用。
- V2 返回 `mobile` 且有值才代表用户已登录。
- 登录判断只走封装方法，不允许页面散写字段判断。

目标文件职责：

- `src/core/store/member-store.ts`：会员状态、`CSESSION`、手机号、昵称、头像、等级、积分、是否登录。
- `src/core/store/app-store.ts`：登录弹窗可见态、登录原因、登录后续执行。
- `src/core/auth/identity.ts`：唯一登录身份判断来源。
- `src/core/services/auth.ts`：`isLoggedIn`、`ensureLogin`、`runAfterLogin`、`requireLogin`、`withLoginGuard`、`logout`。
- `src/core/runtime/use-page-runtime.tsx`：页面显式接入的运行时 hook，提供 `initPage` 首屏闸门、`renderPage`、页面单例 loading、初始化登录拦截和登录控制。
- `src/core/components/PageRuntimeHost`：页面 runtime 展示节点，不包裹布局，不注册 pageKey。
- `src/core/components/LoginPopup`：登录弹窗，显示关闭跟随全局登录态。
- `src/core/components/loading`：统一维护页面级单例 loading、通用初始化 loading 和首页初始化 loading；新增或调整页面 loading 先改这里。
- `src/core/components/AuthAction`：组件式点击登录拦截。

## 页面布局与导航

- `src/app.config.ts` 已按 Taro 自定义 tabbar 约定配置 `tabBar.custom = true`，保留 `tabBar.list` 作为微信小程序识别 tab 页的来源。
- `src/custom-tab-bar` 是 Taro 自定义 tabbar 组件目录，但只渲染 0 高度占位，避免微信系统 tabbar 层级压过页面弹层。
- `src/core/components/AppTabBar` 是真实可见 tabbar；每个 tabbar item 由 CSS ICON、文本和 `Taro.switchTab` 跳转组成，选中态根据当前页面栈路由计算，外层由 `PageLayout` fixed 到底部。
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
- `yarn dev:weapp` watch 当前仍在运行，最近一次 webpack 显示 compiled successfully。
- 已新增源码环境文件 `src/core/config/env.ts`。
- 已设置 UAT host 和 V2 token path。
- 已设置微信 AppID。
- 已删除本地 mock API 文件。
- 已开始实现 V2 授权 Promise 队列。
- 已开始实现业务请求统一等待 V2 授权。
- 已开始从 V2 响应中提取 `mobile`。
- request 不再自动维护页面 loading。
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
- 已新增 `src/core/components/AppTabBar`，在页面内 fixed 底部容器实现 ICON、文本、选中态和 `switchTab` 跳转，解决系统 custom-tab-bar 层级过高问题。
- 已新增 `src/core/components/PageNavbar`，并由 `PageShell` 作为 `PageLayout` 的 header 传入。
- 已将 `PageNavbar` 默认左侧 icon 改为 NutUI `ArrowLeft`，并移除票务页单独的首页图标入口，当前非 tab 页面统一走同一套返回 icon 和居中标题。
- 已新增 `src/core/components/PageLayout`，支持 fixed header/footer、可配置 ScrollView / 普通 View 两种中间布局、页面级覆盖层插槽和页面内 fixed tabbar；滚动内容上下会根据 header/footer 高度自动插入占位节点，末尾还会预留 tabbar 空间。
- 已将票务首页补齐为票务服务聚合入口，串联乐园详情、门票预定和乐园导览；乐园导览页已补地图占位、服务分区和到园提示。
- 已按暂缓策略为餐饮页和会员分销/提现页补齐业务化准备中状态页，避免空白骨架直接展示给用户。
- 已新增 `src/core/utils/style.ts`，集中封装设备信息、navbar 胶囊尺寸、selector rect 高度和底部安全区判断。
- 已将主包 tab 页面导航栏切到 `navigationStyle: 'custom'`，由 `PageLayout` 统一处理状态栏和微信胶囊避让。
- 已新增 `yarn check:main-package:build`，通过 `HKITTY_MP_OUTPUT_ROOT=.dist-check/main-package` 隔离构建并检测主包体积，不覆盖 `dist/`。
- 已新增 `pkg-member/pages/member-code` 会员码页面，使用 `weapp-qrcode` 生成二维码，服务层先 mock 返回会员码字符串，页面按 30 秒自动刷新；页面内底部 tabbar 中间会员码按钮已跳转到该分包页。
- 当前主包体积：未触发预警。

## 当前待验证

- 在微信开发工具中确认 V2 响应结构，尤其是 `CSESSION` 和 `mobile` 实际位置。
- 验证首页优惠券接口成功时展示数量徽章，失败时服务层返回 0 且不触发首页失败态。
- 验证签到、会员类快捷入口和会员福利入口触发的登录弹窗与续执行。
- 验证使用 `withLoading` 包裹的业务请求只显示当前页面唯一 loading，不跨页面残留或重叠。
- 在微信开发工具中确认会员码页面的二维码 canvas 渲染、30 秒刷新和登录中断引导。
- 在微信开发工具中目视确认首页新视觉、会员入口、登录弹窗、页面 loading 和 tabBar 选中态的粉色主题表现。
- 在微信开发工具中确认页面内自定义 tabbar 四个入口可跳转、选中态正确，登录弹窗/loading 能盖住 tabbar，且自定义 navbar 在不同机型胶囊和状态栏下不遮挡。
- 用微信开发工具做验收时以模拟器可见画面为准；辅助树会同时列出隐藏 webview，不能只靠辅助树判断页面是否叠层。
- 如果 V2 字段结构与当前兼容逻辑不一致，调整 `src/core/request/index.ts`。

## 首页登录触发入口

首页已不再展示内部验证区，登录能力通过业务入口覆盖这些场景：

- 签到：未登录时先打开登录弹窗，登录后继续签到。
- 会员类快捷入口：未登录时先打开登录弹窗，登录后继续进入或展示业务提示。
- 会员福利横幅：未登录时先打开登录弹窗，登录后进入会员权益方向。
- 普通入口：不展示内部技术文案，只做业务跳转或业务提示。

用户可见文案禁止出现：`mock`、`CSESSION`、`V2`、`Taro`、技术栈名、组件库名、开发态或测试态等内部字眼。

## 恢复命令

```bash
cd /Users/kite/Desktop/vibe-coding/codex/hkitty-fe/mini-program
nvm use
yarn dev:weapp
```

修完后校验：

```bash
yarn typecheck
yarn check:package-boundary
yarn check:main-package:build
```

## 不要忘记

- 用户已经在微信开发工具里打开了项目。
- 不要再把登录弹窗当作 H5 全局 DOM 使用。
- 不要再把 loading 计数放进全局 store，也不要用 pageKey 注册表；页面通过 `usePageRuntime()` 控制本页唯一 loading，展示组件统一维护在 `src/core/components/loading`。
- 不要让本地 mock 地址、示例地址或内部技术字眼出现在界面里。
- 当前半改代码先不要提交，等编译和微信开发工具验证通过后再提交。
