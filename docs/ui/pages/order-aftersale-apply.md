# 售后申请页面设计说明

## 基本信息

- 页面：售后申请
- 路由：src/pkg-order/pages/aftersale-apply
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-aftersale-apply
- 设计稿名称：售后申请 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-aftersale-apply
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-order/pages/aftersale-apply/index.tsx
  - src/pkg-order/pages/aftersale-apply/index.scss
  - src/pkg-order/pages/aftersale-apply/index.config.ts
  - src/pkg-order/services/aftersale-apply.ts

## 设计意图

售后申请页面承接售后类型选择后的表单提交场景，当前已补齐订单摘要、售后类型、原因、补充说明、凭证上传占位和联系人信息。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 订单摘要：复用 `OrderCard` 展示当前售后商品。
- 类型信息：展示所选售后类型和预计退款金额。
- 原因表单：原因胶囊 + 文本域补充说明。
- 凭证区域：保留图片上传入口占位，后续可接 `Uploader` 外层封装。
- 联系信息：展示联系人与电话，便于售后沟通。
- 固定底部：提交售后申请按钮。

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
| 页面数据 | `fetchAftersaleApplyData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 从售后类型页点击类型卡片进入本页，并通过路由参数带入所选类型。
- 选择原因后可提交；未选原因时给出 toast 提示。
- 提交后跳转到售后进度页。

## 实现映射

- `src/pkg-order/pages/aftersale-apply/index.tsx`：页面主体。
- `src/pkg-order/pages/aftersale-apply/index.scss`：页面样式。
- `src/pkg-order/pages/aftersale-apply/index.config.ts`：页面配置。
- `src/pkg-order/services/aftersale-apply.ts`：页面 service。

## 变更记录

### v0.2

- 回补售后申请首版表单 UI 和提交跳转，形成“售后类型 -> 售后申请 -> 售后进度”闭环。
- 页面通过 service DTO 承接售后类型、联系人、退款金额等字段。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
