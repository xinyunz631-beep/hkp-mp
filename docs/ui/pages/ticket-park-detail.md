# 乐园详情页面设计说明

## 基本信息

- 页面：乐园详情
- 路由：src/pkg-ticket/pages/park-detail
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-park-detail
- 设计稿名称：乐园详情 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-park-detail
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-ticket/pages/park-detail/index.tsx
  - src/pkg-ticket/pages/park-detail/index.scss
  - src/pkg-ticket/pages/park-detail/index.config.ts
  - src/pkg-ticket/services/park-detail.ts

## 设计意图

乐园详情页面按 `park-detail-intro.png` 首版还原信息说明结构，优先完成介绍、开放时间、优惠政策和其他信息四个信息卡，并补一条进入门票预定页的在线购票入口。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：白底圆角信息卡片，依次展示介绍、开放时间、优惠政策和其他信息。

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
| 页面数据 | `fetchParkDetailData()` | service 内归一和兜底 | 否 |

## 交互与跳转

- 在线购票：点击“前往预定”跳到 `ticket-booking`。
- 客服热线：点击调用微信拨号。
- 园区地址：点击调用微信地图导航。
- 节目单：点击展示微信 modal 说明。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 客服热线 | 调用微信拨号 | 拨号失败按 `wechat-actions` 降级复制 |
| 园区地址 | 打开微信地图 | 降级复制地址 |
| 节目单 | 微信 modal | 展示节目单说明 |
| 在线购票 | 跳转门票预定 | `ticket-booking` |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| loading | `usePageRuntime` 统一承接 |
| 地图不可用 | `wechat-actions` 降级复制地址 |
| 拨号不可用 | `wechat-actions` 降级复制号码 |

## 微信开发工具验收清单

- 点客服热线，应调起微信拨号或复制号码。
- 点园区地址，应调起微信地图或复制地址。
- 点节目单，应出现微信 modal。
- 点在线购票，应进入门票预定页。

## 实现映射

- `src/pkg-ticket/pages/park-detail/index.tsx`：页面主体。
- `src/pkg-ticket/pages/park-detail/index.scss`：页面样式。
- `src/pkg-ticket/pages/park-detail/index.config.ts`：页面配置。
- `src/pkg-ticket/services/park-detail.ts`：页面 service。

## 变更记录

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
