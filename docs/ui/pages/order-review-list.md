# 评价列表页面设计说明

## 基本信息

- 页面：评价列表
- 路由：src/pkg-order/pages/review-list
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-review-list
- 设计稿名称：评价列表 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-review-list
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-order/pages/review-list/index.tsx
  - src/pkg-order/pages/review-list/index.scss
  - src/pkg-order/pages/review-list/index.config.ts
  - src/pkg-order/services/review-list.ts

## 设计意图

评价列表页面按 `review-list.png` 完成标签筛选、评论头像区、文案和图片宫格，作为商品和订单评价查看页的首版承载。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：顶部筛选标签、评论列表、图片宫格。

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
| 页面数据 | `fetchReviewListData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 顶部标签支持本地切换，先用不同列表切片模拟筛选结果。
- 评论图片统一使用 `AppImage` 承接空地址失败态。
- 后续接真实评价列表接口时，只替换 service。

## 实现映射

- `src/pkg-order/pages/review-list/index.tsx`：页面主体。
- `src/pkg-order/pages/review-list/index.scss`：页面样式。
- `src/pkg-order/pages/review-list/index.config.ts`：页面配置。
- `src/pkg-order/services/review-list.ts`：页面 service。

## 变更记录

### v0.2

- 按 `review-list.png` 完成评价列表首版 UI。
- 补齐评论筛选、用户头像、时间、文案和图片列表 mock 结构。
- 当前筛选先在本地切换不同评论集合，后续再接真实过滤参数。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
