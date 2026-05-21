# 酒店首页页面设计说明

## 基本信息

- 页面：酒店首页
- 路由：src/pkg-hotel/pages/index
- UI 图：docs/ui/source/hkp-mini-page/hotel-home-online.png
- 当前版本：v1.0
- 页面状态：commercial-ready
- 更新时间：2026-05-20
- 实现文件：
  - src/pkg-hotel/pages/index/index.tsx
  - src/pkg-hotel/pages/index/index.scss
  - src/pkg-hotel/services/index.ts
  - src/pkg-hotel/services/mock-data.ts
  - src/pkg-hotel/services/order-draft.ts

## 设计意图

酒店首页以 `hotel-home-online.png` 为最终 UI 基准，承接游客查询酒店产品的第一步：看图集、看地址、了解酒店、选择入住日期和入住人数、筛选套餐/房型，并进入详情或确认订单。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 页面标题：`畅‘住’HelloKittyPark`
- 内容区域：酒店 tab、可滑动 banner、地址行、介绍行、日期/人数选择、筛选胶囊、酒店产品列表。

## 动态与静态边界

- UI 还原：页面按最终稿 `hotel-home-online.png` 实现首屏结构和主要视觉层级。
- 接口数据：酒店、图集、筛选、产品、价规、库存和价格由分包 service 统一返回。
- 交易上下文：页面只创建酒店订单上下文，不在页面内拼结算字段。
- 图片资源：真实图片通过 `AppImage`，无有效图时不展示图片数量。

## 状态要求

- loading：首屏和条件刷新由 `usePageRuntime` 承接。
- empty：产品无命中时使用 `BaseEmpty`。
- error：初始化失败走运行时兜底。
- 未登录：公开浏览不拦截，点击预定时由受保护路由拦截。

## 接口与 Service

| 模块 | service | 说明 |
|---|---|---|
| 首页数据 | `fetchHotelHomeData()` | 按日期、入住人数、筛选条件返回酒店产品 |
| 订单草稿 | `createHotelOrderDraft()` | 预订按钮创建酒店订单上下文并进入确认订单 |

## 交互与跳转

- 酒店首页公开浏览，不要求登录。
- 点击产品卡进入房型/套餐详情。
- 点击预定按钮创建订单上下文并进入酒店确认订单。
- 日期、入住人数和筛选变更必须刷新产品数据。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 酒店 tab | 切换酒店 | 锁页刷新当前酒店图集、地址、产品 |
| banner 滑动 | 切换图片 | `Swiper` 横向滑动 |
| banner 点击 | 图片预览 | 调用微信图片预览；无图只给业务提示 |
| 图片数量 | 显示有效图数 | 有有效图片才展示 `图片N张` |
| 地址行 | 地图导航 | 调用微信地图，坐标缺失时复制地址 |
| 详情介绍 | 底部弹层 | 展示介绍、入住/退房时间、联系电话 |
| 分享好友 | 微信好友分享 | 使用 `AppShareButton`，不校验登录 |
| 联系电话 | 拨打电话 | 调用微信拨号，失败时复制号码 |
| 入住日期 | 日期范围弹层 | 使用 `DateSelectionPopup`，确认后刷新产品 |
| 房间数入口 | 底部弹层 | 页面只展示 `N间`，弹层内调整房间数、成人、儿童和儿童年龄 |
| 筛选胶囊 | 筛选产品 | 锁页刷新/过滤产品列表，可再次点击取消 |
| 产品卡 | 进入详情 | 跳转 `hotel-room-detail` 并带日期/入住人数 |
| 预定按钮 | 创建订单上下文 | 登录拦截后进入 `hotel-checkout?draftId=` |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| 首屏 loading | `usePageRuntime` 承接 |
| 条件刷新 | `pageRuntime.withLoading()` 锁住页面 |
| 空图片 | `AppImage` 灰底占位，点击预览提示暂无大图 |
| 无产品 | 使用 `BaseEmpty` 展示调整条件建议 |
| 弹层层级 | 日期、介绍、入住人数弹层全部放入 `PageShare` |
| 未登录预定 | 入口 `navigateToMiniRoute` 登录拦截，确认订单页二次兜底 |

## 微信开发工具验收清单

- 进入页面，标题应为 `畅‘住’HelloKittyPark`，首屏结构贴近 `hotel-home-online.png`。
- banner 可左右滑动，右下角展示有效图片数量，点击能预览当前图集。
- 点击地址应打开微信地图或复制地址。
- 点击详情介绍应打开底部弹层，电话按钮可拨号或复制；点击分享好友应触发微信好友分享。
- 点击日期应打开范围日历，确认后页面展示 loading 并刷新列表。
- 点击房间数入口应打开底部弹层，页面入口只展示 `N间`，修改房间/成人/儿童后列表刷新。
- 点击筛选胶囊应过滤列表，无匹配时展示统一空态。
- 点击产品卡进入详情；点击预定进入确认订单，日期、产品和价格保持一致。

## 实现映射

- `src/pkg-hotel/pages/index/index.tsx`：页面结构、交互和状态组合。
- `src/pkg-hotel/pages/index/index.scss`：最终稿视觉还原。
- `src/pkg-hotel/services/index.ts`：首页数据入口。
- `src/pkg-hotel/services/order-draft.ts`：酒店订单上下文创建。

## 变更记录

### v1.0

- 按 `hotel-home-online.png` 重做酒店首页 UI。
- banner 改为可滑动图集，支持图片数量和微信大图预览。
- 入住日期、入住人数、筛选和产品列表全部接入 service 数据刷新。
- 预定按钮改为创建酒店订单上下文，串联确认订单页。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
