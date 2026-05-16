# 门票预定页面设计说明

## 基本信息

- 页面：门票预定
- 路由：src/pkg-ticket/pages/ticket-booking
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-booking
- 设计稿名称：门票预定 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-booking
- 当前版本：v0.6
- 页面状态：implemented
- 更新时间：2026-05-15
- 实现文件：
  - src/pkg-ticket/pages/ticket-booking/index.tsx
  - src/pkg-ticket/pages/ticket-booking/index.scss
  - src/pkg-ticket/pages/ticket-booking/index.config.ts
  - src/pkg-ticket/services/ticket-booking.ts

## 设计意图

门票预定页面按用户提供截图做代码侧首版还原，优先保证购票路径可进入、页面基础设施完整、首屏结构和下单栏符合当前小程序视觉方向。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 顶部导航：`PageShell` 自定义导航，左侧为统一返回 icon，标题水平居中，右侧保留微信系统胶囊区域。
- 景区图区域：顶部大图位使用 `AppImage`，地址在 render 内以空字符串变量预留，未接入前显示灰色占位，组件统一承接加载中、淡入和失败态。
- 开园信息：包含开放时间、咨询电话、节目单提示、详情须知入口、地址和地图入口。
- 游玩日期：独立白底日期行，默认展示当天日期。
- 商品区域：保留“门票”分区标题，当前实现“年卡”商品卡片。
- 固定底栏：展示订单总金额和提交订单按钮，金额为 0 时保持弱按钮态。

## 动态与静态边界

- 接口图片：当前用 `heroImageSrc` 空字符串预留，通过 `AppImage` 渲染，后续替换为接口返回字段或固定 CDN。
- 接口文本/数据：通过 `fetchTicketBookingData()` 获取并在 service 内归一。
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
| 页面数据 | `fetchTicketBookingData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 左侧返回 icon：调用统一返回逻辑，页面栈只剩一页时回首页。
- 分享、详情须知、地图、日期选择：当前提示能力即将开放。
- 数量步进器：支持年卡数量加减，不允许低于 0。
- 提交订单：未选择商品时提示选择数量；选择后提示提交能力即将开放。
- 底部「购票」入口：从应用底部 tabbar 打开本页。

## 实现映射

- `src/pkg-ticket/pages/ticket-booking/index.tsx`：页面主体。
- `src/pkg-ticket/pages/ticket-booking/index.scss`：页面样式。
- `src/pkg-ticket/pages/ticket-booking/index.config.ts`：页面配置。
- `src/pkg-ticket/services/ticket-booking.ts`：页面 service。

## 变更记录

### v0.6

- 顶部景区图改用项目级 `AppImage`。
- 分享图标改用项目级 `AppIcon`，不再在页面里直接散用 NutUI icon。

### v0.5

- 景区图从 CSS 模拟图改为 `Image` 元素，图片地址在 render 内用变量预留。
- 分享图标改为优先使用 NutUI `Share` icon。

### v0.4

- 按页面样式新规范迁移为 `_pg` 根容器和 `_pg-模块_元素` 命名。
- 重写页面 SCSS 为嵌套结构，业务 class 不再使用页面名作为前缀。

### v0.3

- 取消票务页单独的首页图标入口，统一回到默认返回按钮。

### v0.2

- 按门票预定截图完成首版页面 UI 和基础交互。
- 新增页面 service 数据结构和年卡商品数据。
- 注册 `ticketBooking` 路由，并将底部「购票」入口指向本页。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
