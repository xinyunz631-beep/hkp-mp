# 商品列表页面设计说明

## 基本信息

- 页面：商品列表
- 路由：src/pkg-mall/pages/products
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：mall-products
- 设计稿名称：商品列表 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：mall-products
- 当前版本：v0.5-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-19
- 实现文件：
  - src/pkg-mall/pages/products/index.tsx
  - src/pkg-mall/pages/products/index.scss
  - src/pkg-mall/pages/products/index.config.ts
  - src/pkg-mall/services/products.ts

## 设计意图

商品列表首版按截图实现自定义搜索头、排序条、优惠提示条、商品列表和底部金额栏；同时承接商品搜索页 `keyword` 参数，作为键盘搜索后的结果页展示。结果页顶部搜索框在当前页直接重新搜索并刷新列表，不再跳回搜索页。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 固定顶部：搜索头和四项筛选条。
- 内容区域：优惠提示条和商品列表；存在关键词时按关键词过滤商品并标红商品名命中片段。
- 固定底部：金额汇总和去购物车按钮。

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
| 页面数据 | `fetchProductsData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 返回按钮使用统一 `navigateBackOrHome()`。
- 搜索框使用 `AppSearchBar`，键盘搜索在当前商品列表页直接刷新结果。
- 页面读取 `keyword` 参数并过滤商城商品数据，商品名称命中片段标红。
- 当前页搜索会写入本地历史搜索；清除按钮清空当前关键词并恢复默认商品列表。
- 商品项进入 `mall-product-detail`。
- 筛选按钮切换本地筛选结果，不再给占位提示。
- 购物车按钮累加本地预览金额，并写入本地购物车 service。
- 底部按钮进入 `mall-cart`。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 返回 | `navigateBackOrHome()` |
| 搜索输入 | 当前页维护输入值 |
| 键盘搜索 | 当前页重新请求/过滤商品并刷新列表 |
| 搜索清除 | 清空当前关键词并恢复默认商品列表 |
| 搜索结果 keyword | 回显到顶部搜索框，并过滤商品列表 |
| 综合 / 销量 / 价格 | 切换排序 |
| 筛选 | 切换本地会员价商品筛选 |
| 商品卡 | 进入商品详情 |
| 加购按钮 | 写入本地购物车并更新底部金额 |
| 去购物车 | 进入购物车 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化商品列表 |
| 搜索结果 | 顶部搜索框回显关键词，列表只展示匹配商品，命中片段标红 |
| 搜索无结果 | 展示统一 `BaseEmpty` / NutUI Empty 空态，并提供清除搜索 |
| 筛选开启 | 列表展示本地筛选后的商品 |
| 加购成功 | 本地购物车可读取新增商品 |

## 微信开发工具验收清单

- 点击价格排序应切换升降序。
- 从搜索页输入关键词后进入商品列表，应回显关键词并过滤商品。
- 在商品列表顶部重新输入关键词并点击键盘搜索，应停留当前页并刷新结果，不应跳回搜索页。
- 点击搜索框清除按钮，应清空关键词并恢复默认商品列表。
- 搜索结果商品标题命中片段应标红；无结果时应展示统一空态和清除搜索按钮。
- 点击筛选应切换列表数量，并出现微信 toast 反馈。
- 点击加购后进入购物车，应看到新增商品。

## 实现映射

- `src/pkg-mall/pages/products/index.tsx`：页面主体。
- `src/pkg-mall/pages/products/index.scss`：页面样式。
- `src/pkg-mall/pages/products/index.config.ts`：页面配置。
- `src/pkg-mall/services/products.ts`：页面 service。

## 变更记录

### v0.5-interaction-ready

- 搜索结果页顶部搜索框改为当前页内搜索，不再点击跳回商品搜索页。
- 键盘搜索在当前商品列表页重新请求/过滤商品，并写入本地历史搜索。
- 搜索框清除和空态“清除搜索”恢复默认商品列表。

### v0.4-interaction-ready

- 承接 `mall-products?keyword=...` 搜索结果页链路。
- 顶部搜索框回显当前关键词，商品列表按关键词过滤。
- 商品名称命中片段标红，无结果时使用统一 `BaseEmpty` / NutUI Empty 空态。

### v0.3-interaction-ready

- 筛选从占位提示改为本地筛选状态。
- 加购写入本地购物车 service，功能 icon 尺寸统一收回到 16。

### v0.2

- 按列表截图补齐搜索头、商品列表和底部金额栏。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
