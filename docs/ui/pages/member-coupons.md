# 优惠券页面设计说明

## 基本信息

- 页面：优惠券
- 路由：src/pkg-member/pages/coupons
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：member-coupons
- 设计稿名称：优惠券 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：member-coupons
- 当前版本：v0.3-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-member/pages/coupons/index.tsx
  - src/pkg-member/pages/coupons/index.scss
  - src/pkg-member/pages/coupons/index.config.ts
  - src/pkg-member/services/coupons.ts

## 设计意图

优惠券页面本轮先按截图语义完成卡券概览、状态筛选、卡券列表和空态反馈。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 卡券概览摘要
  - 可用 / 已使用 / 已过期筛选条
  - 卡券列表
  - 无数据时的统一空态

## 动态与静态边界

- 接口图片：真实图片区域统一用项目封装 `AppImage`，render 内以空字符串变量预留地址，由组件承接加载中、淡入和失败态。
- 图标资源：优先使用项目封装；NutUI 有匹配项时先封装为项目组件，找不到匹配项时用图片组件预留空地址。
- 接口文本/数据：通过页面 service 获取。
- 代码渲染：页面结构、状态、交互和基础样式。
- 本地配置：页面标题、导航策略和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：优先使用 `BaseEmpty`。
- error：优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。
- 降级态：可降级接口在 service 内返回默认值。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchCouponsData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 点击筛选条切换可用 / 已使用 / 已过期卡券状态列表。
- 点击可用卡券时弹微信 modal 展示规则，确认后按卡券类型跳门票、酒店或商城可用业务页。
- 点击已使用 / 已过期卡券时弹微信 modal 展示记录说明，不进入结算页。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 可用 / 已使用 / 已过期筛选 | 切换当前卡券列表和空态文案 |
| 可用门票券 | modal 确认后跳门票预定 |
| 可用酒店券 | modal 确认后跳酒店首页 |
| 可用商城券 | modal 确认后跳商城首页 |
| 已使用 / 已过期券 | modal 展示记录说明 |
| 空态 | 展示 `BaseEmpty` 文案 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化卡券数据 |
| 未登录 | `loginRequired` 阻断并拉起登录提示 |
| 有数据 | 展示 `CouponCard` 列表 |
| 无数据 | 展示对应状态空态 |
| 非可用券点击 | 只展示记录说明，不产生下单副作用 |

## 微信开发工具验收清单

- 进入优惠券页未登录：应先出现登录提示。
- 切换三个 tab：列表和空态文案应随状态变化。
- 点击可用门票券：应出现 modal，确认后进入门票预定。
- 点击已使用或已过期券：应出现记录说明 modal。

## 实现映射

- `src/pkg-member/pages/coupons/index.tsx`：页面主体。
- `src/pkg-member/pages/coupons/index.scss`：页面样式。
- `src/pkg-member/pages/coupons/index.config.ts`：页面配置。
- `src/pkg-member/services/coupons.ts`：页面 service。

## 变更记录

### v0.3-interaction-ready

- 卡券点击从轻提示升级为微信 modal，支持可用券确认后跳业务页。

### v0.2

- Phase 6 完成状态筛选、卡券列表和空态反馈首版。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
- `2026-05-17`：已通过 `yarn check:package-boundary`
- `2026-05-17`：已通过 `yarn check:ui-contract`
