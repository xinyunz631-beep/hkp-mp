# CONSTRAINTS.md

## 必须

- MP-001：Node 必须使用 `v22.22.1`。
- MP-002：小程序必须使用 `Taro 4.2.0 + React 18.3.1` 稳定组合。
- MP-003：状态管理必须使用 `mobx + mobx-react`。
- MP-004：首批业务分包必须包含 `mall`、`member`、`hotel`、`ticket`、`dining`、`order`。
- MP-005：必须启用 `mini.optimizeMainPackage.enable = true`。
- MP-006：主包实际目标必须控制在 `<= 1.5MB`。
- MP-007：实现函数、store action、service 方法必须有中文注释。
- MP-008：Git 提交信息必须使用中文。
- MP-009：主包页面和 `tabBar` 页面必须放在 `src/pages`。
- MP-010：提交前必须通过 `yarn check:package-boundary`。
- MP-011：用户可见界面文案必须是业务口径，禁止出现 `mock`、组件库、技术栈、开发态或测试态字眼。
- MP-012：必须优先兼容微信小程序 `weapp`，不因 H5 或其他端牺牲微信小程序实现习惯。
- MP-013：当前只按微信小程序 `weapp` 目标实现和验收，不主动兼容 H5 或其他端。
- MP-014：Codex 主包体积检测必须使用隔离输出目录，禁止覆盖微信开发工具热更新使用的 `dist/`。
- MP-015：小程序改动后默认不执行 `yarn build:weapp`，优先依赖本地 `yarn dev:weapp` 热更新和必要的轻量校验；只有用户明确要求大版本验证、构建排查或需要完整产物时才运行构建。
- MP-016：全局基础样式必须为 `view`、`text`、`button`、`scroll-view` 等常用宿主元素统一设置 `box-sizing: border-box`。
- MP-017：默认不得回退、删除或覆盖用户手动修改的代码；只有用户明确要求去除时，才允许处理这些改动。
- MP-018：样式实现必须优先复用现有设计 token 和已有样式变量，默认不得新增 SCSS/CSS 变量；只有用户明确要求时才新建。

## 禁止

- MP-101：禁止配置 `preloadRule`。
- MP-102：禁止做分包预下载。
- MP-103：禁止主包引用业务分包实现代码。
- MP-104：禁止分包之间直接引用对方 store、service、页面或业务组件。
- MP-105：禁止把非必要业务代码放进 `src/core`。
- MP-106：禁止为主包页面另建 `src/pages-tab`、`src/main-pages` 等非标准目录。

## 默认

- MP-201：全局 MobX、`request` 封装、轻量工具可以放在主包核心层。
- MP-202：业务 domain store 默认放在对应分包内。
- MP-203：大图、海报、图册、菜单图和营销素材默认走 CDN。
- MP-204：主包 `>= 1.3MB` 必须触发排查。
- MP-205：登录、请求、登录弹窗和页面运行时 hook 默认属于 `src/core` 主包核心能力，页面 loading 必须由页面显式接入控制，并统一从 `src/core/components/loading` 获取。
- MP-206：仅当页面首屏依赖初始化接口、页面级 loading 或初始化登录拦截时，默认使用 `usePageRuntime({ initPage })` + `renderPage`，静态页不强制接入。
- MP-207：实现基础 UI 状态/异常组件前必须先查已安装组件库；命中 Skeleton、Empty 等能力时先在 `src/core/components` 二次封装为 `Base*` 再给页面使用。
- MP-208：使用 NutUI Taro React 组件时必须保持 `@tarojs/plugin-html` 与 Taro 版本一致并在 Taro 配置注册；NutUI 按需样式、HTML 插件、prebundle/cache 配置属于同一条运行时链路。
- MP-209：新增图标相关 UI 默认优先使用 `@nutui/icons-react-taro`；只有 NutUI Icon 无法满足设计或交互语义时，才手写 CSS/SVG 图标。
- MP-210：新建页面默认使用 `PageShell` 和 `usePageRuntime`；只要页面使用自定义 navbar，就必须在对应 `config.ts` 显式声明 `navigationStyle: 'custom'`，首页等特例可按需关闭 navbar，系统导航页可显式传 `navbar={false}`。
- MP-211：自定义 navbar 的返回按钮必须复用通用返回函数：只有一个页面时回首页，否则正常返回上一页；tab 页面默认不展示返回按钮，只保留页面标题和底部 tabbar。
- MP-212：小程序页面新建、更新、截图还原和页面级逻辑调整默认使用 `$mpcode-page` 工作流；通用页面基础设施以 `docs/codex/page-foundation.md`、模板和 `yarn check:page-convention` 为准。
- MP-213：新建页面默认使用 `observer` 包裹页面组件；页面实现优先查项目内封装和已安装 NutUI 能力，确认不适用后才手写页面内组件。
