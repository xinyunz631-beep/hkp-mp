# AGENTS.md

## 项目定位

本目录是 C 端乐园小程序项目，采用 `Taro 4.2.0 + React 18.3.1 + MobX + NutUI Taro React`。

## 先读哪里

1. 先读本文件和 `CONSTRAINTS.md`。
2. 再读 `docs/codex/current-mini-program.md`。
3. 涉及主包体积或分包时，读根目录 `codex/rules/rules-mini-program-packaging.md`。
4. 涉及状态管理时，读根目录 `codex/rules/rules-mobx.md`。

## 目录职责

- `src/app`：应用启动壳与全局配置。
- `src/pages`：主包页面，`tabBar` 页面必须直接放在这里。
- `src/core`：允许进入主包的核心轻量能力。
- `src/pkg-*`：业务独立分包，例如 `src/pkg-member`、`src/pkg-mall`。
- `src/styles`：全局基础样式和设计变量。

## 常用命令

```bash
nvm use
yarn install
yarn dev:weapp
yarn build:weapp
yarn check:package-boundary
yarn check:main-package
```

## 修改规则

- 主包只放启动壳、占位页、全局 MobX、`request`、轻量工具和极小基础能力。
- 商城、会员、酒店、票务、点餐、订单业务代码默认放对应独立分包。
- 所有实现函数、store action、service 方法必须写中文注释。
- Git 提交信息必须使用中文。
