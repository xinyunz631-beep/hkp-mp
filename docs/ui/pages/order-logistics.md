# 物流详情页面设计说明

## 基本信息

- 页面：物流详情
- 路由：src/pkg-order/pages/logistics
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-logistics
- 设计稿名称：物流详情 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-logistics
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-order/pages/logistics/index.tsx
  - src/pkg-order/pages/logistics/index.scss
  - src/pkg-order/pages/logistics/index.config.ts
  - src/pkg-order/services/logistics.ts

## 设计意图

物流详情页面按 `logistics-detail.png` 完成首版物流信息卡、金额汇总、确认收货按钮和纵向物流轨迹，用于订单列表里的发货订单跳转。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：物流信息卡、订单金额汇总、确认收货按钮、物流时间线。

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
| 页面数据 | `fetchLogisticsData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 商品图：点击调用微信图片预览。
- 快递单号：点击复制到剪贴板。
- 官方电话：点击调起微信拨号，失败时复制号码。
- 确认收货：微信 modal 二次确认，确认后本地改为已签收。
- 物流轨迹首条高亮，后续接真实物流接口时只替换 service 返回。
- 订单首页里的“查看物流”已串到当前页。

## 微信开发工具验收清单

- 点击商品图，应预览或提示暂无商品大图。
- 点击快递单号，应复制并提示。
- 点击官方电话，应调起拨号或复制电话。
- 点击确认收货并确认，应改为已签收。

## 实现映射

- `src/pkg-order/pages/logistics/index.tsx`：页面主体。
- `src/pkg-order/pages/logistics/index.scss`：页面样式。
- `src/pkg-order/pages/logistics/index.config.ts`：页面配置。
- `src/pkg-order/services/logistics.ts`：页面 service。

## 变更记录

### v0.3

- 补齐商品图预览、快递单号复制、官方电话拨号和确认收货本地状态。
- 页面状态推进到 `interaction-ready`。

### v0.2

- 按 `logistics-detail.png` 完成物流详情首版 UI。
- 补齐物流公司、快递单号、客服电话、金额和轨迹 mock 字段。
- 已接入订单首页的查看物流跳转。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
