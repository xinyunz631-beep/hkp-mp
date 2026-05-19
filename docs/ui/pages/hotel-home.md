# 酒店首页页面设计说明

## 基本信息

- 页面：酒店首页
- 路由：src/pkg-hotel/pages/index
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- UI 图：docs/ui/source/hkp-mini-page/hotel-detail.png
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
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
- 分享：右上角分享按钮使用 `AppShareButton` 直接触发微信好友分享，页面通过 `useShareAppMessage` 提供分享内容。
- 主图：点击调用微信图片预览；无图时给出业务提示。
- 地图/导航：点击调用微信地图，缺少坐标时按 `wechat-actions` 降级复制地址。
- 酒店介绍：点击展示微信 modal 说明。
- 入住日期：点击入住/离店日期或晚数打开 `DateSelectionPopup` 范围选择，弹层挂载在 `PageShare`。
- 入住人数：点击“每间”区域循环切换成人/儿童组合并 toast 反馈。
- 筛选胶囊：切换大床/含早/双床，联动房型列表。
- 房型详情：点击房型卡跳到 `hotel-room-detail`。
- 预订：点击房型或套餐“预订”按钮跳到 `hotel-checkout`。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 酒店 Tab | 切换当前酒店 | 主图、地址、房型、套餐联动刷新 |
| 分享按钮 | 调用微信分享能力 | toast 提示右上角分享 |
| 主图 | 图片预览 | 无图展示“暂无酒店大图” |
| 地图/导航 | 打开微信地图 | 降级复制地址 |
| 酒店介绍 | 微信 modal | 展示酒店说明 |
| 入住/离店日期 | 范围日期弹层 | 确认后更新入住、离店和晚数 |
| 每间入住人数 | 本地切换 | toast 反馈当前组合 |
| 筛选项 | 切换筛选 | 房型列表联动 |
| 房型卡 | 跳转详情 | `hotel-room-detail?roomId=` |
| 预订按钮 | 跳转确认订单 | `hotel-checkout?roomId=` |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| loading | `usePageRuntime` 统一承接 |
| 空图片 | `AppImage` 灰底占位，点击预览时给业务提示 |
| 日期弹层 | `PageShare` 挂载，覆盖 header/footer/tabbar |
| 酒店切换 | 默认重置筛选到第一项 |
| 筛选无命中 | 回退展示当前酒店全部房型 |

## 微信开发工具验收清单

- 进入酒店首页，点右上分享，应出现分享引导 toast。
- 点酒店主图，应进入图片预览或提示暂无酒店大图。
- 点地图/导航，应调起微信地图或复制地址。
- 点入住/离店日期，应弹出 NutUI 日期范围选择，层级高于页面头尾。
- 切换筛选、点房型、点预订，分别应联动列表、进入房型详情、进入确认订单。

## 实现映射

- `src/pkg-hotel/pages/index/index.tsx`：页面骨架相关文件。
- `src/pkg-hotel/pages/index/index.scss`：页面骨架相关文件。
- `src/pkg-hotel/pages/index/index.config.ts`：页面骨架相关文件。

## 变更记录

### v0.3

- 补齐酒店首页分享、图片预览、地图导航、酒店介绍、入住日期范围弹层、入住人数切换和筛选联动。
- 日期弹层使用项目 `DateSelectionPopup`，并通过 `PageShare` 挂载到页面级浮层。
- 页面状态推进到 `interaction-ready`。

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
