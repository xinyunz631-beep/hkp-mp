# 地址管理页面设计说明

## 基本信息

- 页面：地址管理
- 路由：src/pkg-order/pages/address
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-address
- 设计稿名称：地址管理 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：order-address
- 当前版本：v0.3
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-order/pages/address/index.tsx
  - src/pkg-order/pages/address/index.scss
  - src/pkg-order/pages/address/index.config.ts
  - src/pkg-order/services/address.ts

## 设计意图

地址管理页面按 `address-list.png` 完成首版地址卡、默认地址切换、编辑/删除图标位和底部新增按钮，先满足订单确认页的地址跳转闭环。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：地址卡列表、默认地址切换区、编辑删除入口、底部新增按钮。

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
| 页面数据 | `fetchAddressData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 点击默认地址可切换当前选中项。
- 新增地址：微信 modal 确认后追加本地模拟地址。
- 编辑地址：微信 modal 确认后更新本地地址备注。
- 删除地址：微信 modal 确认后删除，至少保留一条地址。
- 该页作为 `order-checkout` 的地址管理入口，后续真实接口只替换 service。

## 微信开发工具验收清单

- 点击默认地址，应切换选中态并 toast 成功。
- 点击新增地址，应确认后新增一条地址。
- 点击编辑地址，应确认后更新地址文案。
- 点击删除地址，应确认后删除；只剩一条时应提示不能删除。

## 实现映射

- `src/pkg-order/pages/address/index.tsx`：页面主体。
- `src/pkg-order/pages/address/index.scss`：页面样式。
- `src/pkg-order/pages/address/index.config.ts`：页面配置。
- `src/pkg-order/services/address.ts`：页面 service。

## 变更记录

### v0.3

- 补齐地址新增、编辑、删除和默认地址切换的本地状态闭环。
- 页面状态推进到 `interaction-ready`。

### v0.2

- 按 `address-list.png` 完成地址管理首版 UI。
- 补齐两条 mock 地址，并支持本地默认地址切换。
- 底部新增按钮已接入固定 footer 区域，安全区继续由 `PageLayout` 统一承接。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `yarn typecheck`
- `yarn check:page-convention`
- `yarn check:package-boundary`
- `yarn check:ui-contract`
