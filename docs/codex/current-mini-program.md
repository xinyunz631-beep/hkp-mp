# 当前小程序状态

## 当前阶段

- 项目类型：C 端乐园 Taro 小程序。
- 当前状态：Taro 工程骨架已初始化，主包页面已收敛到 `src/pages`，分包目录已切为 `src/pkg-*`，全局登录、请求、loading、mock 和基础工具已进入 `src/core`。

## 技术基线

- Taro：`4.2.0`
- React：`18.3.1`
- MobX：`6.15.0`
- mobx-react：`9.2.1`
- NutUI Taro React：`2.7.14`
- 当前验收端：微信小程序 `weapp`
- 兼容策略：优先兼容微信小程序，不为了 H5 或其他端牺牲微信小程序实现习惯。

## 分包

首批独立分包：`mall`、`member`、`hotel`、`ticket`、`dining`、`order`。

分包源码目录采用 `src/pkg-*` 格式，例如 `src/pkg-member`、`src/pkg-mall`，减少无意义层级。

当前分包目录：`src/pkg-mall`、`src/pkg-member`、`src/pkg-hotel`、`src/pkg-ticket`、`src/pkg-dining`、`src/pkg-order`。

## 主包

主包页面和 `tabBar` 页面固定放在 `src/pages`。

主包允许全局 MobX、`request` 封装、登录弹窗、鉴权动作容器、全局 loading、轻量工具和极小基础能力；非必要业务代码不进入主包。

登录、请求封装、登录弹窗、登录守卫、微信授权薄封装、全局 loading、基础格式化工具属于核心全局能力，固定放在 `src/core` 主包层。

`src/core/wechat/auth.ts` 收敛 `Taro.login`、`Taro.checkSession`、`Taro.getUserProfile` 和微信手机号授权结果解析；页面和业务 service 不直接散写微信授权细节。

`src/core/services/auth.ts` 提供静默登录、手机号授权登录、资料授权登录、`requireLogin` 和 `withLoginGuard`，登录成功后可自动续执行原页面动作。

`src/core/components/LoginPopup` 是主包全局登录弹窗，优先使用微信手机号快捷登录，资料授权登录作为兜底；`src/core/components/AuthAction` 用于页面按钮点击前触发登录守卫。

当前主包估算体积：`0.38MB`。

已新增 `yarn check:package-boundary`，提交前检查主包页面目录、分包 root、`preloadRule` 和主包 import 链。

当前只按微信小程序 `weapp` 目标实现和验收，暂不维护 H5 开发入口。

## 风险

后续扩展业务页面时，必须持续检查主包引用链，避免分包业务代码或大依赖进入主包。
