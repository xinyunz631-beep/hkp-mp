# 兑换专区页面设计说明

## 基本信息

- 页面：兑换专区
- 路由：src/pkg-member/pages/exchange
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：member-exchange
- 设计稿名称：兑换专区 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：member-exchange
- 当前版本：v0.1
- 页面状态：interaction-ready
- 更新时间：2026-05-31
- 实现文件：
  - src/pkg-member/pages/exchange/index.tsx
  - src/pkg-member/pages/exchange/index.scss
  - src/pkg-member/pages/exchange/index.config.ts
  - src/pkg-member/services/exchange.ts

## 设计意图

兑换专区承接首页快捷入口“兑换专区”。页面按接口商品列表展示可兑换商品，支持推荐和 K 币排序，列表项点击使用接口返回的 `id` 进入商品详情。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：
  - 顶部筛选区：推荐、K币排序，放入 `PageHeader` 固定在导航栏下方
  - 商品列表：两列商品卡，包含图片、标题、原 K 币和兑换 K 币
  - 空列表：`BaseEmpty`

## 动态与静态边界

- 接口图片：商品图片由接口字段 `imageSrc` 返回，页面用 `AppImage` 承载。
- 接口文本/数据：通过页面 service 获取，商品 id 使用接口返回的数字字符串。
- 代码渲染：页面结构、排序状态、列表点击和基础样式。
- 本地配置：页面标题、导航策略和分包注册。

## 状态要求

- loading：页面运行时统一承接。
- empty：使用 `BaseEmpty`。
- error：优先使用 `BaseException` 或 `StatusException`。
- 未登录：`usePageRuntime({ loginRequired: true })` 兜底。
- 降级态：可降级接口在 service 内返回默认值。

## 接口与 Service

| 模块 | service | 失败策略 | 是否阻断页面 |
|---|---|---|---|
| 兑换商品列表 | `fetchMemberExchangeListData()` | service 内归一和兜底 | 是 |

## 交互与跳转

- 首页快捷入口“兑换专区”：登录后跳转 `src/pkg-member/pages/exchange`。
- 推荐：恢复接口默认排序。
- K币排序：切换 K 币升序 / 降序。
- 商品卡片：使用接口返回的 `id` 跳转 `member-exchange-detail?id={id}`。

## 实现映射

- `src/pkg-member/pages/exchange/index.tsx`：页面主体。
- `src/pkg-member/pages/exchange/index.scss`：页面样式。
- `src/pkg-member/pages/exchange/index.config.ts`：页面配置。
- `src/pkg-member/services/exchange.ts`：页面 service。

## 变更记录

### v0.1

- 完成兑换专区商品列表、K 币排序和商品详情跳转闭环。

## 验证记录

- 待验证。
