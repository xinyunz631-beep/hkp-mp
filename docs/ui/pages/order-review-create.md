# 创建评价页面设计说明

## 基本信息

- 页面：创建评价
- 路由：src/pkg-order/pages/review-create
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-review-create
- 设计稿名称：创建评价 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-review-create
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-order/pages/review-create/index.tsx
  - src/pkg-order/pages/review-create/index.scss
  - src/pkg-order/pages/review-create/index.config.ts
  - src/pkg-order/services/review-create.ts

## 设计意图

创建评价页面按 `review-create.png` 完成商品头图、标签切换、评价输入区、图片上传占位、匿名评价和底部提交按钮，先打通订单评价入口。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：商品信息、评价标签、输入区、图片上传区、匿名评价、底部提交按钮。

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
| 页面数据 | `fetchReviewCreateData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 标签支持本地切换高亮态。
- 文本输入支持本地字数统计。
- 图片上传、删除和评价提交当前先保留交互位并提示能力即将开放。
- 订单首页里的“去评价”已串到当前页。

## 实现映射

- `src/pkg-order/pages/review-create/index.tsx`：页面主体。
- `src/pkg-order/pages/review-create/index.scss`：页面样式。
- `src/pkg-order/pages/review-create/index.config.ts`：页面配置。
- `src/pkg-order/services/review-create.ts`：页面 service。

## 变更记录

### v0.2

- 按 `review-create.png` 完成评价晒单首版 UI。
- 补齐评价标签、图片占位、匿名开关和底部提交按钮。
- 已接入订单首页的去评价跳转。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
