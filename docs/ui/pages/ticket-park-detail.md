# 热玩项目详情页面设计说明

## 基本信息

- 页面：热玩项目
- 路由：src/pkg-ticket/pages/park-detail
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-park-detail
- 设计稿名称：热玩项目详情 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-park-detail
- 当前版本：v0.4
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-ticket/pages/park-detail/index.tsx
  - src/pkg-ticket/pages/park-detail/index.scss
  - src/pkg-ticket/pages/park-detail/index.config.ts
  - src/pkg-ticket/services/park-detail.ts

## 设计意图

热玩榜单项目详情页，根据路由 `id` 请求项目详情。页面承载接口返回的轮播图、项目基础信息、喜欢数和富文本详情，底部固定“购买门票 / 酒店预定”两个跳转按钮。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 顶部项目图片 Swiper
  - 浮层项目介绍卡：标题、位置、开放状态、分享、喜欢
  - 接口富文本详情
  - 固定底部操作栏：购买门票、酒店预定

## 动态与静态边界

- 接口图片：顶部 Swiper 图片由接口 `heroImages` 返回，页面用 `AppImage` 承载。
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
| 项目详情 | `fetchParkDetailData(id)` | service 内归一和兜底 | 是 |

## 交互与跳转

- 页面进入：从路由参数读取接口数据里的 `id`，调用 `fetchParkDetailData(id)`。
- 图片：点击顶部 Swiper 图片调用微信图片预览。
- 分享：使用微信好友分享，分享路径携带接口数据里的 `id`。
- 喜欢：本页即时切换喜欢状态和喜欢数，真实提交后续接接口。
- 购买门票：跳转 `ticket-booking`。
- 酒店预定：跳转酒店首页。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 顶部图片 | 预览图片 | 微信图片预览 |
| 分享 | 微信好友分享 | 分享路径携带接口数据里的 `id` |
| 喜欢 | 切换喜欢态 | 更新本页喜欢数 |
| 购买门票 | 跳转门票预定 | `ticket-booking` |
| 酒店预定 | 跳转酒店首页 | `hotelHome` |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| loading | `usePageRuntime` 统一承接 |
| 缺少 id | service 返回默认项目兜底 |
| 图片为空 | `AppImage` 失败态承接 |

## 微信开发工具验收清单

- 从首页热玩榜单进入，应携带接口数据里的 `id` 并展示对应项目。
- 点顶部图片，应进入微信图片预览或展示暂无可预览提示。
- 点分享，应触发微信好友分享。
- 点喜欢，应切换喜欢状态和喜欢人数。
- 点购买门票，应进入门票预定页。
- 点酒店预定，应进入酒店首页。

## 实现映射

- `src/pkg-ticket/pages/park-detail/index.tsx`：页面主体。
- `src/pkg-ticket/pages/park-detail/index.scss`：页面样式。
- `src/pkg-ticket/pages/park-detail/index.config.ts`：页面配置。
- `src/pkg-ticket/services/park-detail.ts`：页面 service。

## 变更记录

### v0.4

- 页面改为热玩项目详情，根据路由 `id` 获取接口数据。
- 顶部新增项目图片 Swiper，中部浮层承载项目介绍、分享和喜欢，详情改为接口富文本。
- 底部固定两个按钮，分别跳转门票预定和酒店首页。

### v0.3

- 其他信息中的客服热线、园区地址、节目单分别接入微信拨号、地图和 modal。
- 页面状态推进到 `interaction-ready`。

### v0.2

- 按 `park-detail-intro.png` 完成介绍、开放时间、优惠政策和其他信息首版 UI。
- 在其他信息区补充在线购票入口，串到门票预定页。
- 扩展 `ticketParkData` mock 数据结构，补齐介绍、分时段开放时间和优惠政策字段。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
