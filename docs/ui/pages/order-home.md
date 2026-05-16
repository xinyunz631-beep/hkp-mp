# 订单首页页面设计说明

## 基本信息

- 页面：订单首页
- 路由：src/pkg-order/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：docs/ui/source/hkp-mini-page/order-list-all.png
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-order/pages/index/index.tsx
  - src/pkg-order/pages/index/index.scss
  - src/pkg-order/pages/index/index.config.ts
  - src/pkg-order/services/index.ts

## 设计意图

订单分包首页按 `order-list-all.png` 先完成订单 Tab、订单分组、订单商品列表和评价按钮，作为 Phase 5 订单主链路的入口页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：顶部订单状态 Tab、日期/状态分组、订单商品项、底部合计文案。

## 动态与静态边界

- 页面图片：真实图片区域后续统一使用 `AppImage`。
- 接口数据：通过对应分包 service 获取，页面不直接写接口 mock。
- 本地配置：页面标题、导航策略、路由和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：后续优先使用 `BaseEmpty`。
- error：后续优先使用 `BaseException` 或 `StatusException`。
- 未登录：需要身份时使用 `usePageRuntime({ loginRequired: true })` 或 `AuthAction`。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchOrderHomeData()` | service 内归一和兜底 | 否 |

## 交互与跳转

- 点击订单商品项进入 `order-detail`。
- 点击“去评价”当前先提示能力即将开放。
- Tab 切换先保留结构和局部筛选，后续接真实订单状态时继续细化。

## 实现映射

- `src/pkg-order/pages/index/index.tsx`：页面骨架相关文件。
- `src/pkg-order/pages/index/index.scss`：页面骨架相关文件。
- `src/pkg-order/pages/index/index.config.ts`：页面骨架相关文件。

## 变更记录

### v0.2

- 按 `order-list-all.png` 完成订单首页首版 UI。
- 新增 `fetchOrderHomeData()`，统一提供订单 Tab、分组和订单项数据。
- 页面已串到订单详情页，订单主链路开始成形。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
