# 会员中心页面设计说明

## 基本信息

- 页面：会员中心
- 路由：src/pkg-member/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：当前无独立截图，按代码优先方式完成首版会员资料卡、快捷入口和权益区。
- 当前版本：v0.3-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-member/pages/index/index.tsx
  - src/pkg-member/pages/index/index.scss
  - src/pkg-member/pages/index/index.config.ts
  - src/pkg-member/services/index.ts

## 设计意图

会员分包首页，本轮先承接会员资料、积分、可用卡券概览、快捷入口和权益服务区。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 顶部会员资料卡：昵称、等级、手机号、积分和卡券数量
  - 卡券概览：本月福利摘要和跳转优惠券页入口
  - 快捷入口：会员码、优惠券、我的订单、地址管理
  - 权益服务区：会员权益和更多服务两个分组

## 动态与静态边界

- 页面图片：头像区域使用 `AppImage` 承接加载和空地址占位。
- 接口数据：通过 `src/pkg-member/services/index.ts` 获取，页面不直接写本地数据。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：后续优先使用 `BaseEmpty`。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 会员首页数据 | `fetchMemberHomeData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 会员码：跳转 `src/pkg-member/pages/member-code`
- 优惠券：跳转 `src/pkg-member/pages/coupons`
- 我的订单：跳转 `src/pkg-order/pages/index`
- 地址管理：跳转 `src/pkg-order/pages/address`
- 生日礼遇：跳转优惠券页。
- 停车权益：跳转乐园导览页。
- 分享收益 / 提现服务：按当前计划保持分销和提现暂缓提示，不进入空白页面。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 查看卡券 / 推荐先用 | 跳优惠券页 |
| 会员码 / 优惠券 / 我的订单 / 地址管理 | 跳对应分包页面 |
| 生日礼遇 | 跳优惠券页 |
| 停车权益 | 跳乐园导览页 |
| 分享收益 / 提现服务 | 明确提示分销和提现暂缓到最后处理 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化会员首页 service |
| 未登录 | `loginRequired` 阻断并拉起业务化登录提示 |
| 数据缺失 | 页面等待 service 兜底数据后渲染 |
| 分销 / 提现暂缓 | 展示 `暂缓` 标签和计划内提示 |

## 微信开发工具验收清单

- 进入会员中心前未登录：应先出现登录提示。
- 登录后点击会员码、优惠券、订单、地址：应进入对应页面。
- 点击生日礼遇、停车权益：应分别进入优惠券和乐园导览。
- 点击分享收益、提现服务：应提示暂缓，不应进入空白页。

## 实现映射

- `src/pkg-member/pages/index/index.tsx`：页面主体、跳转和会员态组合。
- `src/pkg-member/pages/index/index.scss`：页面样式。
- `src/pkg-member/pages/index/index.config.ts`：页面配置。
- `src/pkg-member/services/index.ts`：会员首页 service。

## 变更记录

### v0.3-interaction-ready

- 会员基础权益从统一未开放提示改为可用权益跳真实路由，分销/提现继续按计划暂缓。
- 页面内功能 icon 尺寸统一收回到 16。

### v0.2

- Phase 6 完成会员资料卡、卡券概览、快捷入口和权益服务区首版。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
- `2026-05-17`：已通过 `yarn check:package-boundary`
- `2026-05-17`：已通过 `yarn check:ui-contract`
