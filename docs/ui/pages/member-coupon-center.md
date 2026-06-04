# 领券中心页面设计说明

## 基本信息

- 页面：领券中心
- 路由：src/pkg-member/pages/coupon-center
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：member-coupon-center
- 设计稿名称：领券中心 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：member-coupon-center
- 当前版本：v0.1
- 页面状态：interaction-ready
- 更新时间：2026-05-31
- 实现文件：
  - src/pkg-member/pages/coupon-center/index.tsx
  - src/pkg-member/pages/coupon-center/index.scss
  - src/pkg-member/pages/coupon-center/index.config.ts
  - src/pkg-member/services/coupon-center.ts

## 设计意图

领券中心承接首页快捷入口“领券中心”。页面顶部提供“好券推荐 / K币兑换”切换，券列表由接口返回；当前 mock 数据已补好券推荐和 K 币兑换两类券项，接口为空时展示无可领取或可兑换优惠券的空态。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 顶部 tabs：好券推荐、K币兑换，放入 `PageHeader` 固定在导航栏下方
  - 券列表：按接口返回 `coupons` 渲染
  - 空态：无券时展示接口空态文案

## 动态与静态边界

- 接口文本/数据：tabs、券列表、空态标题和空态说明由 service 承载，真实接口接入后保持字段透传。
- 接口 id：优惠券 id 使用接口返回的数字字符串，mock id 也按后端长 ID 形态维护。
- 代码渲染：页面结构、tab 切换、券列表点击反馈和基础样式。
- 本地配置：页面标题、导航策略和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：无券时展示“暂无可领取/可兑换的优惠券 / 耐心等待活动发布”。
- error：优先使用 `usePageRuntime` 默认失败态。
- 未登录：`usePageRuntime({ loginRequired: true })` 兜底。
- 降级态：可降级接口在 service 内返回默认值。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 领券中心数据 | `fetchMemberCouponCenterData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 首页快捷入口“领券中心”：登录后跳转 `src/pkg-member/pages/coupon-center`。
- 好券推荐：展示接口返回的推荐优惠券。
- K币兑换：展示接口返回的 K 币兑换券。
- 券项点击：当前给出领取或兑换成功反馈，后续真实接口接入后替换为提交动作。

## 实现映射

- `src/pkg-member/pages/coupon-center/index.tsx`：页面主体。
- `src/pkg-member/pages/coupon-center/index.scss`：页面样式。
- `src/pkg-member/pages/coupon-center/index.config.ts`：页面配置。
- `src/pkg-member/services/coupon-center.ts`：页面 service。

## 变更记录

### v0.1

- 完成领券中心页面、顶部 tabs、券列表、空态、mock service 和首页入口跳转闭环。

## 验证记录

- `yarn typecheck`：通过。
- `yarn check:page-convention`：通过。
- `yarn check:package-boundary`：通过。
- `yarn check:ui-contract`：通过。
- 根治理仓库与 `mini-program` 子仓库 `git diff --check`：通过。
