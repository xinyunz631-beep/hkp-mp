# 会员中心页面设计说明

## 基本信息

- 页面：会员中心
- 路由：src/pkg-member/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：当前无独立截图，按代码优先方式完成首版会员资料卡、快捷入口和权益区。
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-17
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
- 权益服务区未开放项：统一轻提示，不进入分享收益和提现详情页

## 实现映射

- `src/pkg-member/pages/index/index.tsx`：页面主体、跳转和会员态组合。
- `src/pkg-member/pages/index/index.scss`：页面样式。
- `src/pkg-member/pages/index/index.config.ts`：页面配置。
- `src/pkg-member/services/index.ts`：会员首页 service。

## 变更记录

### v0.2

- Phase 6 完成会员资料卡、卡券概览、快捷入口和权益服务区首版。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
- `2026-05-17`：已通过 `yarn check:package-boundary`
- `2026-05-17`：已通过 `yarn check:ui-contract`
