# 乐园导览页面设计说明

## 基本信息

- 页面：乐园导览
- 路由：src/pkg-ticket/pages/park-guide
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：ticket-park-guide
- 设计稿名称：乐园导览 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：ticket-park-guide
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-ticket/pages/park-guide/index.tsx
  - src/pkg-ticket/pages/park-guide/index.scss
  - src/pkg-ticket/pages/park-guide/index.config.ts
  - src/pkg-ticket/services/park-guide.ts

## 设计意图

乐园导览页面本轮先完成地图占位、服务分区索引和业务提示。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 园区服务导览卡
  - 地图图片占位
  - 吃住行游购娱商学情服务分区
  - 到园提示

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
| 页面数据 | `fetchParkGuideData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 地图图片：点击调用微信图片预览；无图时给出业务提示。
- 服务分区：点击给出当前分区定位反馈。

## 交互矩阵

| 元素 | 行为 | 反馈/去向 |
|---|---|---|
| 导览地图 | 图片预览 | 无图展示“暂无导览大图” |
| 服务分区 | 本地点击反馈 | toast 提示已定位对应服务 |

## 状态矩阵

| 状态 | 处理 |
|---|---|
| loading | `usePageRuntime` 统一承接 |
| 空地图 | `AppImage` 灰底占位，点击预览时给业务提示 |

## 微信开发工具验收清单

- 点导览地图，应进入图片预览或提示暂无导览大图。
- 点吃、住、行等服务分区，应看到对应定位 toast。

## 实现映射

- `src/pkg-ticket/pages/park-guide/index.tsx`：页面主体。
- `src/pkg-ticket/pages/park-guide/index.scss`：页面样式。
- `src/pkg-ticket/pages/park-guide/index.config.ts`：页面配置。
- `src/pkg-ticket/services/park-guide.ts`：页面 service。

## 变更记录

### v0.3

- 导览地图接入微信图片预览。
- 服务分区点击给出业务反馈。
- 页面状态推进到 `interaction-ready`。

### v0.2

- Phase 7 完成地图占位、服务分区索引和业务提示首版。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-17`：已通过 `yarn typecheck`
- `2026-05-17`：已通过 `yarn check:page-convention`
