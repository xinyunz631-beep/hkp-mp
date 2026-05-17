# 商品详情页面设计说明

## 基本信息

- 页面：商品详情
- 路由：src/pkg-mall/pages/product-detail
- 当前设计工具（以 `page-registry.currentTool` 为准）：pencil
- 设计文件：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- 设计节点：mall-product-detail
- 设计稿名称：商品详情 750px 开发稿
- Figma fileKey：-
- Figma nodeId：-
- Pencil file：/Users/kite/Desktop/vibe-coding/codex/pencil/HKP.pen
- Pencil nodeId：mall-product-detail
- 当前版本：v0.3-interaction-ready
- 页面状态：interaction-ready
- 更新时间：2026-05-18
- 实现文件：
  - src/pkg-mall/pages/product-detail/index.tsx
  - src/pkg-mall/pages/product-detail/index.scss
  - src/pkg-mall/pages/product-detail/index.config.ts
  - src/pkg-mall/services/product-detail.ts

## 设计意图

商品详情首版按截图实现轮播图、价格信息、优惠券、规格选择、评论、推荐和购买底栏。

## 页面结构

- 页面根容器：`_pg`
- 页面容器：`PageShell`
- 页面运行时：`usePageRuntime`
- 页面状态订阅：`observer`
- 内容区域：商品图集、价格标题、优惠券、规格参数、评论、推荐、详情图文。
- 固定底部：首页/客服/购物车快捷入口与加入购物车、立即购买按钮。

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
| 页面数据 | `fetchProductDetailData()` | service 内归一和兜底 | 按业务决定 |

## 交互与跳转

- 加入购物车、立即购买统一通过 `SkuPopup` 选择规格和数量。
- SKU 弹层挂在 `PageShare`，层级高于底部购买栏。
- 商品图、评价图、详情图点击走微信图片预览；空图时给出业务反馈。
- 客服调用微信拨号；收藏给成功反馈；分享调用微信分享引导。
- 领券和参数点击弹微信 modal 展示规则或商品参数。
- 立即购买跳转 `order-checkout` 骨架页。
- 购物车入口进入 `mall-cart`。
- 推荐商品进入对应商品详情。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 商品图 / 评价图 / 详情图 | 微信预览图片，空图提示暂无图片 |
| 收藏 | 成功 toast |
| 分享 | 微信分享引导 |
| 优惠券 | 微信 modal 展示优惠规则 |
| 规格选择 | 打开 SKU 弹层 |
| 参数 | 微信 modal 展示商品参数 |
| 查看更多评论 | 进入评价列表 |
| 首页 / 客服 / 购物车 | 切回首页、拨号、进入购物车 |
| 加入购物车 | 选择 SKU 后写入本地购物车 |
| 立即购买 | 选择 SKU 后进入确认订单 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化商品详情 |
| SKU 弹层打开 | 通过 `PageShare` 覆盖底部栏 |
| 图片为空 | 点击后走空图业务提示 |
| 加购成功 | 本地购物车可读取新增商品 |

## 微信开发工具验收清单

- 点击商品图、评价图、详情图：有图片时预览，无图片时提示暂无图片。
- 点击客服、分享、优惠券、参数：分别触发微信拨号、分享引导和 modal。
- 加入购物车后进入购物车：应出现本地加入商品。
- SKU 弹层应覆盖底部购买栏，不被 footer 压住。

## 实现映射

- `src/pkg-mall/pages/product-detail/index.tsx`：页面主体。
- `src/pkg-mall/pages/product-detail/index.scss`：页面样式。
- `src/pkg-mall/pages/product-detail/index.config.ts`：页面配置。
- `src/pkg-mall/services/product-detail.ts`：页面 service。

## 变更记录

### v0.3-interaction-ready

- 商品详情补齐图片预览、微信客服、分享、收藏、优惠券、参数、SKU 层级和本地购物车闭环。
- `SkuPopup` 迁入 `PageShare`，功能 icon 尺寸统一收回到 16。

### v0.2

- 按详情长页截图补齐图集、优惠、评论和购买底栏。

### v0.1

- 初始化页面基础实现。

## 验证记录

- `2026-05-16`：`yarn typecheck`
- `2026-05-16`：`yarn check:page-convention`
- `2026-05-16`：`yarn check:package-boundary`
- `2026-05-16`：`yarn check:ui-contract`
