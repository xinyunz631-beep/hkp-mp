# 分类商品页面设计说明

## 基本信息

- 页面：分类商品
- 路由：src/pkg-mall/pages/category-list
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：mall-category-list
- 设计稿名称：分类商品 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：mall-category-list
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-mall/pages/category-list/index.tsx
  - src/pkg-mall/pages/category-list/index.scss
  - src/pkg-mall/pages/category-list/index.config.ts
  - src/pkg-mall/services/category-list.ts

## 设计意图

分类商品页首版按截图实现左侧类目、右侧品牌区和查看更多入口。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：左侧类目、右侧标题栏与品牌宫格。
- 固定底部：商城首页 / 购物车 / 我的订单。

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
| 页面数据 | `fetchCategoryListData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 顶部搜索框进入 `mall-search`。
- 品牌卡片和查看更多进入 `mall-products`。
- 左侧类目支持切换选中状态。

## 实现映射

- `src/pkg-mall/pages/category-list/index.tsx`：页面主体。
- `src/pkg-mall/pages/category-list/index.scss`：页面样式。
- `src/pkg-mall/pages/category-list/index.config.ts`：页面配置。
- `src/pkg-mall/services/category-list.ts`：页面 service。

## 变更记录

### v0.2

- 按分类商品截图补齐类目、品牌区和查看更多入口。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
