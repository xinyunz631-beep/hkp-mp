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
- MP-205：登录、请求、登录弹窗和页面级单例 loading 默认属于 `src/core` 主包核心能力。
