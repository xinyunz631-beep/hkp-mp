# 房型/套餐详情页面设计说明

## 基本信息

- 页面：房型/套餐详情
- 路由：src/pkg-hotel/pages/room-detail
- UI 图：docs/ui/source/hkp-mini-page/hotel-room-detail.png
- 当前版本：v1.0
- 页面状态：commercial-ready
- 更新时间：2026-05-20
- 实现文件：
  - src/pkg-hotel/pages/room-detail/index.tsx
  - src/pkg-hotel/pages/room-detail/index.scss
  - src/pkg-hotel/services/room-detail.ts
  - src/pkg-hotel/services/order-draft.ts

## 设计意图

详情页承接酒店首页的产品卡，展示图集、产品摘要、入住日期、入住人数、可订价规和预订须知。浏览详情不需要登录，点击预订时再进入受保护链路。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：顶部图集、产品摘要、入住条件、价规卡、预订须知、底部提交栏。

## 动态与静态边界

- 查询上下文：从首页带入酒店、产品、日期和入住人数。
- 价规数据：由 `fetchRoomDetailData()` 返回，页面不自行拼接价格。
- 交易入口：预订时创建酒店订单上下文后进入确认订单。
- 图片资源：真实图片使用 `AppImage`，有效图集才展示图片数量。

## 状态要求

- loading：首屏由 `usePageRuntime` 承接。
- empty：无有效图集时保留图片占位。
- error：初始化失败走运行时兜底。
- 未登录：详情页公开浏览，点击预订时拦截。

## 接口与 Service

| 模块 | service | 说明 |
|---|---|---|
| 详情数据 | `fetchRoomDetailData()` | 按查询上下文返回产品、价规和须知 |
| 订单上下文 | `createHotelOrderDraft()` | 按选中价规创建确认订单上下文 |

## 交互与跳转

- 点击图集预览酒店产品图片。
- 点击入住日期行回到酒店首页重新选择条件。
- 点击价规预订进入确认订单。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 顶部图集 | 滑动切换 | `Swiper` 横向滑动 |
| 顶部图集点击 | 图片预览 | 调用微信图片预览；无图提示暂无大图 |
| 入住日期行 | 返回选择链路 | 带当前日期和入住人数回酒店首页重新选择 |
| 价规预订 | 创建订单上下文 | 登录拦截后跳 `hotel-checkout?draftId=` |
| 满房价规 | 阻止提交 | 按钮置灰并提示当前房型已订满 |
| 底部立即预订 | 使用首个可订价规 | 创建订单上下文并进入确认订单 |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| 首屏 loading | `usePageRuntime` 承接 |
| 无查询上下文 | 使用今天/明天和默认入住人数兜底 |
| 无图片 | `AppImage` 灰底占位，图片数量不展示 |
| 价规满房 | 不允许继续预订 |
| 公开浏览 | 页面本身不加登录拦截 |

## 微信开发工具验收清单

- 从酒店首页点产品卡进入详情，标题、日期、入住人数和价格应承接首页条件。
- 顶部图集可滑动，点击进入微信图片预览。
- 点击日期行返回酒店首页，带回当前日期和入住人数。
- 点击不同价规预订，应进入确认订单且金额、政策和产品一致。
- 满房价规不可提交。

## 实现映射

- `src/pkg-hotel/pages/room-detail/index.tsx`：页面结构、价规交互和预订入口。
- `src/pkg-hotel/pages/room-detail/index.scss`：详情页视觉样式。
- `src/pkg-hotel/services/room-detail.ts`：详情数据入口。
- `src/pkg-hotel/services/order-draft.ts`：酒店订单上下文创建。

## 变更记录

### v1.0

- 详情页改为承接酒店首页查询上下文。
- 新增图集滑动、价规卡、政策说明和订单上下文创建。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
