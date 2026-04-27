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
- Taro H5 开发端口：`18210`

## 分包

首批独立分包：`mall`、`member`、`hotel`、`ticket`、`dining`、`order`。

分包源码目录采用 `src/pkg-*` 格式，例如 `src/pkg-member`、`src/pkg-mall`，减少无意义层级。

当前分包目录：`src/pkg-mall`、`src/pkg-member`、`src/pkg-hotel`、`src/pkg-ticket`、`src/pkg-dining`、`src/pkg-order`。

## 主包

主包页面和 `tabBar` 页面固定放在 `src/pages`。

主包允许全局 MobX、`request` 封装、登录弹窗、鉴权动作容器、全局 loading、轻量工具和极小基础能力；非必要业务代码不进入主包。

登录、请求封装、登录弹窗、全局 loading、基础格式化工具属于核心全局能力，固定放在 `src/core` 主包层。

当前主包估算体积：`0.38MB`。

已新增 `yarn check:package-boundary`，提交前检查主包页面目录、分包 root、`preloadRule` 和主包 import 链。

`yarn dev:weapp` 不占用 Web 端口；`yarn dev:h5` 固定运行在 `http://localhost:18210`。

## 风险

后续扩展业务页面时，必须持续检查主包引用链，避免分包业务代码或大依赖进入主包。
