# 房间详情页面设计说明

## 基本信息

- 页面：房间详情
- 路由：src/pkg-hotel/pages/room-detail
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：hotel-room-detail
- 设计稿名称：房间详情 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：hotel-room-detail
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-hotel/pages/room-detail/index.tsx
  - src/pkg-hotel/pages/room-detail/index.scss
  - src/pkg-hotel/pages/room-detail/index.config.ts
  - src/pkg-hotel/services/room-detail.ts

## 设计意图

房间详情页面按 `hotel-room-detail.png` 先完成主图、标题标签、规格摘要、床型和更多详情内容，作为酒店首页房型卡的详情页承接。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：房间主图、标题摘要、床型行、更多详情段落。

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
| 页面数据 | `fetchRoomDetailData()` | service 内归一和兜底 | 否 |

## 交互与跳转

- 页面根据 `roomId` 查询参数加载对应房型详情；未命中时兜底第一条房型。
- 主图：点击调用微信图片预览；无图时给出业务提示。
- 立即预订：底部固定按钮跳转 `hotel-checkout?roomId=`。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 房间主图 | 图片预览 | 无图展示“暂无房型大图” |
| 立即预订 | 跳转确认订单 | `hotel-checkout?roomId=` |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| loading | `usePageRuntime` 统一承接 |
| 房型未命中 | service 兜底第一条房型 |
| 空图片 | `AppImage` 灰底占位，点击预览时给业务提示 |

## 微信开发工具验收清单

- 从酒店首页点房型卡进入房型详情，页面应展示对应房型信息。
- 点房间主图，应进入图片预览或提示暂无房型大图。
- 点底部立即预订，应进入酒店确认订单并携带当前 `roomId`。

## 实现映射

- `src/pkg-hotel/pages/room-detail/index.tsx`：页面主体。
- `src/pkg-hotel/pages/room-detail/index.scss`：页面样式。
- `src/pkg-hotel/pages/room-detail/index.config.ts`：页面配置。
- `src/pkg-hotel/services/room-detail.ts`：页面 service。

## 变更记录

### v0.3

- 房间主图接入微信图片预览。
- 增加底部立即预订入口，串联到酒店确认订单。
- 页面状态推进到 `interaction-ready`。

### v0.2

- 按 `hotel-room-detail.png` 完成房间详情首版 UI。
- `fetchRoomDetailData()` 支持按 `roomId` 读取不同房型详情。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
