# 小程序页面与分包 Review 矩阵

## 统计

- 注册页面总数：60
- 主包页面：3
- 分包页面：57
- 分包数量：6，分别为 `mall`、`member`、`hotel`、`ticket`、`dining`、`order`
- Review 类型：静态代码 Review，不代表微信开发工具或真机交互验收通过。

## 结果等级

- 通过：静态代码未发现明显 mock、占位或高风险交互问题。
- 关注：页面可运行方向正确，但存在登录、路由、字段兜底、后台直达或体验一致性风险。
- 占位：页面注册存在，但实际只展示准备中或空态。
- 候选下线：页面或服务疑似仅为历史兼容，删除前需要确认运营配置、扫码、广告和外部直达。

## 主包页面

| 页面 | 结果 | 主要发现 | 建议 |
| --- | --- | --- | --- |
| `pages/home/index` | 关注 | 首页主链路基本收口，广告、会员、商城和票务入口集中；扫码命中 `/pkg-*` 时直接 `Taro.navigateTo()`，绕过统一登录守卫和路由白名单 | 扫码直达也走 `navigateToMiniRoute()` 或新增扫码路由解析白名单 |
| `pages/park/index` | 关注 | 乐园 tab 是轻量入口页；餐饮入口会跳到仍为准备中的餐饮分包；内部使用直接 `Taro.navigateTo()` | 改为 `navigateToMiniRoute()`，并对餐饮业务加运营开关或下线入口 |
| `pages/member/index` | 关注 | 主包会员 tab 承接会员摘要与入口；会员数据来自真实状态，但分包会员首页仍有默认等级和昵称兜底风险 | 缺关键会员字段时显示待同步态，不用默认等级伪装真实资料 |

## 商城分包 `pkg-mall`

| 页面 | 结果 | 主要发现 | 建议 |
| --- | --- | --- | --- |
| `pkg-mall/pages/index/index` | 通过 | 商城首页读取真实服务，购物车与商品入口已集中；未发现运行态 mock 数据源 | 保持推荐位、分类、商品详情跳转均走真实接口和真实空态 |
| `pkg-mall/pages/category/index` | 通过 | 新分类页承接分类商品浏览，旧“全部商品”伪入口已按历史状态清理 | 保持分类标题、图片、筛选条件只消费后端真实字段 |
| `pkg-mall/pages/category-list/index` | 候选下线 | 页面只做旧路由兼容，进入后 `redirectTo` 新分类页 | 确认无广告、二维码、旧版本外链直达后，可下线该注册页和对应 service |
| `pkg-mall/pages/search/index` | 通过 | 搜索页为公开页，内部跳商品列表和详情；未发现 mock 数据源 | 后续建议所有商品跳转统一走封装，便于审计 |
| `pkg-mall/pages/products/index` | 通过 | 商品列表读取真实分页和真实筛选；页面存在直接 `Taro.navigateTo()` 到商品详情，目标为公开页 | 可低优先级统一导航封装 |
| `pkg-mall/pages/recommend/index` | 关注 | 路由常量内部引用较弱，可能依赖后台推荐位或广告配置直达 | 不建议直接删除；先核查后台运营配置和广告 linkTarget |
| `pkg-mall/pages/product-detail/index` | 通过 | 商品详情、收藏、购物车、下单链路方向正确；跳订单确认走统一登录策略 | 继续保持缺配送、缺 SKU、缺评价时进入真实空态或阻断态 |
| `pkg-mall/pages/cart/index` | 通过 | 购物车是登录态页面，结算进入订单确认；service 有历史标签清洗，不是 mock 数据源 | 保持购物车标签清洗，但建议补数据源治理说明 |
| `pkg-mall/pages/favorites/index` | 通过 | 收藏页读取真实收藏接口；删除动作走真实接口 | 无明显问题 |
| `pkg-mall/pages/gift-select/index` | 通过 | 赠品选择页是登录态能力，数据来自真实赠品规则链路 | 后续联调需关注赠品规则为空和冲突状态 |

## 会员分包 `pkg-member`

| 页面 | 结果 | 主要发现 | 建议 |
| --- | --- | --- | --- |
| `pkg-member/pages/index/index` | 关注 | 会员首页读真实 CRM，但缺字段时会出现“乐园会员”“会员”“levelNo=1”等默认展示 | 关键会员资料缺失时显示中性待同步态 |
| `pkg-member/pages/member-code/index` | 通过 | 会员码为登录态页面，读真实会员码服务 | 需真机确认二维码刷新、失效和截屏风险 |
| `pkg-member/pages/cards/index` | 通过 | 年卡列表读真实服务 | 无明显问题 |
| `pkg-member/pages/card-detail/index` | 通过 | 年卡详情使用富文本组件和订单详情跳转 | 保持富文本原样渲染，不在前端拼装正文 |
| `pkg-member/pages/profile/index` | 通过 | 资料页、头像上传、地址和老会员入口按真实链路设计 | 写操作需继续保持登录态和签名 |
| `pkg-member/pages/legacy-bind/index` | 通过 | 老会员绑定为登录态能力 | 后续需真实样本验收错误码和重复绑定提示 |
| `pkg-member/pages/coupons/index` | 通过 | 我的券读取真实券资产 | 需后端提供足够券样本覆盖状态 |
| `pkg-member/pages/coupon-detail/index` | 通过 | 券详情和订单/售后跳转方向正确 | 保持券号为真实事实源 |
| `pkg-member/pages/coupon-center/index` | 通过 | 领券中心和 K 币兑换入口读真实券包和 P1 配置 | 无明显问题 |
| `pkg-member/pages/member-growth/index` | 通过 | 会员成长页读真实权益 | 后续需确认缺权益配置时的空态 |
| `pkg-member/pages/member-growth-detail/index` | 通过 | 成长详情页读真实详情 | 无明显问题 |
| `pkg-member/pages/exchange/index` | 通过 | K 币兑换列表读真实 EXCHANGE 域商品 | 无明显问题 |
| `pkg-member/pages/exchange-detail/index` | 关注 | 爱心状态由 service 固定 `liked: false`，页面只本地切换颜色，无真实持久化 | 没有真实收藏能力时隐藏爱心；保留则接后端收藏接口 |
| `pkg-member/pages/share-rule/index` | 占位 | 页面只展示“分享规则准备中” | 无业务入口时可下线注册或保留内部白名单 |
| `pkg-member/pages/share/index` | 占位 | 页面只展示“分享收益准备中” | 同上 |
| `pkg-member/pages/share-income/index` | 占位 | 页面只展示“收益明细准备中” | 同上 |
| `pkg-member/pages/share-invite/index` | 占位 | 页面只展示“邀请明细准备中” | 同上 |
| `pkg-member/pages/withdraw-records/index` | 占位 | 页面只展示“提现记录准备中” | 同上 |
| `pkg-member/pages/withdraw/index` | 占位 | 页面只展示“提现服务准备中” | 同上 |

## 酒店分包 `pkg-hotel`

| 页面 | 结果 | 主要发现 | 建议 |
| --- | --- | --- | --- |
| `pkg-hotel/pages/index/index` | 通过 | 酒店首页读取真实酒店列表和入住参数；无运行态 mock | 继续保持缺入住参数时阻断，不回退假日期 |
| `pkg-hotel/pages/room-detail/index` | 通过 | 房型详情创建草稿后进入酒店确认单，确认单为可选登录策略 | 无明显问题 |
| `pkg-hotel/pages/checkout/index` | 关注 | 确认单登录策略与导航可选登录一致；但图片适配层允许 `allowMockImage` | 收敛图片白名单，确保旧占位图不进入订单链路 |

## 票务分包 `pkg-ticket`

| 页面 | 结果 | 主要发现 | 建议 |
| --- | --- | --- | --- |
| `pkg-ticket/pages/index/index` | 通过 | 票务首页为公开入口，跳票种和导览 | 直接 `Taro.navigateTo()` 目标为公开页，低优先级统一封装 |
| `pkg-ticket/pages/ticket-booking/index` | 关注 | 票务预订读真实票种、日历、报价；部分图片允许 `allowMockImage` | 收敛图片白名单；继续保证空票种走空态 |
| `pkg-ticket/pages/park-detail/index` | 通过 | 园区详情读真实资源，富文本组件承接正文 | 保持富文本原样渲染 |
| `pkg-ticket/pages/park-guide/index` | 通过 | 园区导览静态业务说明性质较强 | 若后续后台可配置，应迁入 CMS |
| `pkg-ticket/pages/checkout/index` | 关注 | 页面强制 `loginRequired: true`，但导航层把 `ticketCheckout` 配成可选登录；实名联系人可能由昵称或“微信用户”兜底 | 登录策略必须统一；实名姓名必须由用户显式填写 |
| `pkg-ticket/pages/schedule/index` | 通过 | 开园时间和活动说明页 | 无明显问题 |
| `pkg-ticket/pages/park-list/index` | 通过 | 从首页资源位直查热玩列表，不回退本地静态数据 | 无明显问题 |
| `pkg-ticket/pages/activity-list/index` | 通过 | 从首页资源位直查活动列表，不回退本地静态数据 | 无明显问题 |
| `pkg-ticket/pages/activity-detail/index` | 通过 | 活动详情读真实详情并使用富文本 | 无明显问题 |

## 餐饮分包 `pkg-dining`

| 页面 | 结果 | 主要发现 | 建议 |
| --- | --- | --- | --- |
| `pkg-dining/pages/index/index` | 占位 | 页面只展示“餐饮服务准备中” | 当前商用包若不开放餐饮，建议下线入口和注册页 |
| `pkg-dining/pages/merchant-detail/index` | 占位 | 页面只展示“商家详情准备中” | 同上 |
| `pkg-dining/pages/checkout/index` | 占位 | 页面只展示“餐饮订单准备中” | 同上 |

## 订单分包 `pkg-order`

| 页面 | 结果 | 主要发现 | 建议 |
| --- | --- | --- | --- |
| `pkg-order/pages/index/index` | 通过 | 订单首页读取真实订单 BFF，登录态受保护 | 需真实样本覆盖三业态聚合 |
| `pkg-order/pages/detail/index` | 关注 | 订单详情读真实详情，支付继续入口走真实微信支付；未知 sceneType 会走默认兜底展示 | 对未知 sceneType 加监控或显式异常态，避免新增业态被低保真展示掩盖 |
| `pkg-order/pages/checkout/index` | 关注 | 商城确认单为可选登录，方向正确；但订单 service 直接引用商城 cart service | 分包边界需修复，交易后清理下沉到 core 协议 |
| `pkg-order/pages/address/index` | 通过 | 地址管理为登录态能力 | 需真实微信地址/位置权限验收 |
| `pkg-order/pages/address-edit/index` | 通过 | 地址编辑为登录态写操作 | 写操作继续保持签名和真实错误态 |
| `pkg-order/pages/cancel/index` | 通过 | 取消订单读真实取消数据和提交接口 | 后续需覆盖不可取消和重复取消样本 |
| `pkg-order/pages/aftersale-apply/index` | 通过 | 售后申请读真实售后 draft 和提交接口 | 需真实商城售后样本验收 |
| `pkg-order/pages/aftersale-type/index` | 通过 | 售后类型页读真实类型接口 | 无明显问题 |
| `pkg-order/pages/aftersale-list/index` | 通过 | 售后列表读真实记录 | 无明显问题 |
| `pkg-order/pages/aftersale-progress/index` | 通过 | 售后进度读真实进度 | 无明显问题 |
| `pkg-order/pages/logistics/index` | 通过 | 物流页不再本地确认收货，读真实物流上下文 | 需真实物流轨迹样本 |
| `pkg-order/pages/review-create/index` | 通过 | 评价创建读真实评价草稿，评分需用户显式选择 | 无明显问题 |
| `pkg-order/pages/review-list/index` | 通过 | 评价列表读真实评价分页 | 无明显问题 |

## 分包级结论

| 分包 | 结论 |
| --- | --- |
| 主包 | 入口轻量，符合主包规则；扫码和乐园入口需统一导航守卫 |
| 商城 | 真实接口化程度最高；旧兼容页和推荐页运营直达需确认 |
| 会员 | 核心会员、券、K 币基本闭环；分享/提现仍为占位，兑换详情爱心是伪状态 |
| 酒店 | 主链路方向正确；图片白名单需要治理 |
| 票务 | 交易真实链路方向正确；登录策略冲突和实名默认值是重点风险 |
| 餐饮 | 当前仍是占位分包，不应作为商用入口开放 |
| 订单 | 订单、售后、物流、评价方向正确；分包互引是架构硬风险 |
