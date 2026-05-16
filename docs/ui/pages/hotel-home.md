# 酒店首页页面设计说明

## 基本信息

- 页面：酒店首页
- 路由：src/pkg-hotel/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：docs/ui/source/hkp-mini-page/hotel-detail.png
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-hotel/pages/index/index.tsx
  - src/pkg-hotel/pages/index/index.scss
  - src/pkg-hotel/pages/index/index.config.ts
  - src/pkg-hotel/services/index.ts

## 设计意图

酒店分包首页按 `hotel-detail.png` 先完成顶部酒店切换、主图、地址/介绍、入住信息、筛选胶囊、房型列表和套餐推荐，作为酒店链路的入口页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：酒店切换 Tab、主图、地址信息、入住信息条、房型卡片、套餐卡片。

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
| 页面数据 | `fetchHotelHomeData()` | service 内归一和兜底 | 否 |

## 交互与跳转

- 酒店切换：切换顶部酒店 Tab，联动主图、地址、房型和套餐数据。
- 房型详情：点击房型卡跳到 `hotel-room-detail`。
- 预订：点击房型或套餐“预订”按钮跳到 `hotel-checkout`。
- 地图/导航、酒店介绍：当前提示能力即将开放。

## 实现映射

- `src/pkg-hotel/pages/index/index.tsx`：页面骨架相关文件。
- `src/pkg-hotel/pages/index/index.scss`：页面骨架相关文件。
- `src/pkg-hotel/pages/index/index.config.ts`：页面骨架相关文件。

## 变更记录

### v0.2

- 按 `hotel-detail.png` 完成酒店首页首版 UI 和酒店链路入口。
- 新增 `fetchHotelHomeData()`，由 service 提供酒店 Tab、主图、房型、套餐和筛选数据。
- 页面内接入 `AppImage`、`AppIcon` 和路由跳转，形成首页 -> 房型详情 / 确认订单的最小闭环。

### v0.1

- Phase 1 登记页面骨架。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
