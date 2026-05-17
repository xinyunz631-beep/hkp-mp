# 我的页面设计说明

## 基本信息

- 页面：我的
- 路由：src/pages/profile
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：当前无独立截图，按代码优先完成我的个人中心入口。
- 当前版本：v0.4-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pages/profile/index.tsx
  - src/pages/profile/index.scss
  - src/pages/profile/index.config.ts

## 设计意图

主包我的入口，承载账户卡、积分卡券、订单、地址、售后、优惠券和会员中心入口。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 账户资料卡和登录按钮
  - 积分、卡券和会员权益摘要
  - 我的订单、地址管理、优惠券、会员中心快捷入口
  - 售后记录、我的收藏、常用游客入口
  - 客服和退出登录动作

## 动态与静态边界

- 页面图片：当前页面无真实图片区域。
- 接口数据：读取全局会员态，不直接请求接口。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：后续优先使用 `BaseEmpty`。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 账户摘要 | `rootStore.member` | 全局状态兜底未登录态 | 否 |

## 交互与跳转

- 我的订单：登录后跳转 `src/pkg-order/pages/index`
- 地址管理：登录后跳转 `src/pkg-order/pages/address`
- 售后记录：登录后跳转 `src/pkg-order/pages/aftersale-list`
- 优惠券：登录后跳转 `src/pkg-member/pages/coupons`
- 会员中心：登录后跳转 `src/pkg-member/pages/index`
- 我的收藏：登录后跳转 `src/pkg-mall/pages/favorites`
- 常用游客：登录后弹微信 modal，说明本地 mock 最近联系人，并可跳门票预定。
- 联系客服：调用微信拨号，失败时由 `wechat-actions` 复制号码兜底。
- 退出登录：登录态下先弹微信确认 modal，确认后调用 `logout()` 并 toast 反馈。
- 本页显式开启页面内 `AppTabBar`

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 去登录 | 拉起统一登录弹窗 |
| 我的订单 / 地址管理 / 优惠券 / 会员中心 | 登录后跳对应分包页面 |
| 售后记录 / 我的收藏 | 登录后跳售后列表或商城收藏 |
| 常用游客 | 登录后展示本地 mock 同步说明，可继续去门票预定 |
| 联系客服 | 调起微信拨号 |
| 退出登录 | 微信确认后退出并提示 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| 未登录 | 展示游客态，敏感入口统一登录守卫 |
| 已登录 | 展示昵称、等级、手机号、积分和已登录标识 |
| 拨号失败 | 自动复制客服电话作为降级 |
| 退出取消 | 保持当前登录态，不做副作用 |

## 微信开发工具验收清单

- 未登录进入“我的”，点击订单、优惠券、常用游客：应先出现登录弹窗。
- 登录后点击订单、地址、售后、收藏、会员中心：应进入对应页面。
- 点击常用游客：应出现微信 modal，确认后进入门票预定。
- 点击联系客服：应调起微信拨号或复制电话兜底。
- 点击退出登录：应先二次确认，确认后回到游客态。

## 实现映射

- `src/pages/profile/index.tsx`：我的个人中心、登录守卫和 tabbar 开启。
- `src/pages/profile/index.scss`：页面样式。
- `src/pages/profile/index.config.ts`：页面配置。

## 变更记录

### v0.4-interaction-ready

- 常用游客从占位提示改为本地 mock 联系人说明，并可跳门票预定。
- 客服和退出登录改为微信 API 封装：拨号、确认弹窗和 toast 反馈。
- 快捷入口图标尺寸收回到 `AppIcon` 16，符合功能 icon 默认尺寸约束。

### v0.3

- Phase 7 修复“我的”tab 页面过空问题，补齐账户卡、快捷入口、常用服务和账户设置区，并补回页面样式导入。

### v0.2

- Phase 7 确认我的页聚合入口可用，并显式开启页面内 tabbar。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
