# 推荐商品页面设计说明

## 基本信息

- 页面：推荐商品
- 路由：src/pkg-mall/pages/recommend
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：mall-recommend
- 设计稿名称：推荐商品 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：mall-recommend
- 当前版本：v0.2
- 页面状态：implemented
- 更新时间：2026-05-16
- 实现文件：
  - src/pkg-mall/pages/recommend/index.tsx
  - src/pkg-mall/pages/recommend/index.scss
  - src/pkg-mall/pages/recommend/index.config.ts
  - src/pkg-mall/services/recommend.ts

## 设计意图

热销推荐页首版按截图实现搜索条、筛选条和双列推荐商品宫格。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 固定顶部：搜索条、列表切换按钮和筛选条。
- 内容区域：双列推荐商品卡片。

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
| 页面数据 | `fetchRecommendData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 搜索条进入 `mall-search`。
- 列表按钮进入 `mall-products`。
- 商品卡进入 `mall-product-detail`。
- 综合 / 销量 / 价格切换当前排序。

## 实现映射

- `src/pkg-mall/pages/recommend/index.tsx`：页面主体。
- `src/pkg-mall/pages/recommend/index.scss`：页面样式。
- `src/pkg-mall/pages/recommend/index.config.ts`：页面配置。
- `src/pkg-mall/services/recommend.ts`：页面 service。

## 变更记录

### v0.2

- 按推荐商品截图补齐搜索条、筛选条和双列商品宫格。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
