# 小程序页面基础设施

## 目标

本文件是 `$mpcode-page` 的当前项目事实源。页面任务先读这里，再进入具体页面实现，避免每次重复推导通用组件和方法。

## 页面默认骨架

- 新建页面默认使用 `PageShell`。
- `PageShell` 外层必须包一层 `<View className="_pg">`，作为页面级样式作用域根节点。
- 新建页面默认使用 `usePageRuntime()`，首屏依赖接口、登录拦截或页面 loading 时传 `initPage`。
- `usePageRuntime({ loginRequired: true })` 页面在用户取消登录后，默认进入业务化登录阻断态，并提供“立即登录”重试入口。
- 新建页面默认使用 `observer(function PageName() {})` 包裹，减少后续接入 MobX 状态时的返工。
- 页面只负责渲染、交互和状态组合；接口、默认值和失败兜底放到 service。
- 用户可见文案禁止出现 `mock`、组件库、技术栈、开发态或测试态字眼。
- 商用级补完页面使用 `commercial-ready` 状态；必须在页面文档记录交互矩阵、状态矩阵和微信开发工具验收清单。

## 多页面流开发

- 只有用户明确说一次开发多个页面、多页面流程、多张截图分别对应多个页面、或从 A 到 B 到 C 一起做时，才进入多页面流开发。
- 同一个页面的首屏/中屏/底部/滚动态、多状态截图、补充参考图，不触发多页面流开发。
- 触发后先建立页面清单：`pageKey`、标题、主包/分包、路由、navbar、登录要求、截图归属、入口和下一跳。
- 截图归属不明确时只问一个最关键问题；能合理判断时直接继续。
- 先批量生成或定位页面骨架、route、app.config 和 registry，再逐页实现 UI 和业务。
- 只有 2 个以上页面明确复用同一 UI 或逻辑时，才抽公共组件或 util；否则保持页面内最小实现，避免过度抽象。
- 每个页面都必须遵守 `PageShell`、`usePageRuntime`、`observer`、`_pg-*` BEM 和 `AppImage` 等页面基础约束。
- 每个页面都同步 `docs/ui/pages/{page}.md` 和 `docs/ui/page-registry.yaml`，最后用类型、页面约束、包边界和 UI contract 做批量验证。

## 导航规则

- 使用 `PageShell` 默认 navbar 的页面，必须在页面 `config.ts` 声明 `navigationStyle: 'custom'`。
- 使用系统导航栏的页面，传 `navbar={false}`，且 `config.ts` 只保留系统标题。
- `navbar={false}` 且自定义顶部栏的页面，顶部内容必须放入 `PageHeader`，由 `PageShell` 统一注入微信状态栏高度和右侧胶囊避让；不要把搜索栏、返回栏直接放进滚动内容顶部。
- `navbar={false}` 的非全屏业务页必须在 `PageHeader` 内保留显式返回入口，并统一调用 `navigateBackOrHome()`；搜索、筛选、分类等自定义顶部栏不能只保留输入框或取消按钮。
- `PageShell` 默认 navbar 如果存在 `navbarRight`，标题必须左对齐，右侧操作按钮必须在微信胶囊内容高度内垂直居中；没有右侧操作时标题保持居中。
- 主包 tab 页面不展示返回按钮；页面内底部 tabbar 只由首页和“我的”页显式开启。
- `PageShell` 默认不展示底部 `AppTabBar`；只有首页和“我的”页显式传 `reserveTabBarSpace` 开启页面内 tabbar。
- 非 tab 自定义 navbar 页面默认使用 `navigateBackOrHome()` 返回。
- 页面栈判断和“有上一页则返回、无上一页则回首页”的按钮事件必须封装在 `src/core/utils/navigation.ts`，页面或状态组件不要直接散写 `Taro.getCurrentPages()`。
- 首页错误态不展示返回入口；通用错误组件需要临时隐藏返回时使用 `hideBack`，不要在页面里重复写路由判断。
- 首页这类特殊页面可关闭 `PageShell` navbar 并自己实现固定导航。

## 布局规则

- `PageLayout` 的 footer 只有存在真实 footer/bottom 内容时才渲染固定区域，并默认给整个 footer 区域白色背景，确保底部操作栏和安全区占位视觉连续。
- 页面涉及底部固定栏、footer、弹层底部操作区时，不要再在页面或组件里追加 `env(safe-area-inset-bottom)`；安全区由 `PageLayout / layout` 统一承接，页面只写业务需要的常规 padding。
- 页面级弹层、浮层和遮罩默认放入 `PageShell` 的直接子节点 `PageShare` / `PageRoot`，不要放在滚动内容里；日期、优惠券、规则说明、SKU、筛选、支付确认类弹层都必须高于 `PageLayout` 的 header/footer/tabbar。
- 全局 loading、popup、runtime host、toast bridge、页面级 overlay 等全局状态组件，最外层 host 节点必须常驻渲染；显示隐藏只控制下一层真实节点或 class，避免 `PageLayout` / `ScrollView` 周边节点增删导致滚动回到顶部。
- 分包默认不要开启 `independent: true`；独立分包不会继承主包 `app.scss -> app.wxss/app-origin.wxss` 的全局样式，只有明确需要独立启动能力时才单独评估开启。

## 页面样式规则

- 页面根容器固定使用 `_pg`，用于覆盖当前页面内的 `PageShell`、`PageLayout` 等局部样式。
- 页面业务 class 统一以 `_pg-` 开头，避免和全局组件、NutUI 或其他页面样式冲突。
- 页面 class 遵循 BEM，元素连接符使用单下划线，例如 `_pg-banner_container`、`_pg-banner_item`；状态使用双横线，例如 `_pg-banner_item--active`。
- 页面 SCSS 尽量使用嵌套写法，例如 `._pg-banner { &_container {} &_item { &--active {} } }`。
- 已有页面只要本次修改触达 render 或 SCSS，就必须把触达区域迁到 `_pg-*`；如果本次是页面级重写、首页整体调整或重构样式文件，则整页统一迁到 `_pg-*`，不要保留页面名前缀逃逸。

## 图片与图标规则

- 页面内真实图片区域统一使用项目封装 `AppImage`，不用 CSS 渐变、色块或组合图形模拟图片内容，也不要在页面里直接散用 Taro `Image`。
- 图片地址在 render 内显式声明变量，默认空字符串，例如 `const bannerImageSrc = '';`，后续再替换为接口字段或固定 CDN。
- 图片尺寸优先通过 `AppImage` 的 `width`、`height`、`style` 或业务 class 控制；需要改内部 `Image` 样式时再用 `imageStyle`。
- 图片未接入真实地址时，由 `AppImage` 灰色背景占位；如果页面需要把空地址显式暴露为失败/catch 态，传 `emptyState="error"`。
- 图片加载中和加载失败都保留灰底，loading 居中且默认按传入宽度自适配大小，加载完成后去除灰底并淡入真实图片，不展示技术占位文案。
- 图标先查项目内封装；NutUI 有匹配项时先封装为项目组件，例如 `AppIcon`，再在页面使用；找不到合适图标时使用图片组件并将 `src` 默认置空，等待补链接。
- `AppIcon` 默认尺寸按 `14-16` 书写，优先从 `16` 开始；只有主视觉、悬浮主按钮、空态插图辅助等明确需要放大的场景，才额外写到 `18+`，不要默认给 `20+`。
- 功能性图标必须走 `AppIcon` / NutUI icon / 项目封装，不允许用 CSS `::before` / `::after` 绘制；伪类仅可用于装饰线、骨架光效和背景氛围。

## 微信能力规则

- 当前只按微信小程序 `weapp` 实现和验收，不为 H5 或其它端写兼容分支。
- 图片预览、扫码、地图、电话、复制、确认弹窗和 toast 默认优先使用 `src/core/utils/wechat-actions.ts` 封装。
- 页面可见点击必须落到跳转、弹层、微信 API、本地状态变化、登录拦截或提交结果，不允许用“即将开放”作为非暂缓页面兜底。

## 组件决策顺序

- 先查事实源：`docs/ui/components.md` 和 `docs/codex/nutui-component-registry.md`。
- 先查项目内封装：`src/core/components`、当前分包组件、已有同类页面。
- 交易类通用 UI 优先查 `src/core/components/commerce`，当前包含商品卡、订单卡、优惠券卡、地址卡、提交栏、数量选择、筛选 Tab、SKU 弹层和日期选择。
- 日期选择优先使用项目封装 `DateSelectionPopup`，底层使用 NutUI `Calendar`；门票使用单日，酒店使用范围。
- NutUI 样式依赖 `designWidth=375` 和 `deviceRatio[375]=2`，缺失时会把 NutUI CSS fallback 编译成 `NaNrpx`。
- 再查已安装 UI 库：当前优先 NutUI Taro；命中后也先封装一层项目组件，再给页面或业务代码使用。
- 命中基础状态能力时优先使用项目封装：`BaseSkeleton`、`BaseEmpty`、`BaseException`、`src/core/components/loading`。
- 会被多个页面复用的能力再沉淀到 `src/core/components` 或分包 components。
- 只有项目组件和 NutUI 都不合适，或截图高度定制、微信小程序兼容需要时，才在页面内手写。

## 固定位置

- 主包 tab 页面：`src/pages/{page}/index.*`
- 业务分包页面：`src/pkg-{package}/pages/{page}/index.*`
- 主包 service：`src/core/services/{page}.ts`
- 分包 service：`src/pkg-{package}/services/{page}.ts`
- 分包基础数据：`src/pkg-{package}/services/mock-data.ts`
- 本地数据工具：`src/core/services/mock.ts`
- HKP 通用 DTO：`src/core/types/hkp.ts`
- 项目级图片组件：`src/core/components/AppImage`
- 项目级图标组件：`src/core/components/AppIcon`
- 路由常量：`src/core/constants/routes.ts`
- 分包页面注册：`src/app.config.ts`
- 页面文档：`docs/ui/pages/{page}.md`
- 页面索引：`docs/ui/page-registry.yaml`

## 默认校验

- 页面实现后至少运行 `yarn typecheck`。
- 涉及分包、路由或 core 引用时运行 `yarn check:package-boundary`。
- 涉及页面文档或 registry 时运行 `yarn check:ui-contract`。
- 页面约束检查运行 `yarn check:page-convention`，会拦截缺少 `_pg` 根节点、页面名前缀 class、双下划线元素写法和非 `_pg-*` 页面 selector。
- 默认不运行完整 `yarn build:weapp`，除非用户要求或需要排查完整产物。
