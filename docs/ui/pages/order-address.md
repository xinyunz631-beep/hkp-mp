# 地址管理页面设计说明

## 基本信息

- 页面：地址管理
- 路由：src/pkg-order/pages/address
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：order-address
- 设计稿名称：地址管理 750px 开发稿
- 当前版本：v0.4
- 页面状态：commercial-ready
- 更新时间：2026-05-20
- 实现文件：
  - src/pkg-order/pages/address/index.tsx
  - src/pkg-order/pages/address/index.scss
  - src/pkg-order/pages/address/index.config.ts
  - src/pkg-order/services/address.ts

## 设计意图

地址管理页按电商地址簿补齐商用闭环：支持默认地址切换、编辑、删除和新增入口；最多 10 个地址的规则保留在 service 和入口拦截里，但列表顶部不额外展示规则提示，避免占用首屏视觉。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 地址列表：收件人、手机号、默认标签、地址标签、定位名称、详细地址、默认地址、编辑、删除
- 固定底部：新增收件人地址

## 动态与静态边界

- 接口图片：本页无真实图片区域。
- 图标资源：默认、编辑、删除等功能图标统一使用 `AppIcon`。
- 接口文本/数据：地址列表、上限和默认地址状态通过 `src/pkg-order/services/address.ts` 获取。
- 代码渲染：页面结构、状态、交互和基础样式。
- 本地配置：页面标题、导航策略和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：优先使用 `BaseEmpty`。
- error：优先使用 `BaseException` 或 `StatusException`。
- 未登录：使用 `usePageRuntime({ loginRequired: true })` 做目标页兜底。
- 降级态：本地缓存为空时由 service 回退到 mock 地址。

## 交互矩阵

| 元素 | 行为 | 反馈 |
|---|---|---|
| 默认地址 | 切换当前地址为默认地址 | 本地缓存更新并 toast 成功 |
| 编辑 | 跳转 `order-address-edit?id=...` | 目标页二次登录兜底 |
| 删除 | 微信确认弹窗二次确认 | 确认后删除并重新计算默认地址 |
| 新增收件人地址 | 跳转地址新增页 | 达到 10 个时 toast 提示 |
| 空态新增 | 复用底部新增入口 | 新增成功后回到列表展示 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 统一展示页面 loading |
| 未登录 | `usePageRuntime({ loginRequired: true })` 登录阻断态 |
| 空地址 | `BaseEmpty` 展示空态，保留底部新增入口 |
| 1-9 个地址 | 地址卡正常展示，新增入口可用 |
| 10 个地址 | 新增入口置灰，点击 toast 提示 |
| 删除默认地址 | 自动把剩余第一条地址设为默认 |

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 页面数据 | `fetchAddressData()` | service 内读取缓存并归一，空缓存使用 mock | 是 |
| 默认地址 | `setDefaultOrderAddress()` | 写入本地缓存 | 否 |
| 删除地址 | `deleteOrderAddress()` | 删除后归一默认地址 | 否 |

## 交互与跳转

- 点击编辑：跳转 `src/pkg-order/pages/address-edit/index` 并携带地址 `id`。
- 点击新增：跳转 `src/pkg-order/pages/address-edit/index`。
- 点击删除：使用微信确认弹窗，确认后删除本地地址。
- 点击默认地址：更新本地默认地址，订单结算页读取最新默认地址。

## 实现映射

- `src/pkg-order/pages/address/index.tsx`：页面主体。
- `src/pkg-order/pages/address/index.scss`：页面样式。
- `src/pkg-order/pages/address/index.config.ts`：页面配置。
- `src/pkg-order/services/address.ts`：地址列表、默认地址、保存、删除和上限控制。

## 微信开发工具验收清单

- 地址列表顶部不展示最多 10 个规则提示，地址卡应直接进入首屏内容。
- 点击新增地址应进入新增地址页；已有 10 个时不能继续新增。
- 点击默认地址应切换选中态，并在订单结算页读取新的默认地址。
- 点击编辑应带入当前地址信息；保存返回后列表数据刷新。
- 点击删除应出现微信确认弹窗，确认后列表数量减少。

## 变更记录

### v0.4

- 隐藏地址列表顶部上限提示，最多 10 条规则保留在拦截和 service。
- 新增地址数量上限 10 的 service 和页面双保险。
- 新增/编辑改为独立页面承接，不再使用临时弹窗模拟。
- 页面状态推进到 `commercial-ready`。

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
- `git diff --check`
