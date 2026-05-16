# 商城分类页面设计说明

## 基本信息

- 页面：商城分类
- 路由：src/pkg-mall/pages/category
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：mall-category
- 设计稿名称：商城分类 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：mall-category
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-mall/pages/category/index.tsx
  - src/pkg-mall/pages/category/index.scss
  - src/pkg-mall/pages/category/index.config.ts
  - src/pkg-mall/services/category.ts

## 设计意图

商城分类首页首版按截图实现左侧类目、推荐 Banner、快捷入口和底部商城导航。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：左侧类目导航、推荐 Banner、快捷入口卡片。
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
| 页面数据 | `fetchCategoryData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 顶部搜索框进入 `mall-search`。
- 数码家居类目进入 `mall-category-list`。
- 快捷入口进入 `mall-products`、`mall-recommend` 等商城页面。

## 实现映射

- `src/pkg-mall/pages/category/index.tsx`：页面主体。
- `src/pkg-mall/pages/category/index.scss`：页面样式。
- `src/pkg-mall/pages/category/index.config.ts`：页面配置。
- `src/pkg-mall/services/category.ts`：页面 service。

## 变更记录

### v0.2

- 按分类首页截图补齐类目、Banner、快捷入口和底部导航。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
