# 售后类型页面设计说明

## 基本信息

- 页面：售后类型
- 路由：src/pkg-order/pages/aftersale-type
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-aftersale-type
- 设计稿名称：售后类型 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-aftersale-type
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-order/pages/aftersale-type/index.tsx
  - src/pkg-order/pages/aftersale-type/index.scss
  - src/pkg-order/pages/aftersale-type/index.config.ts
  - src/pkg-order/services/aftersale-type.ts

## 设计意图

售后类型页面负责承接订单详情或订单列表的售后入口，当前已补齐订单摘要、类型卡片和金额说明，用来分发到不同售后申请路径。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 订单摘要：复用 `OrderCard` 展示申请售后的商品。
- 售后说明：顶部提示发货前后可用的售后策略。
- 类型卡片：展示“仅退款 / 退货退款 / 换货”等能力、金额说明和推荐标签。

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
| 页面数据 | `fetchAftersaleTypeData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 从订单详情“申请退款”或订单列表“申请售后”动作进入本页。
- 点击任一售后类型后跳转到售后申请页，并通过路由参数传递当前类型。

## 实现映射

- `src/pkg-order/pages/aftersale-type/index.tsx`：页面主体。
- `src/pkg-order/pages/aftersale-type/index.scss`：页面样式。
- `src/pkg-order/pages/aftersale-type/index.config.ts`：页面配置。
- `src/pkg-order/services/aftersale-type.ts`：页面 service。

## 变更记录

### v0.2

- 回补售后类型首版卡片列表，并接通到售后申请页。
- 页面通过 service DTO 管理售后说明和类型配置。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
