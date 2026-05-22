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
- 当前版本：v0.6-sku-engine
- 页面状态：interaction-ready
- 更新时间：2026-05-21
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
- 客服调用微信拨号；收藏先登录拦截并写入本地收藏列表；分享调用微信分享引导。
- 领券和参数点击弹微信 modal 展示规则或商品参数。
- SKU 支持多级规格联动：选择上级规格后，下级不可售组合置灰，价格、图片、赠品和配送规则跟随可售组合变化。
- SKU 联动由 `src/core/utils/sku.ts` 统一解析，支持多层级规格、不可售项禁用、上层变更时向下联动、库存数量上限和提交提示；低层级选择不得反向改动上方层级。
- 立即购买会先登录拦截，生成商城结算草稿 `draftId` 后进入 `order-checkout`。
- 购物车入口进入 `mall-cart`。
- 推荐商品进入对应商品详情。
- 商品详情内容使用接口富文本字段渲染，不再页面内硬写固定图文描述。
- 富文本内联样式按小程序 `rpx` 书写，避免微信端按浏览器 `px` 渲染后字号偏小。

## 交互矩阵

| 元素 | 处理结果 |
|---|---|
| 商品图 / 评价图 / 详情图 | 微信预览图片，空图提示暂无图片 |
| 收藏 | 登录后写入本地收藏列表并成功 toast |
| 分享 | 微信分享引导 |
| 优惠券 | 微信 modal 展示优惠规则 |
| 规格选择 | 打开 SKU 弹层 |
| 参数 | 微信 modal 展示商品参数 |
| 查看更多评论 | 进入评价列表 |
| 首页 / 客服 / 购物车 | 切回首页、拨号、进入购物车 |
| 加入购物车 | 登录后按当前可售 SKU 写入购物车 |
| 立即购买 | 登录后生成结算草稿并进入确认订单 |
| 多级规格 | 不存在或无库存组合置灰，切换规格后联动价格、图片和规格文案 |
| 上层规格 | 切换后仅重算下方层级，尽量保留仍可售的已选项 |

## 状态矩阵

| 状态 | 页面表现 |
|---|---|
| loading | `usePageRuntime` 初始化商品详情 |
| SKU 弹层打开 | 通过 `PageShare` 覆盖底部栏 |
| 图片为空 | 点击后走空图业务提示 |
| 加购成功 | 购物车可读取新增商品 |
| 规格不可售 | 禁止点击，提交时提示请选择可购买规格 |
| 当前上层下不可售的下层项 | 置灰禁点，不反向修改上层规格 |
| 数量超过库存 | 切换规格后自动压回当前 SKU 库存上限 |

## 微信开发工具验收清单

- 点击商品图、评价图、详情图：有图片时预览，无图片时提示暂无图片。
- 点击客服、分享、优惠券、参数：分别触发微信拨号、分享引导和 modal。
- 点击收藏后进入我的收藏，应能看到收藏商品。
- 加入购物车后进入购物车：应出现新增商品。
- 切换角色 / 尺寸 / 套装：不可售组合应置灰，价格和规格文案应同步变化。
- 点击当前上层下不可售的下层规格：应置灰不可点，不应反向改动上方层级。
- 点击立即购买：应进入确认订单，商品、规格、数量和配送规则来自当前 SKU。
- SKU 弹层应覆盖底部购买栏，不被 footer 压住。
- 商品详情富文本字号、行高和详情图宽度应符合 750px 小程序视觉，不应出现横向溢出。

## 实现映射

- `src/pkg-mall/pages/product-detail/index.tsx`：页面主体。
- `src/pkg-mall/pages/product-detail/index.scss`：页面样式。
- `src/pkg-mall/pages/product-detail/index.config.ts`：页面配置。
- `src/pkg-mall/services/product-detail.ts`：页面 service。
- `src/core/utils/sku.ts`：通用 SKU 选择引擎，后续真实接口只通过 service/adapter 归一字段。

## 变更记录

### v0.6-sku-engine

- 抽出通用 SKU 选择引擎，商品详情页不再散写规格联动算法。
- SKU 弹层补已选规格、库存、滚动区域、数量库存上限和禁用提交视觉。
- SKU 交互改为严格层级联动：上层切换可影响下方，低层级不可反向改上方；未选中规格视觉统一，不再使用红色边框表达冲突态。

### v0.5-mall-commercial-flow

- 当前选中 SKU 的价格同步展示到主价格区域。
- 商品详情富文本模拟数据改用小程序 `rpx` 内联样式，详情图片修正横向溢出风险。
- 评论数量从页面硬编码改为 service 字段，后续接接口只替换字段映射。

### v0.4-commercial-flow

- SKU 从静态平铺改为多级可售组合联动，支持库存置灰、价格/图片/赠品/配送规则跟随选中组合。
- 立即购买改为创建商城结算草稿并携带 `draftId` 进入确认订单。
- 商品详情区改为渲染接口富文本字段。

### v0.3-interaction-ready

- 商品详情补齐图片预览、微信客服、分享、收藏、优惠券、参数、SKU 层级和购物车闭环。
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
