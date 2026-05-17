# UI 组件契约

本文件维护设计模块到当前 Taro 小程序代码组件的映射。新增页面优先复用这些基础件，不另造平行体系。

NutUI 组件补位与封装顺序，统一参见 `docs/codex/nutui-component-registry.md`。

## 页面结构

- 页面容器：`PageShell`
- 固定 header/footer 与滚动区：`PageLayout`
- 自定义顶部导航：`PageNavbar`
- `PageNavbar` 默认左侧 icon 使用 NutUI `ArrowLeft`，标题水平居中，主包 tab 页仍只展示标题。
- 页面内底部导航：`AppTabBar`
- 页面运行时：`usePageRuntime` + `PageRuntimeHost`

## 状态与弹层

- 首屏 loading / 骨架：`src/core/components/loading`、`BaseSkeleton`
- 空状态：`BaseEmpty`
- 异常状态：`BaseException`、`StatusException`
- 登录弹窗：`LoginPopup`
- 通用弹层：`AppPopup`
- 日期弹层：`DateSelectionPopup`，底层使用 NutUI `Calendar`，支持单日和范围选择。
- 优惠券弹层：`CouponSelectionPopup`
- 页面级弹层挂载：页面使用弹层组件时放入 `PageShell` 直接子节点 `PageShare` / `PageRoot`，避免被 header/footer/tabbar 压住。
- 登录动作拦截：`AuthAction` 或 `usePageRuntime().ensureLogin`

## 交易通用组件

- 统一入口：`src/core/components/commerce`
- 商品卡片：`ProductCard`，用于商城列表、推荐、收藏、赠品、餐饮套餐和房型轻量卡片。
- 订单卡片：`OrderCard`，用于订单列表、售后关联订单、评价和物流入口。
- 优惠券卡片：`CouponCard`，用于会员优惠券、商品/门票优惠券弹层。
- 地址卡片：`AddressCard`，用于确认订单、地址管理和地址选择。
- 固定提交栏：`FixedSubmitBar`，用于确认订单、预定页、购物车和弹层底部提交。
- 数量选择：`QuantityStepper`，用于 SKU、购物车、门票/套餐数量选择。
- 筛选与状态 Tab：`FilterTabs`、`StatusListTabs`，用于商品列表、订单列表、售后列表和优惠券列表。
- SKU 弹层：`SkuPopup`，基于 `AppPopup`，用于商品、餐饮套餐和可规格化商品。
- 日期选择：`DateRangePanel`，用于门票日期、酒店入住日期和可滑动日期选择。
- 商用级日期选择：`DateSelectionPopup`，用于需要弹层日历的交易页面；门票单日、酒店范围，优先保留 NutUI 原生弹层和样式。
- 这些组件只承接通用 UI 结构和轻交互，具体下单、接口提交、业务状态仍放在页面和 service。

## 首页规范组件

- 固定顶部搜索栏：左侧双功能按钮 + 中间搜索输入区 + 右侧微信胶囊预留，作为 `固定导航` 独立层处理。
- 会员信息卡：白底大卡 + 等级 badge + 数据 chip + `4 x 2` 快捷入口，保持首屏服务聚合能力。
- 模块标题：左侧品牌点标 + 标题 + 右侧 `查看全部`，用于榜单、推荐、分类等运营区块。
- 内容卡片：统一白底、轻阴影、上图下文结构；真实图片在设计阶段一律先用 `接口图占位`。
- 宫格分类：`3` 列圆角图卡 + 底部粉色标签，适合“吃住行游购娱商学情”类入口。
- 页面内 TabBar：沿用 `AppTabBar` 的页面内 fixed 底部结构，中间主入口可以保留更强视觉按钮。

## 设计稿图层命名

Pencil / Figma 图层都要能让 Codex 读懂开发语义：

- `接口图占位`：图片由接口或 CDN 返回，代码只实现容器和占位。
- `代码渲染`：文本、按钮、标签、卡片、列表等由小程序代码渲染。
- `固定导航`：navbar、tabbar、吸顶区或安全区相关元素。
- `状态组件`：loading、empty、error、未登录、降级态。
- 当页面登记的 `currentTool` 改变时，图层命名规则不变，开发语义仍要保持可读。

## 页面组件拆分建议

- 主包 tab 页面仍放 `src/pages`。
- 业务重页面默认放对应 `src/pkg-*` 分包。
- 主包不得直接引用分包业务实现。
- 复杂页面可以先在页面内拆小组件，确认复用价值后再沉淀到 `src/core/components` 或分包组件。
