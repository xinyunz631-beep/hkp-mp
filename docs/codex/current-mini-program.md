# 当前小程序状态

## 更新时间

- 更新时间：`2026-05-12 10:10 CST`
- 当前状态：登录、请求、会员状态、页面级单例 loading、全局登录态弹窗、全局粉色 UI 主题、自定义 tabbar、独立 PageNavbar 和页面级 header/layout 已完成代码收口并通过本地校验；系统 custom-tab-bar 已压成 0 高度占位，可见 tabbar 已下沉到页面内 fixed 底部容器，header/footer 也已改成 fixed 定位，中间区域通过占位节点自适应剩余高度，底部安全区已改为微信设备信息判断。
- 恢复优先级：下一步优先在微信开发工具中验证真实 V2 响应、首页优惠券数量、登录弹窗交互、页面内自定义 tabbar 跳转/选中态、弹层覆盖关系和自定义 navbar 安全区表现。

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
- 全局 UI 主题：Taro `mini.sassLoaderOption.additionalData` + `src/styles/tokens.scss`，主题色粉色 `#db2777`。
- Codex 主包体积检测命令：`yarn check:main-package:build`，输出目录 `.dist-check/main-package`，不覆盖微信开发工具使用的 `dist/`。
- 当前只按微信小程序 `weapp` 目标实现和验收。
- 暂不考虑 H5 和其他端。
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
- 登录弹窗由页面宿主承载，但显示关闭必须跟随全局登录态。
- 登录弹窗不使用 `pageKey` / `ownerKey` 判断登录完成状态。
- 登录成功后，所有页面上已展示的登录弹窗都必须关闭。
- 页面 loading 由页面宿主本地维护，一个页面同时只展示一个 loading。
- request 默认自动打开和关闭当前页面 loading，不使用全局 `loadingCount`。
- 有 `CSESSION` 只代表后端会话可用。
- V2 返回 `mobile` 且有值才代表用户已登录。
- 登录判断只走封装方法，不允许页面散写字段判断。

目标文件职责：

- `src/core/store/member-store.ts`：会员状态、`CSESSION`、手机号、昵称、头像、等级、积分、是否登录。
- `src/core/store/app-store.ts`：登录弹窗可见态、登录原因、登录后续执行。
- `src/core/auth/identity.ts`：唯一登录身份判断来源。
- `src/core/services/auth.ts`：`isLoggedIn`、`ensureLogin`、`runAfterLogin`、`requireLogin`、`withLoginGuard`、`logout`。
- `src/core/components/PageRuntimeHost`：页面级运行时宿主，承载登录弹窗和页面唯一 loading。
- `src/core/components/LoginPopup`：登录弹窗，显示关闭跟随全局登录态。
- `src/core/components/PageLoading`：页面级单例 loading。
- `src/core/runtime/page-loading.ts`：页面 loading 控制器注册和请求层自动开关。
- `src/core/components/AuthAction`：组件式点击登录拦截。

## 页面布局与导航

- `src/app.config.ts` 已按 Taro 自定义 tabbar 约定配置 `tabBar.custom = true`，保留 `tabBar.list` 作为微信小程序识别 tab 页的来源。
- `src/custom-tab-bar` 是 Taro 自定义 tabbar 组件目录，但只渲染 0 高度占位，避免微信系统 tabbar 层级压过页面弹层。
- `src/core/components/AppTabBar` 是真实可见 tabbar；每个 tabbar item 由 CSS ICON、文本和 `Taro.switchTab` 跳转组成，选中态根据当前页面栈路由计算，外层由 `PageLayout` fixed 到底部。
- 主包 tab 页面配置 `navigationStyle: 'custom'`，不使用微信默认导航栏。
- `src/core/components/PageNavbar` 是独立导航栏组件，读取状态栏和微信右侧胶囊位置，可作为 layout header 内容。
- `src/core/components/PageLayout` 是页面级布局组件：header/footer 都是 fixed 定位，层级高于中间内容；中间区域根据是否传入 `scrollViewProps` 决定使用 `ScrollView` 还是普通 `View`，并通过 JS 动态计算显式高度或占位节点撑开上下空间；页面内 tabbar 也 fixed 到底部，内容末尾额外预留 tabbar 空间。
- `PageRoot` / `PageShare` 是页面级相对插槽，和 header/footer 同级，默认按普通内容渲染但层级高于它们，适合放不需要 fixed 的补充内容。
- `PageShell` 支持把自定义 `className` 透传到最外层 `PageLayout`，便于页面内覆盖已有 layout 样式。
- `src/core/utils/style.ts` 集中封装 navbar 胶囊尺寸、窗口高度、selector rect 高度和微信设备底部安全区判断。
- `src/app.scss` 已统一给 `view`、`text`、`button`、`scroll-view` 等常用宿主元素设置 `box-sizing: border-box`。
- 底部安全区不使用 CSS `env(safe-area-inset-bottom)`；需要底部安全区的设备统一加 20Px 占位元素，避免被 Taro 转成 `rpx`。
- `scroll-view padding="{{...}}"` 若仅来自 Taro 生成模板，不通过本地插件改写构建产物；业务侧 tabbar 预留使用占位节点。
- `PageShell` 已基于 `PageLayout` 改造，主包页面默认渲染页面内 `AppTabBar`。
- `PageRuntimeHost` 内的 `LoginPopup` 和 `PageLoading` 采用常驻渲染、仅切换显示态，避免弹层节点进出树影响页面滚动位置。

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
- 已将 request 默认 loading 改为当前页面自动打开/关闭的单例 loading。
- 已新增 `member-store`、`app-store` 和 `identity.ts` 登录身份判断。
- 已新增 `PageRuntimeHost`、`PageLoading` 和 `runtime/page-loading.ts`，页面内部维护单例 loading 并替代旧 `GlobalLoading`。
- 已把 `App` 中的可见登录弹窗和 loading 挪出。
- 首页已准备请求真实优惠券数量接口，并新增临时登录能力验证区；另已补临时 header/footer 动态布局探针，2 秒和 4 秒分别追加渲染元素，用于观察 `PageLayout` 的动态重测。
- 旧 `session-store`、旧 `ui-store` 以及 `rootStore.session` / `rootStore.ui` 旧引用已清理。
- `yarn typecheck`、`yarn check:package-boundary`、`yarn check:main-package:build` 已通过；包体检测输出到 `.dist-check/main-package`，不覆盖 `dist/`。
- 已通过 Taro `mini.sassLoaderOption.additionalData` 全局注入 `src/styles/tokens.scss`，维护 hkitty 粉色 Sass 变量和 `$color-primary` 等 NutUI 变量，并将旧绿色品牌色改为 Sass 主题 token。
- 已新增 `src/custom-tab-bar`，按 Taro 自定义 tabbar 约定保留 0 高度系统占位。
- 已新增 `src/core/components/AppTabBar`，在页面内 fixed 底部容器实现 ICON、文本、选中态和 `switchTab` 跳转，解决系统 custom-tab-bar 层级过高问题。
- 已新增 `src/core/components/PageNavbar`，并由 `PageShell` 作为 `PageLayout` 的 header 传入。
- 已新增 `src/core/components/PageLayout`，支持 fixed header/footer、可配置 ScrollView / 普通 View 两种中间布局、页面级覆盖层插槽和页面内 fixed tabbar；滚动内容上下会根据 header/footer 高度自动插入占位节点，末尾还会预留 tabbar 空间。
- 已新增 `src/core/utils/style.ts`，集中封装设备信息、navbar 胶囊尺寸、selector rect 高度和底部安全区判断。
- 已将主包 tab 页面导航栏切到 `navigationStyle: 'custom'`，由 `PageLayout` 统一处理状态栏和微信胶囊避让。
- 已新增 `yarn check:main-package:build`，通过 `HKITTY_MP_OUTPUT_ROOT=.dist-check/main-package` 隔离构建并检测主包体积，不覆盖 `dist/`。
- 当前主包体积：未触发预警。

## 当前待验证

- 在微信开发工具中确认 V2 响应结构，尤其是 `CSESSION` 和 `mobile` 实际位置。
- 验证首页优惠券接口是否携带正确 header 并返回数量。
- 验证临时登录能力验证区的弹窗、续执行和退出后再测。
- 验证业务请求期间只显示当前页面唯一 loading，不跨页面残留或重叠。
- 在微信开发工具中目视确认首页、会员入口、登录弹窗、页面 loading 和 tabBar 选中态的粉色主题表现。
- 在微信开发工具中确认页面内自定义 tabbar 四个入口可跳转、选中态正确，登录弹窗/loading 能盖住 tabbar，且自定义 navbar 在不同机型胶囊和状态栏下不遮挡。
- 如果 V2 字段结构与当前兼容逻辑不一致，调整 `src/core/request/index.ts`。

## 首页临时验证区

需要在首页临时放一块验证区，覆盖这些场景：

- 当前是否已登录。
- 当前会员手机号。
- 当前会话是否就绪，文案用业务口径。
- 点击直接打开登录弹窗。
- 函数执行前先登录，登录后继续执行。
- 使用 `AuthAction` 包裹按钮，登录后继续执行。
- 退出登录后重新验证。

用户可见文案禁止出现：

- `mock`
- `CSESSION`
- `V2`
- `Taro`
- 技术栈名
- 组件库名
- 开发态、测试态等内部字眼

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
- 用户希望开发时一条 `yarn dev:weapp` 就能 watch 热更新。
- 不要再把登录弹窗当作 H5 全局 DOM 使用。
- 不要再把 loading 计数放进全局 store；页面宿主只渲染一个 `PageLoading`。
- 不要让本地 mock 地址、示例地址或内部技术字眼出现在界面里。
- 当前半改代码先不要提交，等编译和微信开发工具验证通过后再提交。
