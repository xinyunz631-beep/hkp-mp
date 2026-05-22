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
- 当前版本：v0.5-default-first-category
- 页面状态：interaction-ready
- 更新时间：2026-05-21
- 实现文件：
  - src/pkg-mall/pages/category/index.tsx
  - src/pkg-mall/pages/category/index.scss
  - src/pkg-mall/pages/category/index.config.ts
  - src/pkg-mall/services/category.ts

## 设计意图

商城分类页改为常规商城/点单式双栏结构：左侧分类独立滚动，右侧连续渲染所有分类商品分区，滚动右侧时联动左侧高亮，并支持快捷加购。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：`PageShell scrollView={false}`，页面内部左右两个 `ScrollView` 分别承接分类导航和连续商品分区列表。
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
- 页面首次进入默认定位到第 0 个分类，左侧高亮与右侧第一个商品分区保持一致。
- 点击左侧分类滚动到右侧对应商品分区。
- 滚动右侧商品列表时，根据当前分区联动左侧分类高亮。
- 点击右侧商品卡进入 `mall-product-detail`。
- 点击右侧加购按钮复用商城 SKU 快捷加购规则：无货 toast，单一可售规格直接加车，多规格当前页弹 `SkuPopup`。
- 底部购物车和我的订单走登录拦截后进入对应页面。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 顶部返回 | 返回上一页，无上一页回首页 |
| 顶部搜索 | 进入商品搜索页 |
| 左侧分类 | 滚动到右侧对应商品分区 |
| 右侧滚动 | 进入下一分区时联动左侧高亮 |
| 右侧商品卡 | 进入商品详情 |
| 右侧加购按钮 | 单规格直加购物车，多规格当前页弹 SKU |
| 底部购物车 / 我的订单 | 登录后进入购物车或订单中心 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化分类数据 |
| 首次进入 | 默认高亮第 0 个分类，右侧停留在第一个商品分区 |
| 分类切换 | 左侧高亮更新，右侧滚动到对应分区 |
| 右侧连续滚动 | 分区自然衔接，左侧分类跟随当前分区变化 |
| 单规格加购 | 不弹 SKU，直接加入购物车并提示成功 |
| 多规格加购 | 当前页 `PageShare` 弹出 `SkuPopup` |
| 未登录加购 | 先触发登录拦截，登录后继续加购 |

## 微信开发工具验收清单

- 页面主体不应出现 layout 外层整页滚动，左侧分类和右侧商品列表应各自滚动。
- 首次进入时左侧应高亮第 0 个分类，右侧也应从第一个商品分区开始。
- 点击左侧分类后，右侧应滚动到对应分区；手动滚动右侧进入下一分区时，左侧高亮应跟随变化。
- 点击商品卡应进入商品详情；点击商品加购不应直接进详情。
- 单规格商品应直接加车；多规格商品应在当前分类页弹出 SKU。

## 实现映射

- `src/pkg-mall/pages/category/index.tsx`：页面主体。
- `src/pkg-mall/pages/category/index.scss`：页面样式。
- `src/pkg-mall/pages/category/index.config.ts`：页面配置。
- `src/pkg-mall/services/category.ts`：页面 service。

## 变更记录

### v0.5-default-first-category

- 分类页默认高亮从接口 mock 的第二项收回到第 0 个分类，避免首次进入左右分区错位。

### v0.4-two-column-sku

- 分类页关闭 `PageShell` 外层主滚动，改为左右两个内部 `ScrollView`。
- 右侧内容改为连续分类商品分区，右侧滚动联动左侧高亮；商品卡进入详情，加购按钮复用商城 SKU 快捷加购判断。

### v0.2

- 按分类首页截图补齐类目、Banner、快捷入口和底部导航。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
